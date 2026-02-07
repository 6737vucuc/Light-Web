'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Send, Image as ImageIcon, ArrowLeft, MoreVertical, Phone, Video, 
  Search, Smile, Paperclip, Mic, X, Check, CheckCheck, Trash2, 
  User as UserIcon, MessageCircle, Loader2, MessageSquare, Shield,
  Info, Camera, Lock, Settings, Bell, Archive, UserPlus, Ghost
} from 'lucide-react';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
import CallOverlay from './CallOverlay';
import { useToast } from '@/lib/contexts/ToastContext';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabase/client';

// PeerJS dynamic import
let Peer: any;
if (typeof window !== 'undefined') {
  import('peerjs').then(module => { Peer = module.default; });
}

interface SignalMessengerProps {
  currentUser: any;
  initialUserId?: number;
  fullPage?: boolean;
  onBack?: () => void;
}

export default function SignalMessenger({ currentUser, initialUserId, fullPage = false, onBack }: SignalMessengerProps) {
  const router = useRouter();
  const params = useParams();
  const locale = params?.locale as string || 'ar';
  const isRtl = locale === 'ar';
  const t = useTranslations('messages');
  const toast = useToast();

  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [otherUserOnline, setOtherUserOnline] = useState(false);
  const [otherUserLastSeen, setOtherUserLastSeen] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Call States
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'incoming' | 'connected' | 'ended'>('idle');
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');
  const [callOtherUser, setCallOtherUser] = useState({ name: '', avatar: '' as string | null });
  const [peerId, setPeerId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const peerRef = useRef<any>(null);
  const currentCallRef = useRef<any>(null);
  const channelRef = useRef<any>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  // Load Conversations
  const loadConversations = useCallback(async (targetUserId?: number) => {
    try {
      const res = await fetch('/api/direct-messages');
      if (res.ok) {
        const data = await res.json();
        const convs = data.conversations || [];
        setConversations(convs);

        if (targetUserId && !selectedConversation) {
          const existingConv = convs.find(c => c.other_user_id === targetUserId);
          if (existingConv) {
            setSelectedConversation(existingConv);
          } else {
            const userRes = await fetch(`/api/users/${targetUserId}`);
            if (userRes.ok) {
              const userData = await userRes.json();
              setSelectedConversation({
                other_user_id: targetUserId,
                name: userData.user.name,
                avatar: userData.user.avatar,
                is_online: false,
                last_message: null,
                last_message_time: null
              });
            }
          }
        }
        setIsLoading(false);
      }
    } catch (err) { console.error(err); }
  }, [selectedConversation]);

  useEffect(() => {
    if (!currentUser?.id) return;
    loadConversations(initialUserId);
  }, [currentUser?.id, initialUserId, loadConversations]);

  // Load Messages and Supabase Realtime
  useEffect(() => {
    if (!selectedConversation) return;

    const loadMessages = async () => {
      const res = await fetch(`/api/direct-messages/${selectedConversation.other_user_id}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        setOtherUserOnline(selectedConversation.is_online);
        setOtherUserLastSeen(selectedConversation.last_seen);
        scrollToBottom();
      }
    };
    loadMessages();

    const channel = supabase.channel(`user-${currentUser.id}`, { config: { broadcast: { self: true } } });
    channel
      .on('broadcast', { event: 'private-message' }, ({ payload }) => {
        const msg = payload.message;
        if (msg.sender_id === selectedConversation.other_user_id || msg.receiver_id === selectedConversation.other_user_id) {
          setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg]);
          scrollToBottom();
          loadConversations();
        }
        if (msg.receiver_id === currentUser.id) fetch(`/api/direct-messages/${selectedConversation.other_user_id}/read`, { method: 'POST' });
      })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.userId === selectedConversation.other_user_id) setOtherUserTyping(payload.isTyping);
      })
      .on('broadcast', { event: 'incoming-call' }, ({ payload }) => {
        if (payload.receiverId === currentUser.id) {
          setCallOtherUser({ name: payload.callerName, avatar: payload.callerAvatar });
          setCallStatus('incoming');
          setCallType(payload.callType || 'audio');
          (window as any).incomingPeerId = payload.callerPeerId;
          (window as any).incomingCallerId = payload.callerId;
        }
      })
      .on('broadcast', { event: 'call-accepted' }, ({ payload }) => { if (payload.receiverId === currentUser.id) setCallStatus('connected'); })
      .on('broadcast', { event: 'call-ended' }, ({ payload }) => { if (payload.receiverId === currentUser.id) handleEndCall(); })
      .subscribe();
    
    channelRef.current = channel;
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, [selectedConversation, currentUser.id, loadConversations]);

  // PeerJS Init
  useEffect(() => {
    if (typeof window === 'undefined' || !currentUser?.id) return;

    let peerInstance: any = null;
    let retryCount = 0;
    const maxRetries = 5;

    const initPeer = async () => {
      if (!Peer) { const module = await import('peerjs'); Peer = module.default; }
      if (peerRef.current && !peerRef.current.destroyed && !peerRef.current.disconnected) return;

      const peerIdToUse = `signal-user-${currentUser.id}${retryCount > 0 ? `-${Math.floor(Math.random()*1000)}` : ''}`;
      const peer = new Peer(peerIdToUse, {
        debug: 1,
        secure: true,
        config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }
      });

      peer.on('open', async (id: string) => { setPeerId(id); peerRef.current = peer; retryCount = 0; await supabase.from('users').update({ current_peer_id: id }).eq('id', currentUser.id); });
      peer.on('call', async (call: any) => { currentCallRef.current = call; if (localStreamRef.current) { call.answer(localStreamRef.current); setupCallEvents(call); } });
      peer.on('error', (err: any) => { if ((err.type === 'unavailable-id'||err.type==='network') && retryCount<maxRetries){ retryCount++; setTimeout(initPeer,2000); } });
      peerInstance = peer;
    };
    initPeer();
    return () => { if (currentUser?.id) supabase.from('users').update({ current_peer_id: null }).eq('id', currentUser.id); if (peerInstance) peerInstance.destroy(); };
  }, [currentUser?.id]);

  const scrollToBottom = () => { setTimeout(()=>{ messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); },100); };

  const handleTyping = (e: any) => {
    setNewMessage(e.target.value);
    if (!isTyping) { setIsTyping(true); channelRef.current?.send({ type: 'broadcast', event: 'typing', payload: { userId: currentUser.id, isTyping: true } }); }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => { setIsTyping(false); channelRef.current?.send({ type: 'broadcast', event: 'typing', payload: { userId: currentUser.id, isTyping: false } }); }, 2000);
  };

  const sendMessage = async (e?: any, mediaUrl?: string, mediaType?: string) => {
    if (e) e.preventDefault();
    if (!mediaUrl && (!newMessage.trim() || !selectedConversation || isSending)) return;
    setIsSending(true);
    const content = mediaUrl ? '' : newMessage.trim();
    if (!mediaUrl) setNewMessage('');

    try {
      const res = await fetch('/api/direct-messages', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ receiverId:selectedConversation.other_user_id, content, messageType:mediaType||'text', mediaUrl:mediaUrl||null }) });
      if (res.ok) { const data = await res.json(); setMessages(prev => [...prev, data.message]); scrollToBottom(); loadConversations(); }
    } catch { toast.error('Failed to send message'); } finally { setIsSending(false); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file || !selectedConversation) return;
    setIsUploading(true); const formData = new FormData(); formData.append('file', file);
    try { const res = await fetch('/api/upload',{ method:'POST', body:formData }); if(res.ok){ const data = await res.json(); const type = file.type.startsWith('image/')?'image':'video'; await sendMessage(null,data.url,type); toast.success('File sent successfully'); } else { const error = await res.json(); toast.error(error.error||'Upload failed'); } } catch { toast.error('Upload failed'); } finally { setIsUploading(false); if(fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const handleStartCall = async (type:'audio'|'video'='audio') => {
    if(!selectedConversation) return;
    setCallOtherUser({ name:selectedConversation.name, avatar:selectedConversation.avatar }); setCallStatus('calling'); setCallType(type);
    try{
      if(!Peer && typeof window!=='undefined'){ const module = await import('peerjs'); Peer = module.default; }
      if(!peerRef.current||peerRef.current.destroyed||!peerId){ toast.info('Connecting to secure call server...'); let waitCount=0; while((!peerRef.current||!peerId)&&waitCount<6){ await new Promise(r=>setTimeout(r,500)); waitCount++; } }
      if(!peerRef.current||!peerId){ toast.error('Connection not ready. Please refresh and try again.'); setCallStatus('idle'); return; }
      const stream = await navigator.mediaDevices.getUserMedia({ audio:true, video:type==='video' }); localStreamRef.current=stream;
      const { data:receiverData } = await supabase.from('users').select('current_peer_id').eq('id',selectedConversation.other_user_id).single();
      if(!receiverData?.current_peer_id) throw new Error('User is offline');
      await fetch('/api/calls/initiate',{ method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ receiverId:selectedConversation.other_user_id, callerPeerId:peerId, callerName:currentUser.name, callerAvatar:currentUser.avatar, callType:type }) });
      const call = peerRef.current.call(receiverData.current_peer_id,stream); currentCallRef.current=call; setupCallEvents(call);
    } catch(err:any){ toast.error(err.message||'Call failed'); handleEndCall(); }
  };

  const handleAcceptCall = async () => {
    const callerId = (window as any).incomingCallerId;
    try{
      const stream = await navigator.mediaDevices.getUserMedia({ audio:true, video:callType==='video' }); localStreamRef.current=stream;
      if(currentCallRef.current){ currentCallRef.current.answer(stream); setupCallEvents(currentCallRef.current); }
      await fetch('/api/calls/accept',{ method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ receiverId:callerId, receiverPeerId:peerId }) });
      setCallStatus('connected');
    } catch { toast.error('Could not connect'); handleEndCall(); }
  };

  const handleEndCall = useCallback(() => {
    if(currentCallRef.current) currentCallRef.current.close();
    if(localStreamRef.current){ localStreamRef.current.getTracks().forEach(t=>t.stop()); localStreamRef.current=null; }
    if(selectedConversation) fetch('/api/calls/end',{ method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ receiverId:selectedConversation.other_user_id }) }).catch(console.error);
    setCallStatus('idle'); currentCallRef.current=null;
  },[selectedConversation]);

  const setupCallEvents = (call:any) => {
    call.on('stream',(remoteStream:MediaStream)=>{ setTimeout(()=>{ if(callType==='video'){ const remoteVideo=document.getElementById('remoteVideo') as HTMLVideoElement; const localVideo=document.getElementById('localVideo') as HTMLVideoElement; if(remoteVideo){ remoteVideo.srcObject=remoteStream; remoteVideo.play().catch(console.error); } if(localVideo&&localStreamRef.current){ localVideo.srcObject=localStreamRef.current; localVideo.play().catch(console.error); } } else { if(!remoteAudioRef.current) remoteAudioRef.current=new Audio(); remoteAudioRef.current.srcObject=remoteStream; remoteAudioRef.current.play().catch(console.error); } },500); });
    call.on('close',()=>handleEndCall());
    call.on('error',()=>handleEndCall());
  };

  const getAvatarUrl = (avatar?:string|null)=>{ if(!avatar) return '/default-avatar.png'; if(avatar.startsWith('data:')||avatar.startsWith('http')) return avatar; return `https://neon-image-bucket.s3.us-east-1.amazonaws.com/${avatar}`; };
  const formatTime=(date:any)=>{ if(!date) return ''; const d=new Date(date); return d.toLocaleTimeString(locale==='ar'?'ar-SA':'en-US',{ hour:'numeric', minute:'2-digit', hour12:true }); };
  const filteredConversations = conversations.filter(c=>c.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="flex h-full bg-white overflow-hidden font-sans text-[#1b1b1b]">
      {/* Sidebar */}
      <div className="w-80 border-r border-gray-200 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          {fullPage && onBack && <ArrowLeft className="cursor-pointer" onClick={onBack} />}
          <h2 className="font-bold">{t('Chats')}</h2>
          <MoreVertical className="cursor-pointer" />
        </div>
        <div className="p-2">
          <input type="text" placeholder={t('Search')} value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} className="w-full px-3 py-2 border rounded" />
        </div>
        <div className="flex-1 overflow-y-auto">
          {isLoading ? <Loader2 className="m-auto animate-spin" /> :
            filteredConversations.map(conv => (
              <div key={conv.other_user_id} onClick={()=>setSelectedConversation(conv)} className={`flex items-center p-3 cursor-pointer ${selectedConversation?.other_user_id === conv.other_user_id ? 'bg-gray-100' : ''}`}>
                <Image src={getAvatarUrl(conv.avatar)} width={40} height={40} className="rounded-full" alt="avatar" />
                <div className="ml-3 flex-1 overflow-hidden">
                  <p className="font-semibold truncate">{conv.name}</p>
                  <p className="text-sm text-gray-500 truncate">{conv.last_message || 'Start a conversation'}</p>
                </div>
                {conv.unread_count>0 && <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px]">{conv.unread_count}</span>}
              </div>
            ))}
        </div>
      </div>
      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center">
                <Image src={getAvatarUrl(selectedConversation.avatar)} width={40} height={40} className="rounded-full" alt="avatar" />
                <div className="ml-3">
                  <p className="font-semibold">{selectedConversation.name}</p>
                  <p className="text-sm text-gray-500">{otherUserTyping ? t('Typing...') : otherUserOnline ? t('Online') : otherUserLastSeen ? t('Last seen at')+' '+formatTime(otherUserLastSeen) :
''