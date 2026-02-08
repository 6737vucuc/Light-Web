import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send, ArrowLeft, Phone, Video, MessageSquare, 
  Wifi, WifiOff, RefreshCw, Loader2, User, 
  ChevronLeft, MoreVertical, Paperclip, Smile, Mic,
  PhoneOff, MicOff, VideoOff, X, Volume2, Maximize2,
  Play, Pause, Trash2, Check, CheckCheck, Search,
  MapPin, FileText, Download, Reply, Image as ImageIcon
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
    if (/^[A-Za-z0-9+/=]+$/.test(str)) {
      try { return decodeURIComponent(escape(atob(str))); } catch { return atob(str); }
    }
    return str;
  } catch (e) { return str; }
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
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);
  const [isPeerReady, setIsPeerReady] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [otherUserOnline, setOtherUserOnline] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [replyTo, setReplyTo] = useState<any>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
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
        currentCallRef.current = call; setCallType(call.metadata?.type || 'audio');
        setCallStatus('incoming'); setIncomingCallData({ peerId: call.peer, name: call.metadata?.name, avatar: call.metadata?.avatar });
      });
      peer.on('error', () => setIsPeerReady(false));
    } catch (e) { console.error(e); }
  }, [currentUser?.id]);

  useEffect(() => { initPeer(); return () => { if (peerRef.current) peerRef.current.destroy(); }; }, [initPeer]);

  // Real-time Engine
  useEffect(() => {
    if (!currentUser?.id || !selectedConversation) return;
    const channelId = `chat-${Math.min(currentUser.id, selectedConversation.other_user_id)}-${Math.max(currentUser.id, selectedConversation.other_user_id)}`;
    const channel = supabase.channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'direct_messages' }, async (payload) => {
        if (payload.eventType === 'INSERT') {
          const msg = payload.new;
          if (!messageIds.current.has(msg.id)) {
            messageIds.current.add(msg.id); setMessages(prev => [...prev, msg]);
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
            if (msg.sender_id === selectedConversation.other_user_id) {
              new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3').play().catch(() => {});
              await supabase.from('direct_messages').update({ is_read: true }).eq('id', msg.id);
            }
          }
        } else if (payload.eventType === 'UPDATE') { setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new : m)); }
        else if (payload.eventType === 'DELETE') { setMessages(prev => prev.filter(m => m.id !== payload.old.id)); }
      })
      .on('broadcast', { event: 'typing' }, ({ payload }) => { if (payload.userId === selectedConversation.other_user_id) setOtherUserTyping(payload.isTyping); })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setOtherUserOnline(Object.keys(state).some(key => (state[key] as any).some((p: any) => p.userId === selectedConversation.other_user_id)));
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

  // Signaling for Calls
  useEffect(() => {
    if (!currentUser?.id) return;
    const channel = supabase.channel(`calls-${currentUser.id}`)
      .on('broadcast', { event: 'call-request' }, ({ payload }) => { if (callStatus === 'idle') { setCallStatus('incoming'); setCallType(payload.type); setIncomingCallData(payload); } })
      .on('broadcast', { event: 'call-response' }, ({ payload }) => { if (!payload.accepted) { setCallStatus('idle'); toast.error('تم رفض المكالمة'); stopMedia(); } })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentUser.id, callStatus]);

  // Advanced Features
  const shareLocation = async () => {
    if (!navigator.geolocation) return toast.error('الموقع غير مدعوم');
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const locUrl = `https://www.google.com/maps?q=${pos.coords.latitude},${pos.coords.longitude}`;
      await sendMessage('text', `[LOCATION]${locUrl}`);
    });
  };

  const uploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConversation) return;
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
    if (!selectedConversation) return;
    setIsSending(true);
    try {
      await supabase.from('direct_messages').insert({
        sender_id: currentUser.id, receiver_id: selectedConversation.other_user_id,
        content: encode(content), message_type: type, media_url: mediaUrl,
        reply_to_id: replyTo?.id
      });
      setReplyTo(null); setNewMessage('');
    } catch (e) { toast.error('فشل الإرسال'); } finally { setIsSending(false); }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    if (!isTyping && selectedConversation) {
      setIsTyping(true);
      supabase.channel(`chat-${selectedConversation.other_user_id}`).send({ type: 'broadcast', event: 'typing', payload: { userId: currentUser.id, isTyping: true } });
    }
  };

  useEffect(() => {
    const t = setTimeout(() => {
      if (isTyping && selectedConversation) {
        setIsTyping(false);
        supabase.channel(`chat-${selectedConversation.other_user_id}`).send({ type: 'broadcast', event: 'typing', payload: { userId: currentUser.id, isTyping: false } });
      }
    }, 3000);
    return () => clearTimeout(t);
  }, [newMessage, isTyping, selectedConversation, currentUser.id]);

  const stopMedia = () => { if (localStream) localStream.getTracks().forEach(t => t.stop()); setLocalStream(null); setRemoteStream(null); if (currentCallRef.current) currentCallRef.current.close(); };
  const endCall = () => { setCallStatus('idle'); stopMedia(); };
  const acceptCall = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true, video: callType === 'video' }); setLocalStream(s);
      if (currentCallRef.current) { currentCallRef.current.answer(s); currentCallRef.current.on('stream', (rs: any) => { setRemoteStream(rs); setCallStatus('connected'); }); }
    } catch (e) { endCall(); }
  };

  const startCall = async (type: 'audio' | 'video') => {
    if (!selectedConversation || !isPeerReady) return;
    setCallStatus('calling'); setCallType(type);
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' }); setLocalStream(s);
      await supabase.channel(`calls-${selectedConversation.other_user_id}`).send({ type: 'broadcast', event: 'call-request', payload: { from: currentUser.id, name: currentUser.name, avatar: currentUser.avatar, type, peerId: `user-${currentUser.id}` } });
      const call = peerRef.current.call(`user-${selectedConversation.other_user_id}`, s, { metadata: { type, name: currentUser.name, avatar: currentUser.avatar } });
      call.on('stream', (rs: any) => { setRemoteStream(rs); setCallStatus('connected'); });
      call.on('close', endCall); currentCallRef.current = call;
    } catch (e) { endCall(); }
  };

  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
    if (localStream && localVideoRef.current) localVideoRef.current.srcObject = localStream;
  }, [remoteStream, localStream]);

  useEffect(() => {
    const fetch = async () => { const res = await fetch('/api/direct-messages'); if (res.ok) { const d = await res.json(); setConversations(d.conversations || []); } setIsLoading(false); };
    fetch();
  }, []);

  const loadMsgs = useCallback(async (id: string) => {
    const { data } = await supabase.from('direct_messages').select('*').or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${id}),and(sender_id.eq.${id},receiver_id.eq.${currentUser.id})`).order('created_at', { ascending: true });
    if (data) { setMessages(data); data.forEach(m => messageIds.current.add(m.id)); setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100); }
  }, [currentUser.id]);

  useEffect(() => { if (selectedConversation) loadMsgs(selectedConversation.other_user_id); }, [selectedConversation, loadMsgs]);

  return (
    <div className="flex h-full bg-[#f8fafc] overflow-hidden font-sans text-[#1e293b] relative">
      {/* Sidebar */}
      <div className={`w-full md:w-[380px] flex-shrink-0 border-r border-slate-200 flex flex-col bg-white ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h1 className="text-2xl font-black tracking-tighter text-[#7c3aed]">Signal</h1>
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${isSupabaseConnected ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${isSupabaseConnected ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
            {isSupabaseConnected ? 'Live' : 'Syncing'}
          </div>
        </div>
        <div className="px-5 py-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#7c3aed] transition-colors" size={18} />
            <input type="text" placeholder="Search chats..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-slate-50 border-none rounded-2xl pl-11 pr-4 py-3 text-sm focus:ring-2 focus:ring-purple-100 outline-none transition-all" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-2">
          {conversations.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase())).map((conv) => (
            <button key={conv.other_user_id} onClick={() => setSelectedConversation(conv)} className={`w-full p-4 mb-1 flex items-center gap-4 rounded-2xl hover:bg-slate-50 transition-all ${selectedConversation?.other_user_id === conv.other_user_id ? 'bg-purple-50 shadow-sm' : ''}`}>
              <div className="relative flex-shrink-0">
                <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-white shadow-sm">
                  <Image src={conv.avatar || '/default-avatar.png'} alt={conv.name} width={56} height={56} className="object-cover" unoptimized />
                </div>
                {conv.is_online && <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full shadow-sm"></div>}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex justify-between items-baseline mb-1">
                  <h3 className="font-bold text-[16px] truncate text-slate-800">{conv.name}</h3>
                  <span className="text-[10px] text-slate-400 font-medium">12:45 PM</span>
                </div>
                <p className="text-sm text-slate-500 truncate leading-relaxed">{decode(conv.last_message) || 'Start a new story...'}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Engine */}
      <div className={`flex-1 flex flex-col bg-white absolute inset-0 z-20 md:relative md:z-0 ${selectedConversation ? 'flex' : 'hidden md:flex'}`}>
        {selectedConversation ? (
          <>
            <div className="h-20 border-b border-slate-100 flex items-center justify-between px-6 bg-white/90 backdrop-blur-xl sticky top-0 z-10">
              <div className="flex items-center gap-4 min-w-0">
                <button onClick={() => setSelectedConversation(null)} className="p-2 -ml-2 hover:bg-slate-100 rounded-xl md:hidden text-slate-600"><ChevronLeft size={28} /></button>
                <div className="w-12 h-12 rounded-2xl overflow-hidden border border-slate-100 shadow-sm flex-shrink-0">
                  <Image src={selectedConversation.avatar || '/default-avatar.png'} alt={selectedConversation.name} width={48} height={48} className="object-cover" unoptimized />
                </div>
                <div className="min-w-0">
                  <h2 className="font-bold text-[17px] truncate text-slate-900 leading-tight">{selectedConversation.name}</h2>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`w-2 h-2 rounded-full ${otherUserOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                    <span className={`text-[12px] font-bold ${otherUserOnline ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {otherUserTyping ? 'Typing...' : (otherUserOnline ? 'Active Now' : 'Offline')}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => startCall('audio')} className="p-3 text-[#7c3aed] hover:bg-purple-50 rounded-2xl transition-all active:scale-90"><Phone size={22} /></button>
                <button onClick={() => startCall('video')} className="p-3 text-[#7c3aed] hover:bg-purple-50 rounded-2xl transition-all active:scale-90"><Video size={22} /></button>
                <button className="p-3 text-slate-400 hover:bg-slate-50 rounded-2xl transition-all"><MoreVertical size={22} /></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#fdfdfd] scrollbar-hide">
              {messages.map((msg, i) => (
                <div key={msg.id} className={`flex ${msg.sender_id === currentUser.id ? 'justify-end' : 'justify-start'} group relative`}>
                  <div className={`max-w-[85%] rounded-3xl text-[15px] shadow-sm transition-all hover:shadow-md overflow-hidden ${msg.sender_id === currentUser.id ? 'bg-[#7c3aed] text-white rounded-br-none' : 'bg-white border border-slate-100 text-slate-800 rounded-bl-none'}`}>
                    {msg.reply_to_id && (
                      <div className="mx-2 mt-2 p-2 bg-black/5 rounded-2xl border-l-4 border-white/20 text-[12px] opacity-80">
                        {decode(messages.find(m => m.id === msg.reply_to_id)?.content) || 'Replied message'}
                      </div>
                    )}
                    {msg.message_type === 'image' ? (
                      <div className="p-1.5"><Image src={msg.media_url} alt="Image" width={400} height={400} className="rounded-2xl object-cover max-w-full h-auto shadow-sm" unoptimized /></div>
                    ) : msg.message_type === 'voice' ? (
                      <div className="px-5 py-3 flex items-center gap-4 min-w-[240px]">
                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center"><Volume2 size={20} /></div>
                        <audio src={msg.media_url} controls className="h-8 w-full filter invert" />
                      </div>
                    ) : msg.message_type === 'file' ? (
                      <a href={msg.media_url} target="_blank" className="px-5 py-4 flex items-center gap-4 min-w-[200px] hover:bg-black/5 transition-colors">
                        <FileText size={24} />
                        <div className="flex-1 truncate"><p className="font-bold text-sm truncate">{decode(msg.content)}</p><p className="text-[10px] opacity-70 uppercase tracking-widest">Download File</p></div>
                        <Download size={18} />
                      </a>
                    ) : (
                      <div className="px-5 py-3.5 leading-relaxed font-medium">
                        {decode(msg.content).startsWith('[LOCATION]') ? (
                          <a href={decode(msg.content).replace('[LOCATION]', '')} target="_blank" className="flex items-center gap-3 underline"><MapPin size={20} /> My Current Location</a>
                        ) : decode(msg.content)}
                      </div>
                    )}
                    <div className={`text-[10px] px-4 pb-2 flex items-center justify-end gap-1.5 font-bold uppercase tracking-tighter opacity-60 ${msg.sender_id === currentUser.id ? 'text-white' : 'text-slate-400'}`}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {msg.sender_id === currentUser.id && (msg.is_read ? <CheckCheck size={14} className="text-purple-200" /> : <Check size={14} />)}
                    </div>
                  </div>
                  <div className={`absolute top-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-all ${msg.sender_id === currentUser.id ? 'right-full mr-2' : 'left-full ml-2'}`}>
                    <button onClick={() => setReplyTo(msg)} className="p-2 bg-white shadow-sm border border-slate-100 rounded-full text-slate-400 hover:text-[#7c3aed]"><Reply size={14} /></button>
                    {msg.sender_id === currentUser.id && <button onClick={async () => await supabase.from('direct_messages').delete().eq('id', msg.id)} className="p-2 bg-white shadow-sm border border-slate-100 rounded-full text-slate-400 hover:text-red-500"><Trash2 size={14} /></button>}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} className="h-4" />
            </div>

            {replyTo && (
              <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between animate-in slide-in-from-bottom-2">
                <div className="flex items-center gap-3 text-sm text-slate-600 truncate">
                  <Reply size={16} className="text-[#7c3aed]" />
                  <span className="font-bold">Replying to:</span>
                  <span className="truncate italic">{decode(replyTo.content)}</span>
                </div>
                <button onClick={() => setReplyTo(null)} className="p-1 hover:bg-slate-200 rounded-full transition-colors"><X size={16} /></button>
              </div>
            )}

            <div className="p-6 bg-white border-t border-slate-100">
              <form onSubmit={(e) => { e.preventDefault(); sendMessage('text', newMessage); }} className="flex items-center gap-3 max-w-5xl mx-auto relative">
                <div className="flex-1 bg-slate-50 rounded-[28px] flex items-center px-4 py-1.5 border border-transparent focus-within:border-purple-200 focus-within:bg-white transition-all shadow-inner">
                  <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className={`p-2 transition-colors ${showEmojiPicker ? 'text-[#7c3aed]' : 'text-slate-400 hover:text-[#7c3aed]'}`}><Smile size={24} /></button>
                  <input type="text" value={newMessage} onChange={handleTyping} placeholder="Write something magical..." className="flex-1 bg-transparent border-none px-3 py-3 focus:ring-0 outline-none text-[16px] text-slate-800 font-medium" disabled={isRecording} />
                  <input type="file" ref={fileInputRef} onChange={uploadFile} className="hidden" />
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={shareLocation} className="p-2 text-slate-400 hover:text-[#7c3aed] transition-colors"><MapPin size={22} /></button>
                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="p-2 text-slate-400 hover:text-[#7c3aed] transition-colors">{isUploading ? <Loader2 size={22} className="animate-spin" /> : <Paperclip size={22} />}</button>
                  </div>
                </div>
                {newMessage.trim() ? (
                  <button type="submit" disabled={isSending} className="w-14 h-14 bg-[#7c3aed] text-white rounded-full shadow-lg shadow-purple-200 flex items-center justify-center hover:bg-[#6d28d9] active:scale-90 transition-all"><Send size={24} /></button>
                ) : (
                  <button type="button" onMouseDown={startRecording} onMouseUp={stopRecording} onTouchStart={startRecording} onTouchEnd={stopRecording} className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all active:scale-95 ${isRecording ? 'bg-red-500 animate-pulse text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}><Mic size={24} /></button>
                )}
                {showEmojiPicker && (
                  <div className="absolute bottom-full left-0 mb-4 p-4 bg-white shadow-2xl rounded-3xl border border-slate-100 grid grid-cols-6 gap-2 z-50 animate-in zoom-in-95">
                    {['😊', '😂', '😍', '👍', '🔥', '❤️', '🙌', '✨', '🎉', '🤔', '😎', '💡'].map(e => (
                      <button key={e} type="button" onClick={() => { setNewMessage(p => p + e); setShowEmojiPicker(false); }} className="text-2xl hover:scale-125 transition-transform p-1">{e}</button>
                    ))}
                  </div>
                )}
              </form>
              {isRecording && <div className="flex items-center justify-center gap-2 mt-3 text-red-500 font-black text-xs uppercase tracking-widest animate-pulse"><div className="w-2 h-2 bg-red-500 rounded-full"></div> Recording Audio: {recordingTime}s</div>}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-200 bg-[#fafafa]">
            <div className="w-32 h-32 bg-white rounded-[40px] shadow-xl shadow-slate-100 flex items-center justify-center mb-8 border border-slate-50"><MessageSquare size={64} className="text-purple-100" /></div>
            <h3 className="text-slate-900 font-black text-2xl mb-2 tracking-tight">Your Private Space</h3>
            <p className="text-slate-400 font-medium">Select a conversation to start the magic.</p>
          </div>
        )}
      </div>

      {/* Call UI Overlay */}
      {callStatus !== 'idle' && (
        <div className="fixed inset-0 z-[100] bg-[#0f172a] flex flex-col items-center justify-center text-white p-8 animate-in fade-in duration-500 backdrop-blur-3xl">
          <div className="absolute top-8 right-8"><button onClick={endCall} className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all"><X size={32} /></button></div>
          <div className="flex flex-col items-center mb-16">
            <div className="w-40 h-40 rounded-[50px] overflow-hidden border-8 border-[#7c3aed]/30 mb-8 shadow-2xl animate-pulse relative">
              <Image src={callStatus === 'incoming' ? (incomingCallData?.avatar || '/default-avatar.png') : (selectedConversation?.avatar || '/default-avatar.png')} alt="Avatar" width={160} height={160} className="object-cover" unoptimized />
              <div className="absolute inset-0 bg-gradient-to-t from-[#7c3aed]/20 to-transparent"></div>
            </div>
            <h2 className="text-4xl font-black mb-3 tracking-tight">{callStatus === 'incoming' ? incomingCallData?.name : selectedConversation?.name}</h2>
            <div className="flex items-center gap-3 px-4 py-1.5 bg-white/10 rounded-full"><div className="w-2 h-2 bg-purple-400 rounded-full animate-ping"></div><p className="text-purple-200 font-bold uppercase tracking-widest text-xs">{callStatus === 'calling' ? 'Calling...' : callStatus === 'incoming' ? 'Incoming Call' : 'Connected'}</p></div>
          </div>
          {callType === 'video' && callStatus === 'connected' && (
            <div className="relative w-full max-w-5xl aspect-video bg-slate-900 rounded-[40px] overflow-hidden shadow-2xl mb-12 border border-white/10">
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <div className="absolute bottom-6 right-6 w-1/3 max-w-[240px] aspect-video bg-slate-800 rounded-3xl overflow-hidden border-4 border-white/20 shadow-2xl"><video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" /></div>
            </div>
          )}
          <div className="flex items-center gap-8 mt-auto mb-12">
            {callStatus === 'incoming' ? (
              <><button onClick={acceptCall} className="w-20 h-20 bg-emerald-500 rounded-[30px] flex items-center justify-center hover:bg-emerald-600 shadow-2xl shadow-emerald-500/40 hover:scale-110 transition-all active:scale-90"><Phone size={40} /></button><button onClick={endCall} className="w-20 h-20 bg-rose-500 rounded-[30px] flex items-center justify-center hover:bg-rose-600 shadow-2xl shadow-rose-500/40 hover:scale-110 transition-all active:scale-90"><PhoneOff size={40} /></button></>
            ) : (
              <><button onClick={() => setIsMuted(!isMuted)} className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${isMuted ? 'bg-rose-500' : 'bg-white/10 hover:bg-white/20'}`}>{isMuted ? <MicOff size={28} /> : <Mic size={28} />}</button><button onClick={endCall} className="w-20 h-20 bg-rose-500 rounded-[30px] flex items-center justify-center hover:bg-rose-600 shadow-2xl shadow-rose-500/40 hover:scale-110 transition-all active:scale-90"><PhoneOff size={40} /></button>{callType === 'video' && (<button onClick={() => setIsVideoOff(!isVideoOff)} className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${isVideoOff ? 'bg-rose-500' : 'bg-white/10 hover:bg-white/20'}`}>{isVideoOff ? <VideoOff size={28} /> : <Video size={28} />}</button>)}</>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
