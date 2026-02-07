'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Image as ImageIcon, ArrowLeft, MoreVertical, Phone, Video, 
  Search, Smile, Paperclip, Mic, Loader2, Check, CheckCheck, MessageSquare, Shield, Lock, Camera, Ghost } from 'lucide-react';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
import CallOverlay from './CallOverlay';
import { useToast } from '@/lib/contexts/ToastContext';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabase/client';

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

  // Call states
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

  // -----------------------
  // Load Conversations
  // -----------------------
  const loadConversations = useCallback(async (targetUserId?: number) => {
    try {
      const res = await fetch('/api/direct-messages');
      if (res.ok) {
        const data = await res.json();
        const convs = data.conversations || [];
        setConversations(convs);

        if (targetUserId && !selectedConversation) {
          const existingConv = convs.find((c: any) => c.other_user_id === targetUserId);
          if (existingConv) setSelectedConversation(existingConv);
        }
        setIsLoading(false);
      }
    } catch (error) { console.error(error); }
  }, [selectedConversation]);

  useEffect(() => {
    if (!currentUser?.id) return;
    loadConversations(initialUserId);
  }, [currentUser?.id, initialUserId, loadConversations]);

  // -----------------------
  // Load Messages and Subscribe to Realtime
  // -----------------------
  useEffect(() => {
    if (!selectedConversation) return;

    const loadMessages = async () => {
      try {
        const res = await fetch(`/api/direct-messages/${selectedConversation.other_user_id}`);
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages || []);
          setOtherUserOnline(selectedConversation.is_online);
          setOtherUserLastSeen(selectedConversation.last_seen);
          scrollToBottom();
        }
      } catch (error) { console.error(error); }
    };

    loadMessages();

    const channel = supabase.channel(`user-${currentUser.id}`, { config: { broadcast: { self: true } } });
    channel
      .on('broadcast', { event: 'private-message' }, ({ payload }) => {
        const msg = payload.message;
        if (msg.sender_id === selectedConversation.other_user_id || msg.receiver_id === selectedConversation.other_user_id) {
          setMessages(prev => {
            if (prev.find(m => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          scrollToBottom();
        }
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
      .subscribe();

    channelRef.current = channel;
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, [selectedConversation, currentUser.id]);

  // -----------------------
  // PeerJS Initialization
  // -----------------------
  useEffect(() => {
    if (typeof window === 'undefined' || !currentUser?.id) return;
    let peerInstance: any = null;
    let retryCount = 0;

    const initPeer = async () => {
      if (!Peer) { try { const module = await import('peerjs'); Peer = module.default; } catch { return; } }
      if (peerRef.current && !peerRef.current.destroyed && !peerRef.current.disconnected) return;

      const peerIdToUse = `signal-user-${currentUser.id}${retryCount>0 ? `-${Math.floor(Math.random()*1000)}` : ''}`;
      const peer = new Peer(peerIdToUse, {
        debug: 1,
        secure: true,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' }
          ],
          iceCandidatePoolSize: 10
        }
      });

      peer.on('open', async (id: string) => { setPeerId(id); peerRef.current = peer; await supabase.from('users').update({ current_peer_id: id }).eq('id', currentUser.id); });
      peer.on('call', (call: any) => { currentCallRef.current = call; if(localStreamRef.current) { call.answer(localStreamRef.current); setupCallEvents(call); } });
      peer.on('error', (err:any) => { if((err.type==='unavailable-id'||err.type==='network') && retryCount<5){retryCount++; setTimeout(initPeer,2000);} });

      peerInstance = peer;
    };

    initPeer();
    return () => { if(peerInstance) peerInstance.destroy(); supabase.from('users').update({ current_peer_id:null }).eq('id',currentUser.id); };
  }, [currentUser?.id]);

  // -----------------------
  // Helper Functions
  // -----------------------
  const scrollToBottom = () => { setTimeout(()=>{ messagesEndRef.current?.scrollIntoView({behavior:'smooth'}); },100); };
  const getAvatarUrl = (avatar?: string | null) => (!avatar ? '/default-avatar.png' : (avatar.startsWith('http') ? avatar : `https://neon-image-bucket.s3.us-east-1.amazonaws.com/${avatar}`));
  const formatTime = (date: any) => { if(!date) return ''; const d = new Date(date); return d.toLocaleTimeString(locale==='ar'?'ar-SA':'en-US',{hour:'numeric',minute:'2-digit',hour12:true}); };

  // -----------------------
  // Typing
  // -----------------------
  const handleTyping = (e: any) => {
    setNewMessage(e.target.value);
    if (!isTyping) {
      setIsTyping(true);
      channelRef.current?.send({ type: 'broadcast', event: 'typing', payload: { userId: currentUser.id, isTyping: true } });
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      channelRef.current?.send({ type: 'broadcast', event: 'typing', payload: { userId: currentUser.id, isTyping: false } });
    }, 2000);
  };

  // -----------------------
  // Send Message / File Upload
  // -----------------------
  const sendMessage = async (e?:any, mediaUrl?:string, mediaType?:string)=>{
    if(e) e.preventDefault();
    if(!mediaUrl && (!newMessage.trim() || !selectedConversation || isSending)) return;
    setIsSending(true);
    const content = mediaUrl? '' : newMessage.trim();
    if(!mediaUrl) setNewMessage('');
    try{
      const res = await fetch('/api/direct-messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({receiverId:selectedConversation.other_user_id,content,messageType:mediaType||'text',mediaUrl:mediaUrl||null})});
      if(res.ok){const data=await res.json(); setMessages(prev=>[...prev,data.message]); scrollToBottom();}
    }catch(err){toast.error('Failed to send message');}
    finally{setIsSending(false);}
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if(!file || !selectedConversation) return;
    setIsUploading(true);
    const formData = new FormData(); formData.append('file',file);
    try{
      const res = await fetch('/api/upload',{method:'POST',body:formData});
      if(res.ok){ const data = await res.json(); const type=file.type.startsWith('image/')?'image':'video'; await sendMessage(null,data.url,type); toast.success('File sent'); }
      else { const err = await res.json(); toast.error(err.error||'Upload failed'); }
    }catch{toast.error('Upload failed');}
    finally{ setIsUploading(false); if(fileInputRef.current) fileInputRef.current.value=''; }
  };

  // -----------------------
  // Call Functions
  // -----------------------
  const handleStartCall = async (type:'audio'|'video'='audio') => {
    if(!selectedConversation) return;
    setCallOtherUser({name:selectedConversation.name,avatar:selectedConversation.avatar}); setCallStatus('calling'); setCallType(type);

    try{
      let waitCount=0;
      while((!peerRef.current||!peerId)&&waitCount<6){await new Promise(r=>setTimeout(r,500)); waitCount++;}
      if(!peerRef.current||!peerId){toast.error('Connection not ready'); setCallStatus('idle'); return;}

      const stream = await navigator.mediaDevices.getUserMedia({audio:true,video:type==='video'});
      localStreamRef.current=stream;
      const { data:receiverData }=await supabase.from('users').select('current_peer_id').eq('id',selectedConversation.other_user_id).single();
      if(!receiverData?.current_peer_id) throw new Error('User is offline');
      await fetch('/api/calls/initiate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({receiverId:selectedConversation.other_user_id,callerPeerId:peerId,callerName:currentUser.name,callerAvatar:currentUser.avatar,callType:type})});
      const call=peerRef.current.call(receiverData.current_peer_id,stream); currentCallRef.current=call; setupCallEvents(call);
    }catch(err:any){toast.error(err.message||'Call failed'); handleEndCall();}
  };

  const handleEndCall = useCallback(()=>{
    if(currentCallRef.current) currentCallRef.current.close();
    if(localStreamRef.current){localStreamRef.current.getTracks().forEach(t=>t.stop()); localStreamRef.current=null;}
    if(selectedConversation) fetch('/api/calls/end',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({receiverId:selectedConversation.other_user_id})}).catch(console.error);
    setCallStatus('idle'); currentCallRef.current=null;
  },[selectedConversation]);

  const setupCallEvents=(call:any)=>{
    call.on('stream',(remoteStream:MediaStream)=>{
      setTimeout(()=>{
        if(callType==='video'){
          const remoteVideo=document.getElementById('remoteVideo') as HTMLVideoElement;
          if(remoteVideo){remoteVideo.srcObject=remoteStream; remoteVideo.play().catch(console.error);}
        }else{
          if(!remoteAudioRef.current) remoteAudioRef.current=new Audio();
          remoteAudioRef.current.srcObject=remoteStream; remoteAudioRef.current.play().catch(console.error);
        }
      },500);
    });
    call.on('close',()=>handleEndCall());
    call.on('error',()=>handleEndCall());
  };

  // -----------------------
  // Render JSX
  // -----------------------
  const filteredConversations = conversations.filter(c=>c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  return (
    <div className="flex h-full bg-white overflow-hidden font-sans text-[#1b1b1b]">
      {/* Sidebar */}
      <div className={`w-full md:w-[350px] flex-shrink-0 border-r border-gray-100 flex flex-col ${selectedConversation && 'hidden md:flex'}`}>
        {/* Header */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg overflow-hidden">
              {currentUser.avatar ? <Image src={getAvatarUrl(currentUser.avatar)} alt={currentUser.name} width={40} height={40} className="object-cover" unoptimized /> : currentUser.name.charAt(0)}
            </div>
            <h1 className="text-xl font-bold tracking-tight">Signal</h1>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors"><Search size={20} /></button>
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors"><MoreVertical size={20} /></button>
          </div>
        </div>
        {/* Search */}
        <div className="px-4 mb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input type="text" placeholder="Search" className="w-full bg-gray-100 border-none rounded-full py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} />
          </div>
        </div>
        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? <div className="flex flex-col items-center justify-center h-40 gap-2"><Loader2 className="animate-spin text-blue-600" /><p className="text-xs text-gray-400">Loading chats...</p></div> :
          filteredConversations.length===0 ? <div className="p-8 text-center"><div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4"><MessageSquare className="text-gray-300" /></div><p className="text-sm text-gray-500 font-medium">No conversations yet</p></div> :
          filteredConversations.map(conv=>(
            <button key={conv.other_user_id} onClick={()=>setSelectedConversation(conv)} className={`w-full p-3 flex items-center gap-3 hover:bg-gray-50 transition-colors relative ${selectedConversation?.other_user_id===conv.other_user_id?'bg-blue-50/50':''}`}>
              <div className="relative flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden">
                  <Image src={getAvatarUrl(conv.avatar)} alt={conv.name} width={48} height={48} className="object-cover" unoptimized />
                </div>
                {conv.is_online && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex justify-between items-baseline">
                  <h3 className="font-bold text-[15px] truncate">{conv.name}</h3>
                  <span className="text-[11px] text-gray-400">{conv.last_message_time ? formatTime(conv.last_message_time) : ''}</span>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-500 truncate pr-4">{conv.last_message || 'Start a conversation'}</p>
                  {conv.unread_count>0 && <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px]">{conv.unread_count}</span>}
                </div>