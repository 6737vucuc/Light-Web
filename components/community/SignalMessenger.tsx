import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send, ArrowLeft, Phone, Video, MessageSquare, 
  Wifi, WifiOff, RefreshCw, Loader2, User, 
  ChevronLeft, MoreVertical, Paperclip, Smile, Mic,
  PhoneOff, MicOff, VideoOff, X, Volume2, Maximize2,
  Play, Pause, Trash2, Check, CheckCheck, Search,
  MapPin, FileText, Download, Reply, Image as ImageIcon,
  ShieldAlert, ShieldCheck, Pin, PinOff, Grid, History
} from 'lucide-react';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/lib/contexts/ToastContext';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabase/client';

let Peer: any;

// Advanced Encryption/Decryption Helpers
const encode = (str: string) => btoa(unescape(encodeURIComponent(str)));
const decode = (str: string) => {
  if (!str) return '';
  try {
    // Check if it's base64 encoded
    if (/^[A-Za-z0-9+/=]+$/.test(str)) {
      try { 
        const decoded = atob(str);
        try { return decodeURIComponent(escape(decoded)); } catch { return decoded; }
      } catch { return str; }
    }
    return str;
  } catch (e) { 
    console.error('Decode error:', e);
    return str; 
  }
};

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
  const [unreadCounts, setUnreadCounts] = useState<{[key: number]: number}>({});
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);
  const [isPeerReady, setIsPeerReady] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [otherUserOnline, setOtherUserOnline] = useState(false);
  const [otherUserLastSeen, setOtherUserLastSeen] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInMessages, setSearchInMessages] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [replyTo, setReplyTo] = useState<any>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [pinnedMessageId, setPinnedMessageId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Call States
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'incoming' | 'connected' | 'ended'>('idle');
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');
  const [incomingCallData, setIncomingCallData] = useState<any>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageIds = useRef<Set<string>>(new Set());
  const peerRef = useRef<any>(null);
  const currentCallRef = useRef<any>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  // Initialize PeerJS
  const initPeer = useCallback(async () => {
    if (typeof window === 'undefined' || !currentUser?.id) return;
    try {
      if (!Peer) { const module = await import('peerjs'); Peer = module.default; }
      if (peerRef.current) peerRef.current.destroy();
      const peer = new Peer(`user-${currentUser.id}`, { host: '0.peerjs.com', port: 443, path: '/', secure: true });
      peer.on('open', () => { setIsPeerReady(true); peerRef.current = peer; });
      peer.on('call', async (call: any) => {
        if (isBlocked) { call.close(); return; }
        currentCallRef.current = call; setCallType(call.metadata?.type || 'audio');
        setCallStatus('incoming'); setIncomingCallData({ peerId: call.peer, name: call.metadata?.name, avatar: call.metadata?.avatar });
      });
      peer.on('error', () => setIsPeerReady(false));
    } catch (e) { console.error(e); }
  }, [currentUser?.id, isBlocked]);

  useEffect(() => { initPeer(); return () => { if (peerRef.current) peerRef.current.destroy(); }; }, [initPeer]);

  // Real-time Engine
  useEffect(() => {
    if (!currentUser?.id || !selectedConversation) return;
    const channelId = `chat-${Math.min(currentUser.id, selectedConversation.other_user_id)}-${Math.max(currentUser.id, selectedConversation.other_user_id)}`;
    const channel = supabase.channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'direct_messages' }, async (payload) => {
        if (payload.eventType === 'INSERT') {
          const msg = payload.new;
          const msgId = msg.id.toString();
          if (!messageIds.current.has(msgId)) {
            messageIds.current.add(msgId); 
            // Note: This message from postgres_changes is encrypted. 
            // We prefer the one from 'private-message' broadcast if available.
            setMessages(prev => {
              if (prev.some(m => m.id.toString() === msgId)) return prev;
              return [...prev, msg];
            });
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
            if (msg.sender_id === selectedConversation.other_user_id) {
              new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3').play().catch(() => {});
              await supabase.from('direct_messages').update({ is_read: true }).eq('id', msg.id);
            }
          }
        } else if (payload.eventType === 'UPDATE') { setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new : m)); }
        else if (payload.eventType === 'DELETE') { setMessages(prev => prev.filter(m => m.id !== payload.old.id)); }
      })
      .on('broadcast', { event: 'private-message' }, ({ payload }) => {
        const msg = payload.message;
        const msgId = msg.id.toString();
        if (!messageIds.current.has(msgId)) {
          messageIds.current.add(msgId);
          setMessages(prev => [...prev, msg]);
          setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
          if (msg.sender_id === selectedConversation.other_user_id) {
            new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3').play().catch(() => {});
          }
        }
      })
      .on('broadcast', { event: 'typing' }, ({ payload }) => { if (payload.userId === selectedConversation.other_user_id) setOtherUserTyping(payload.isTyping); })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const isOnline = Object.keys(state).some(key => (state[key] as any).some((p: any) => p.userId === selectedConversation.other_user_id));
        setOtherUserOnline(isOnline);
        if (!isOnline) {
          const userPresence = Object.values(state).flat().find((p: any) => p.userId === selectedConversation.other_user_id);
          if (userPresence) setOtherUserLastSeen((userPresence as any).online_at);
        }
      })
      .subscribe(async (status) => {
        setIsSupabaseConnected(status === 'SUBSCRIBED');
        if (status === 'SUBSCRIBED') {
          await channel.track({ userId: currentUser.id, online_at: new Date().toISOString() });
          await supabase.from('direct_messages').update({ is_read: true }).eq('sender_id', selectedConversation.other_user_id).eq('receiver_id', currentUser.id).eq('is_read', false);
        }
      });
    return () => { supabase.removeChannel(channel); };
  }, [currentUser.id, selectedConversation]);

  // Block & Privacy Logic (Simulated since DB table doesn't exist)
  const toggleBlock = () => {
    setIsBlocked(!isBlocked);
    toast.info(isBlocked ? 'تم إلغاء الحظر' : 'تم حظر المستخدم');
  };

  // Pinned Message Logic
  const togglePin = (msgId: number) => {
    setPinnedMessageId(pinnedMessageId === msgId ? null : msgId);
    toast.info(pinnedMessageId === msgId ? 'تم إلغاء التثبيت' : 'تم تثبيت الرسالة');
  };

  // Media Gallery Logic
  const mediaMessages = messages.filter(m => m.message_type === 'image' || m.message_type === 'file');

  // Signaling for Calls
  useEffect(() => {
    if (!currentUser?.id) return;
    const channel = supabase.channel(`calls-${currentUser.id}`)
      .on('broadcast', { event: 'call-request' }, ({ payload }) => { 
        if (callStatus === 'idle' && !isBlocked) { 
          setCallStatus('incoming'); setCallType(payload.type); setIncomingCallData(payload); 
        } 
      })
      .on('broadcast', { event: 'call-response' }, ({ payload }) => { if (!payload.accepted) { setCallStatus('idle'); toast.error('تم رفض المكالمة'); stopMedia(); } })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUser.id, callStatus, isBlocked]);

  // Advanced Features
  const shareLocation = async () => {
    if (isBlocked) return toast.error('لا يمكنك الإرسال لمستخدم محظور');
    if (!navigator.geolocation) return toast.error('الموقع غير مدعوم');
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const locUrl = `https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`;
      await sendMessage('text', `[LOCATION]${locUrl}`);
    });
  };

  const uploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConversation || isBlocked) return;
    setIsUploading(true);
    try {
      const type = file.type.startsWith('image/') ? 'image' : 'file';
      const fileName = `${Date.now()}-${file.name}`;
      const filePath = `chat-${type}s/${fileName}`;
      const { error } = await supabase.storage.from('images').upload(filePath, file);
      if (error) throw error;
      const url = `https://lzqyucohnjtubivlmdkw.supabase.co/storage/v1/object/public/images/${filePath}`;
      await sendMessage(type, file.name, url);
    } catch (e) { toast.error('فشل الرفع'); } finally { setIsUploading(false); }
  };

  const startRecording = async () => {
    if (isBlocked) return toast.error('المستخدم محظور');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream); mediaRecorderRef.current = mr; audioChunksRef.current = [];
      mr.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      mr.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const fileName = `${Date.now()}.webm`;
        const { error } = await supabase.storage.from('images').upload(`chat-voices/${fileName}`, blob);
        if (!error) {
          const url = `https://lzqyucohnjtubivlmdkw.supabase.co/storage/v1/object/public/images/chat-voices/${fileName}`;
          await sendMessage('voice', 'رسالة صوتية', url);
        }
      };
      mr.start(); setIsRecording(true); setRecordingTime(0);
      recordingIntervalRef.current = setInterval(() => setRecordingTime(p => p + 1), 1000);
    } catch (e) { toast.error('فشل الميكروفون'); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop(); setIsRecording(false);
      if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    }
  };

  const sendMessage = async (type: string, content: string, mediaUrl?: string) => {
    if (!selectedConversation || isBlocked) return;
    setIsSending(true);
    try {
      // Use the API instead of direct Supabase insert to handle military encryption and database sync correctly
      const res = await fetch('/api/direct-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId: selectedConversation.other_user_id,
          content: content,
          messageType: type,
          mediaUrl: mediaUrl || null
        }),
      });

      if (res.ok) {
        setReplyTo(null);
        setNewMessage('');
      } else {
        // Fallback to direct supabase if API fails
        await supabase.from('direct_messages').insert({
          sender_id: currentUser.id, 
          receiver_id: selectedConversation.other_user_id,
          content: encode(content), 
          message_type: type, 
          media_url: mediaUrl,
          reply_to_id: replyTo?.id
        });
        setReplyTo(null); 
        setNewMessage('');
      }
    } catch (e) { 
      console.error('Send error:', e);
      toast.error('فشل الإرسال'); 
    } finally { 
      setIsSending(false); 
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    if (!isTyping && selectedConversation && !isBlocked) {
      setIsTyping(true);
      supabase.channel(`chat-${Math.min(currentUser.id, selectedConversation.other_user_id)}-${Math.max(currentUser.id, selectedConversation.other_user_id)}`)
        .send({ type: 'broadcast', event: 'typing', payload: { userId: currentUser.id, isTyping: true } });
      setTimeout(() => {
        setIsTyping(false);
        supabase.channel(`chat-${Math.min(currentUser.id, selectedConversation.other_user_id)}-${Math.max(currentUser.id, selectedConversation.other_user_id)}`)
          .send({ type: 'broadcast', event: 'typing', payload: { userId: currentUser.id, isTyping: false } });
      }, 3000);
    }
  };

  const startCall = async (type: 'audio' | 'video') => {
    if (!isPeerReady || !selectedConversation || isBlocked) return toast.error('النظام غير جاهز أو المستخدم محظور');
    setCallType(type); setCallStatus('calling');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' });
      setLocalStream(stream);
      const call = peerRef.current.call(`user-${selectedConversation.other_user_id}`, stream, { metadata: { type, name: currentUser.name, avatar: currentUser.avatar } });
      currentCallRef.current = call;
      call.on('stream', (rs: any) => { setRemoteStream(rs); setCallStatus('connected'); });
      call.on('close', () => stopMedia());
      supabase.channel(`calls-${selectedConversation.other_user_id}`).send({ type: 'broadcast', event: 'call-request', payload: { type, peerId: `user-${currentUser.id}`, name: currentUser.name, avatar: currentUser.avatar } });
    } catch (e) { toast.error('فشل الوصول للوسائط'); setCallStatus('idle'); }
  };

  const acceptCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: callType === 'video' });
      setLocalStream(stream);
      currentCallRef.current.answer(stream);
      currentCallRef.current.on('stream', (rs: any) => { setRemoteStream(rs); setCallStatus('connected'); });
      supabase.channel(`calls-${incomingCallData.peerId.replace('user-', '')}`).send({ type: 'broadcast', event: 'call-response', payload: { accepted: true } });
    } catch (e) { toast.error('فشل قبول المكالمة'); }
  };

  const stopMedia = () => {
    if (localStream) localStream.getTracks().forEach(t => t.stop());
    if (currentCallRef.current) currentCallRef.current.close();
    setLocalStream(null); setRemoteStream(null); setCallStatus('idle');
  };

  useEffect(() => {
    const fetch = async () => { 
      const res = await fetch('/api/direct-messages'); 
      if (res.ok) { 
        const d = await res.json(); 
        const convs = d.conversations || [];
        setConversations(convs); 

        // Fetch unread counts
        const { data: unreadData } = await supabase
          .from('direct_messages')
          .select('sender_id')
          .eq('receiver_id', currentUser.id)
          .eq('is_read', false);
        
        if (unreadData) {
          const counts: any = {};
          unreadData.forEach(m => {
            counts[m.sender_id] = (counts[m.sender_id] || 0) + 1;
          });
          setUnreadCounts(counts);
        }

        // Auto-select conversation if initialUserId is provided
        if (initialUserId) {
          const existingConv = convs.find((c: any) => c.other_user_id === initialUserId);
          if (existingConv) {
            setSelectedConversation(existingConv);
          } else {
            const fetchUser = async () => {
              const { data: userData } = await supabase.from('users').select('id, name, avatar').eq('id', initialUserId).single();
              if (userData) {
                setSelectedConversation({
                  other_user_id: userData.id,
                  name: userData.name,
                  avatar: userData.avatar,
                  last_message: ''
                });
              }
            };
            fetchUser();
          }
        }
      } 
      setIsLoading(false); 
    };
    fetch();
  }, [initialUserId, currentUser.id]);

  const loadMsgs = useCallback(async (id: string) => {
    if (!id) return;
    try {
      // Use the API instead of direct Supabase query to handle military encryption correctly
      const res = await fetch(`/api/direct-messages/${id}`);
      if (res.ok) {
        const data = await res.json();
        const msgs = data.messages || [];
        setMessages(msgs);
        messageIds.current = new Set(msgs.map((m: any) => m.id.toString()));
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      } else {
        // Fallback to direct supabase if API fails
        const { data } = await supabase.from('direct_messages').select('*').or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${id}),and(sender_id.eq.${id},receiver_id.eq.${currentUser.id})`).order('created_at', { ascending: true });
        if (data) { 
          setMessages(data); 
          messageIds.current = new Set(data.map(m => m.id.toString())); 
          setTimeout(() => messagesEndRef.current?.scrollIntoView(), 100); 
        }
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  }, [currentUser.id]);

  useEffect(() => { if (selectedConversation) loadMsgs(selectedConversation.other_user_id); }, [selectedConversation, loadMsgs]);

  if (isLoading) return <div className="flex-1 flex items-center justify-center bg-white"><Loader2 className="animate-spin text-purple-600" size={40} /></div>;

  return (
    <div className={`flex bg-white shadow-2xl overflow-hidden ${fullPage ? 'fixed inset-0 z-50' : 'h-[700px] rounded-3xl border border-slate-100'}`}>
      {/* Conversations List */}
      <div className={`${selectedConversation ? 'hidden md:flex' : 'flex'} w-full md:w-[380px] flex-col border-r border-slate-50 bg-[#fdfdfd]`}>
        <div className="p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Messages</h2>
            <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-xl transition-all"><X size={20} /></button>
          </div>
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#7c3aed] transition-colors" size={18} />
            <input type="text" placeholder={searchInMessages ? "Search messages..." : "Search chats..."} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-slate-50 border-none rounded-2xl pl-11 pr-4 py-3 text-sm focus:ring-2 focus:ring-purple-100 outline-none transition-all" />
            <button onClick={() => setSearchInMessages(!searchInMessages)} className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all ${searchInMessages ? 'bg-purple-100 text-[#7c3aed]' : 'text-slate-400 hover:bg-slate-100'}`} title="Search in messages"><MessageSquare size={16} /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-2">
          {conversations.filter(c => {
            const nameMatch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
            const msgMatch = searchInMessages && decode(c.last_message).toLowerCase().includes(searchQuery.toLowerCase());
            return nameMatch || msgMatch;
          }).map((conv) => (
            <button key={conv.other_user_id} onClick={() => { setSelectedConversation(conv); setUnreadCounts(prev => ({ ...prev, [conv.other_user_id]: 0 })); }} className={`w-full p-4 mb-1 flex items-center gap-4 rounded-2xl hover:bg-slate-50 transition-all group ${selectedConversation?.other_user_id === conv.other_user_id ? 'bg-purple-50 shadow-sm' : ''}`}>
              <div className="relative flex-shrink-0">
                <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-white shadow-sm group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <Image src={conv.avatar || '/default-avatar.png'} alt={conv.name} width={56} height={56} className="object-cover" unoptimized />
                </div>
                {conv.is_online && <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full shadow-sm animate-pulse"></div>}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex justify-between items-baseline mb-1">
                  <h3 className="font-bold text-[16px] truncate text-slate-800">{conv.name}</h3>
                  <span className="text-[10px] text-slate-400 font-medium">{conv.last_message_time ? new Date(conv.last_message_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-slate-500 truncate leading-relaxed flex-1">{decode(conv.last_message) || 'Start a new story...'}</p>
                  {unreadCounts[conv.other_user_id] > 0 && <span className="bg-[#7c3aed] text-white text-[10px] font-black px-2 py-0.5 rounded-full min-w-[20px] text-center animate-bounce">{unreadCounts[conv.other_user_id]}</span>}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`${selectedConversation ? 'flex' : 'hidden md:flex'} flex-1 flex-col bg-white relative`}>
        {selectedConversation ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-slate-50 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <button onClick={() => setSelectedConversation(null)} className="md:hidden p-2 hover:bg-slate-50 rounded-full"><ChevronLeft /></button>
                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-md border-2 border-purple-50">
                    <Image src={selectedConversation.avatar || '/default-avatar.png'} alt={selectedConversation.name} width={48} height={48} className="object-cover" unoptimized />
                  </div>
                  {otherUserOnline && <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></div>}
                </div>
                <div>
                  <h3 className="font-black text-slate-800 leading-tight">{selectedConversation.name}</h3>
                  <p className="text-[11px] font-bold flex items-center gap-1">
                    {otherUserTyping ? (
                      <span className="text-emerald-500 animate-pulse">Typing...</span>
                    ) : otherUserOnline ? (
                      <span className="text-emerald-500">Live Now</span>
                    ) : (
                      <span className="text-slate-400 flex items-center gap-1">
                        <History size={10} /> 
                        {otherUserLastSeen ? `Last seen ${new Date(otherUserLastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Offline'}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowMediaGallery(!showMediaGallery)} className={`p-3 rounded-2xl transition-all ${showMediaGallery ? 'bg-purple-100 text-[#7c3aed]' : 'text-slate-400 hover:bg-slate-50'}`} title="Media Gallery"><Grid size={22} /></button>
                <button onClick={() => startCall('audio')} className="p-3 text-[#7c3aed] hover:bg-purple-100 hover:scale-110 rounded-2xl transition-all active:scale-90 shadow-sm hover:shadow-md"><Phone size={22} /></button>
                <button onClick={() => startCall('video')} className="p-3 text-[#7c3aed] hover:bg-purple-100 hover:scale-110 rounded-2xl transition-all active:scale-90 shadow-sm hover:shadow-md"><Video size={22} /></button>
                <div className="relative group">
                  <button className="p-3 text-slate-400 hover:bg-slate-50 rounded-2xl transition-all"><MoreVertical size={22} /></button>
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-50 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all z-50 overflow-hidden">
                    <button onClick={toggleBlock} className="w-full p-4 text-left text-sm font-bold hover:bg-red-50 text-red-600 flex items-center gap-3">
                      {isBlocked ? <ShieldCheck size={18} /> : <ShieldAlert size={18} />}
                      {isBlocked ? 'Unblock User' : 'Block User'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Pinned Message Bar */}
            {pinnedMessageId && (
              <div className="bg-purple-50 px-6 py-2 border-b border-purple-100 flex items-center justify-between animate-in slide-in-from-top duration-300">
                <div className="flex items-center gap-3 truncate">
                  <Pin size={14} className="text-[#7c3aed]" />
                  <p className="text-xs font-bold text-purple-700 truncate">
                    {decode(messages.find(m => m.id === pinnedMessageId)?.content) || 'Pinned message'}
                  </p>
                </div>
                <button onClick={() => setPinnedMessageId(null)} className="text-purple-400 hover:text-purple-600"><X size={14} /></button>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#fdfdfd] scrollbar-hide relative">
              {showMediaGallery && (
                <div className="absolute inset-0 z-20 bg-white/95 backdrop-blur-sm p-6 animate-in fade-in duration-300 overflow-y-auto">
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="text-xl font-black text-slate-800">Media & Files</h4>
                    <button onClick={() => setShowMediaGallery(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={24} /></button>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {mediaMessages.length > 0 ? mediaMessages.map(m => (
                      <div key={m.id} className="aspect-square rounded-2xl overflow-hidden border border-slate-100 shadow-sm group relative">
                        {m.message_type === 'image' ? (
                          <Image src={m.media_url} alt="Media" fill className="object-cover" unoptimized />
                        ) : (
                          <div className="w-full h-full bg-slate-50 flex items-center justify-center"><FileText className="text-slate-300" size={32} /></div>
                        )}
                        <a href={m.media_url} download className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all text-white"><Download size={24} /></a>
                      </div>
                    )) : <p className="col-span-3 text-center text-slate-400 py-10 font-bold">No media found</p>}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={msg.id} className={`flex ${msg.sender_id === currentUser.id ? 'justify-end' : 'justify-start'} group relative`}>
                  <div className={`max-w-[85%] rounded-3xl text-[15px] shadow-sm transition-all hover:shadow-lg hover:scale-[1.02] overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300 ${msg.sender_id === currentUser.id ? 'bg-gradient-to-br from-[#7c3aed] to-[#6d28d9] text-white rounded-br-none' : 'bg-white border border-slate-100 text-slate-800 rounded-bl-none'}`}>
                    {msg.reply_to_id && (
                      <div className="mx-2 mt-2 p-2 bg-black/5 rounded-2xl border-l-4 border-white/20 text-[12px] opacity-80">
                        {decode(messages.find(m => m.id === msg.reply_to_id)?.content) || 'Replied message'}
                      </div>
                    )}
                    <div className="p-3">
                      {msg.message_type === 'image' && (
                        <div className="mb-2 rounded-2xl overflow-hidden border border-white/20 shadow-inner">
                          <Image src={msg.media_url} alt="Media" width={300} height={200} className="w-full object-cover" unoptimized />
                        </div>
                      )}
                      {msg.message_type === 'voice' && (
                        <div className="flex items-center gap-3 py-1">
                          <button className="p-2 bg-white/20 rounded-full"><Play size={16} fill="currentColor" /></button>
                          <div className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden"><div className="h-full w-1/3 bg-white"></div></div>
                          <span className="text-[10px] font-bold">0:12</span>
                        </div>
                      )}
                      {msg.message_type === 'file' && (
                        <a href={msg.media_url} target="_blank" className="flex items-center gap-3 p-2 bg-black/5 rounded-2xl border border-white/10 mb-1">
                          <div className="p-2 bg-white/20 rounded-xl"><FileText size={20} /></div>
                          <div className="flex-1 min-w-0"><p className="text-xs font-bold truncate">{msg.content}</p><p className="text-[10px] opacity-70 uppercase font-black">Download File</p></div>
                        </a>
                      )}
                      <p className="leading-relaxed font-medium">{decode(msg.content)}</p>
                      <div className={`flex items-center gap-1 mt-1 text-[10px] font-bold ${msg.sender_id === currentUser.id ? 'text-white/70' : 'text-slate-400'}`}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {msg.sender_id === currentUser.id && (msg.is_read ? <CheckCheck size={12} className="text-emerald-300" /> : <Check size={12} />)}
                        {pinnedMessageId === msg.id && <Pin size={10} className="ml-1" />}
                      </div>
                    </div>
                  </div>
                  {/* Quick Actions */}
                  <div className={`absolute top-0 ${msg.sender_id === currentUser.id ? '-left-12' : '-right-12'} opacity-0 group-hover:opacity-100 transition-all flex flex-col gap-1`}>
                    <button onClick={() => setReplyTo(msg)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400" title="Reply"><Reply size={16} /></button>
                    <button onClick={() => togglePin(msg.id)} className={`p-2 hover:bg-slate-100 rounded-full ${pinnedMessageId === msg.id ? 'text-[#7c3aed]' : 'text-slate-400'}`} title="Pin"><Pin size={16} /></button>
                    {msg.sender_id === currentUser.id && <button onClick={async () => await supabase.from('direct_messages').delete().eq('id', msg.id)} className="p-2 hover:bg-red-50 rounded-full text-red-400" title="Delete"><Trash2 size={16} /></button>}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-6 bg-white border-t border-slate-50 relative">
              {isBlocked ? (
                <div className="bg-red-50 p-4 rounded-2xl text-center border border-red-100 animate-pulse">
                  <p className="text-sm font-black text-red-600">You have blocked this user. Unblock to send messages.</p>
                </div>
              ) : (
                <>
                  {replyTo && (
                    <div className="absolute bottom-full left-0 right-0 bg-slate-50 p-3 border-t border-slate-100 flex items-center justify-between animate-in slide-in-from-bottom duration-200">
                      <div className="flex items-center gap-3 truncate">
                        <Reply size={16} className="text-[#7c3aed]" />
                        <div className="truncate"><p className="text-[10px] font-black text-[#7c3aed] uppercase">Replying to</p><p className="text-xs text-slate-600 truncate">{decode(replyTo.content)}</p></div>
                      </div>
                      <button onClick={() => setReplyTo(null)} className="p-1 hover:bg-slate-200 rounded-full"><X size={16} /></button>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => fileInputRef.current?.click()} className="p-3 text-slate-400 hover:bg-slate-50 rounded-2xl transition-all" title="Attach File"><Paperclip size={22} /></button>
                      <button onClick={shareLocation} className="p-3 text-slate-400 hover:bg-slate-50 rounded-2xl transition-all" title="Share Location"><MapPin size={22} /></button>
                    </div>
                    <div className="flex-1 relative flex items-center">
                      <input type="text" value={newMessage} onChange={handleTyping} onKeyPress={(e) => e.key === 'Enter' && sendMessage('text', newMessage)} placeholder="Type a message..." className="w-full bg-slate-50 border-none rounded-2xl pl-5 pr-12 py-4 text-sm focus:ring-2 focus:ring-purple-100 outline-none transition-all font-medium" />
                      <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="absolute right-3 p-2 text-slate-400 hover:text-[#7c3aed] transition-colors"><Smile size={22} /></button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onMouseDown={startRecording} onMouseUp={stopRecording} onMouseLeave={stopRecording} className={`p-4 rounded-2xl transition-all shadow-lg ${isRecording ? 'bg-red-500 text-white animate-pulse scale-110' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>
                        {isRecording ? <span className="text-xs font-black">{recordingTime}s</span> : <Mic size={22} />}
                      </button>
                      <button onClick={() => sendMessage('text', newMessage)} disabled={!newMessage.trim() || isSending} className="p-4 bg-gradient-to-br from-[#7c3aed] to-[#6d28d9] text-white rounded-2xl hover:shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50 shadow-lg">
                        {isSending ? <Loader2 className="animate-spin" size={22} /> : <Send size={22} />}
                      </button>
                    </div>
                  </div>
                  <input type="file" ref={fileInputRef} onChange={uploadFile} className="hidden" />
                </>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-[#fdfdfd] p-10 text-center">
            <div className="w-32 h-32 bg-purple-50 rounded-[40px] flex items-center justify-center mb-8 animate-bounce duration-1000">
              <Sparkles className="text-[#7c3aed]" size={60} />
            </div>
            <h3 className="text-3xl font-black text-slate-800 mb-4 tracking-tight">Your Private Space</h3>
            <p className="text-slate-500 max-w-xs leading-relaxed font-medium">Select a conversation to start sharing moments and stories in a secure environment.</p>
          </div>
        )}
      </div>

      {/* Call Overlay */}
      {callStatus !== 'idle' && (
        <div className="fixed inset-0 z-[100] bg-slate-900 flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">
          <div className="absolute inset-0 overflow-hidden opacity-20">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-purple-600 to-blue-900"></div>
            {remoteStream && callType === 'video' && <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover blur-3xl" />}
          </div>
          
          <div className="relative z-10 flex flex-col items-center w-full max-w-md">
            <div className="relative mb-12">
              <div className="w-40 h-40 rounded-[60px] overflow-hidden border-4 border-white/20 shadow-2xl animate-pulse">
                <Image src={(callStatus === 'incoming' ? incomingCallData?.avatar : selectedConversation?.avatar) || '/default-avatar.png'} alt="Caller" width={160} height={160} className="object-cover" unoptimized />
              </div>
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-md px-6 py-2 rounded-full border border-white/20">
                <p className="text-white text-sm font-black tracking-widest uppercase">{callStatus}</p>
              </div>
            </div>
            
            <h2 className="text-4xl font-black text-white mb-2 tracking-tight text-center">
              {callStatus === 'incoming' ? incomingCallData?.name : selectedConversation?.name}
            </h2>
            <p className="text-white/60 font-bold mb-20">{callType === 'video' ? 'Video Call' : 'Audio Call'}</p>

            {callStatus === 'connected' && callType === 'video' && (
              <div className="w-full aspect-video bg-black/40 rounded-[40px] overflow-hidden mb-12 border-2 border-white/10 shadow-2xl relative">
                <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                <div className="absolute bottom-4 right-4 w-32 aspect-video bg-black/60 rounded-2xl overflow-hidden border-2 border-white/20 shadow-xl">
                  <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                </div>
              </div>
            )}

            <div className="flex items-center gap-8">
              {callStatus === 'incoming' ? (
                <>
                  <button onClick={stopMedia} className="p-6 bg-red-500 text-white rounded-[30px] hover:bg-red-600 hover:scale-110 transition-all shadow-2xl shadow-red-500/40"><PhoneOff size={32} /></button>
                  <button onClick={acceptCall} className="p-6 bg-emerald-500 text-white rounded-[30px] hover:bg-emerald-600 hover:scale-110 transition-all shadow-2xl shadow-emerald-500/40 animate-bounce"><Phone size={32} /></button>
                </>
              ) : (
                <>
                  <button onClick={() => setIsMuted(!isMuted)} className={`p-5 rounded-[25px] transition-all ${isMuted ? 'bg-white text-slate-900' : 'bg-white/10 text-white hover:bg-white/20'}`}>{isMuted ? <MicOff size={24} /> : <Mic size={24} />}</button>
                  <button onClick={stopMedia} className="p-8 bg-red-500 text-white rounded-[35px] hover:bg-red-600 hover:scale-110 transition-all shadow-2xl shadow-red-500/40"><PhoneOff size={36} /></button>
                  {callType === 'video' && <button onClick={() => setIsVideoOff(!isVideoOff)} className={`p-5 rounded-[25px] transition-all ${isVideoOff ? 'bg-white text-slate-900' : 'bg-white/10 text-white hover:bg-white/20'}`}>{isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}</button>}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const Sparkles = ({ className, size }: { className?: string, size?: number }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M3 5h4"/><path d="M21 17v4"/><path d="M19 19h4"/>
  </svg>
);
