import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send, ArrowLeft, Phone, Video, MessageSquare, 
  Wifi, WifiOff, RefreshCw, Loader2, User, 
  ChevronLeft, MoreVertical, Paperclip, Smile, Mic,
  PhoneOff, MicOff, VideoOff, X, Volume2, Maximize2
} from 'lucide-react';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/lib/contexts/ToastContext';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabase/client';

// PeerJS will be imported dynamically
let Peer: any;

const decodeMessage = (content: string) => {
  if (!content) return '';
  try {
    if (/^[A-Za-z0-9+/=]+$/.test(content)) {
      try { return decodeURIComponent(escape(atob(content))); } catch { return atob(content); }
    }
    return content;
  } catch (e) { return content; }
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
      if (!Peer) {
        const module = await import('peerjs');
        Peer = module.default;
      }
      if (peerRef.current) peerRef.current.destroy();

      const peer = new Peer(`user-${currentUser.id}`, {
        host: '0.peerjs.com',
        port: 443,
        path: '/',
        secure: true,
        debug: 1
      });

      peer.on('open', (id: string) => {
        setIsPeerReady(true);
        peerRef.current = peer;
      });

      peer.on('call', async (call: any) => {
        currentCallRef.current = call;
        setCallType(call.metadata?.type || 'audio');
        setCallStatus('incoming');
        setIncomingCallData({
          peerId: call.peer,
          name: call.metadata?.name || 'مستخدم',
          avatar: call.metadata?.avatar
        });
      });

      peer.on('error', () => setIsPeerReady(false));
    } catch (e) { console.error('Init Peer error:', e); }
  }, [currentUser?.id]);

  useEffect(() => {
    initPeer();
    return () => { if (peerRef.current) peerRef.current.destroy(); };
  }, [initPeer]);

  // Real-time Messaging, Typing and Presence
  useEffect(() => {
    if (!currentUser?.id || !selectedConversation) return;

    const channelId = `chat-${Math.min(currentUser.id, selectedConversation.other_user_id)}-${Math.max(currentUser.id, selectedConversation.other_user_id)}`;
    const channel = supabase.channel(channelId)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'direct_messages'
      }, payload => {
        const msg = payload.new;
        if (!messageIds.current.has(msg.id)) {
          if (msg.sender_id === selectedConversation.other_user_id || msg.receiver_id === selectedConversation.other_user_id) {
            messageIds.current.add(msg.id);
            setMessages(prev => [...prev, msg]);
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
            if (msg.sender_id !== currentUser.id) {
              new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3').play().catch(() => {});
            }
          }
        }
      })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.userId === selectedConversation.other_user_id) {
          setOtherUserTyping(payload.isTyping);
        }
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const isOnline = Object.keys(state).some(key => 
          (state[key] as any).some((p: any) => p.userId === selectedConversation.other_user_id)
        );
        setOtherUserOnline(isOnline);
      })
      .subscribe(async (status) => {
        setIsSupabaseConnected(status === 'SUBSCRIBED');
        if (status === 'SUBSCRIBED') {
          await channel.track({ userId: currentUser.id, online_at: new Date().toISOString() });
        }
      });

    return () => { supabase.removeChannel(channel); };
  }, [currentUser.id, selectedConversation]);

  // Signaling for Calls
  useEffect(() => {
    if (!currentUser?.id) return;
    const channel = supabase.channel(`calls-${currentUser.id}`)
      .on('broadcast', { event: 'call-request' }, ({ payload }) => {
        if (callStatus === 'idle') {
          setCallStatus('incoming');
          setCallType(payload.type);
          setIncomingCallData(payload);
        }
      })
      .on('broadcast', { event: 'call-response' }, ({ payload }) => {
        if (!payload.accepted) {
          setCallStatus('idle');
          toast.error('تم رفض المكالمة');
          stopMedia();
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUser.id, callStatus]);

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    if (!isTyping && selectedConversation) {
      setIsTyping(true);
      const channelId = `chat-${Math.min(currentUser.id, selectedConversation.other_user_id)}-${Math.max(currentUser.id, selectedConversation.other_user_id)}`;
      supabase.channel(channelId).send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId: currentUser.id, isTyping: true }
      });
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (isTyping && selectedConversation) {
        setIsTyping(false);
        const channelId = `chat-${Math.min(currentUser.id, selectedConversation.other_user_id)}-${Math.max(currentUser.id, selectedConversation.other_user_id)}`;
        supabase.channel(channelId).send({
          type: 'broadcast',
          event: 'typing',
          payload: { userId: currentUser.id, isTyping: false }
        });
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [newMessage, isTyping, selectedConversation, currentUser.id]);

  const stopMedia = () => {
    if (localStream) localStream.getTracks().forEach(track => track.stop());
    setLocalStream(null);
    setRemoteStream(null);
    if (currentCallRef.current) currentCallRef.current.close();
  };

  const startCall = async (type: 'audio' | 'video') => {
    if (!selectedConversation || !isPeerReady) return;
    setCallStatus('calling');
    setCallType(type);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' });
      setLocalStream(stream);
      await supabase.channel(`calls-${selectedConversation.other_user_id}`).send({
        type: 'broadcast',
        event: 'call-request',
        payload: { from: currentUser.id, name: currentUser.name, avatar: currentUser.avatar, type: type, peerId: `user-${currentUser.id}` }
      });
      const call = peerRef.current.call(`user-${selectedConversation.other_user_id}`, stream, {
        metadata: { type, name: currentUser.name, avatar: currentUser.avatar }
      });
      call.on('stream', (rStream: MediaStream) => { setRemoteStream(rStream); setCallStatus('connected'); });
      call.on('close', () => { setCallStatus('idle'); stopMedia(); });
      currentCallRef.current = call;
    } catch (err) { setCallStatus('idle'); toast.error('فشل الوصول للوسائط'); }
  };

  const acceptCall = async () => {
    if (!incomingCallData) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: callType === 'video' });
      setLocalStream(stream);
      if (currentCallRef.current) {
        currentCallRef.current.answer(stream);
        currentCallRef.current.on('stream', (rStream: MediaStream) => { setRemoteStream(rStream); setCallStatus('connected'); });
      }
    } catch (err) { setCallStatus('idle'); toast.error('فشل قبول المكالمة'); }
  };

  const endCall = () => { setCallStatus('idle'); stopMedia(); };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || isSending) return;
    setIsTyping(false);
    const content = newMessage.trim();
    setNewMessage('');
    setIsSending(true);
    try {
      const encryptedContent = btoa(unescape(encodeURIComponent(content)));
      const { data } = await supabase.from('direct_messages').insert({
        sender_id: currentUser.id,
        receiver_id: selectedConversation.other_user_id,
        content: encryptedContent,
      }).select().single();
      if (data && !messageIds.current.has(data.id)) {
        messageIds.current.add(data.id);
        setMessages(prev => [...prev, data]);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    } catch (error) { toast.error('فشل الإرسال'); } finally { setIsSending(false); }
  };

  const getAvatarUrl = (avatar?: string | null) => {
    if (!avatar) return '/default-avatar.png';
    if (avatar.startsWith('data:') || avatar.startsWith('http')) return avatar;
    return `https://neon-image-bucket.s3.us-east-1.amazonaws.com/${avatar}`;
  };

  useEffect(() => {
    if (remoteStream && remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
    if (localStream && localVideoRef.current) localVideoRef.current.srcObject = localStream;
  }, [remoteStream, localStream]);

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const res = await fetch('/api/direct-messages');
        if (res.ok) {
          const data = await res.json();
          setConversations(data.conversations || []);
        }
      } catch (e) {} finally { setIsLoading(false); }
    };
    fetchConversations();
  }, []);

  const loadMessages = useCallback(async (otherId: string) => {
    const { data } = await supabase.from('direct_messages').select('*')
      .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${currentUser.id})`)
      .order('created_at', { ascending: true });
    if (data) {
      setMessages(data);
      data.forEach(m => messageIds.current.add(m.id));
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [currentUser.id]);

  useEffect(() => {
    if (selectedConversation) loadMessages(selectedConversation.other_user_id);
  }, [selectedConversation, loadMessages]);

  return (
    <div className="flex h-full bg-white overflow-hidden font-sans text-[#1b1b1b] relative">
      <div className={`w-full md:w-[350px] flex-shrink-0 border-r border-gray-100 flex flex-col ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-white">
          <h1 className="text-xl font-bold tracking-tight text-[#7c3aed]">Signal</h1>
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium ${isSupabaseConnected ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${isSupabaseConnected ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`} />
            {isSupabaseConnected ? 'متصل' : 'جاري الاتصال'}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.map((conv) => (
            <button key={conv.other_user_id} onClick={() => setSelectedConversation(conv)} className={`w-full p-4 flex items-center gap-3 hover:bg-gray-50 border-b border-gray-50/50 ${selectedConversation?.other_user_id === conv.other_user_id ? 'bg-[#f5f3ff]' : ''}`}>
              <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border border-gray-100">
                <Image src={getAvatarUrl(conv.avatar)} alt={conv.name} width={48} height={48} className="object-cover" unoptimized />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <h3 className="font-bold text-[15px] truncate">{conv.name}</h3>
                <p className="text-sm text-gray-500 truncate">{decodeMessage(conv.last_message) || 'ابدأ المحادثة...'}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className={`flex-1 flex flex-col bg-white absolute inset-0 z-20 md:relative md:z-0 ${selectedConversation ? 'flex' : 'hidden md:flex'}`}>
        {selectedConversation ? (
          <>
            <div className="h-16 border-b border-gray-100 flex items-center justify-between px-4 bg-white/80 backdrop-blur-md">
              <div className="flex items-center gap-3 min-w-0">
                <button onClick={() => setSelectedConversation(null)} className="p-2 -ml-2 hover:bg-gray-100 rounded-full md:hidden"><ChevronLeft size={24} /></button>
                <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-100">
                  <Image src={getAvatarUrl(selectedConversation.avatar)} alt={selectedConversation.name} width={40} height={40} className="object-cover" unoptimized />
                </div>
                <div className="min-w-0">
                  <h2 className="font-bold text-[15px] truncate">{selectedConversation.name}</h2>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${otherUserOnline ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <span className={`text-[11px] font-bold ${otherUserOnline ? 'text-green-600' : 'text-gray-400'}`}>
                      {otherUserTyping ? 'جاري الكتابة...' : (otherUserOnline ? t('online') : t('offline'))}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => startCall('audio')} className="p-2.5 text-[#7c3aed] hover:bg-purple-50 rounded-full transition-colors"><Phone size={20} /></button>
                <button onClick={() => startCall('video')} className="p-2.5 text-[#7c3aed] hover:bg-purple-50 rounded-full transition-colors"><Video size={20} /></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#fcfcfc]">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender_id === currentUser.id ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-[15px] shadow-sm ${msg.sender_id === currentUser.id ? 'bg-[#7c3aed] text-white rounded-br-none' : 'bg-white border border-gray-100 text-gray-800 rounded-bl-none'}`}>
                    {decodeMessage(msg.content)}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-white border-t border-gray-50">
              <form onSubmit={handleSendMessage} className="flex items-center gap-2 max-w-4xl mx-auto">
                <div className="flex-1 bg-gray-100 rounded-2xl flex items-center px-3 py-1 border border-transparent focus-within:border-purple-200 focus-within:bg-white transition-all shadow-inner">
                  <button type="button" className="p-1.5 text-gray-400 hover:text-[#7c3aed]"><Smile size={22} /></button>
                  <input type="text" value={newMessage} onChange={handleTyping} placeholder={t('typeMessage')} className="flex-1 bg-transparent border-none px-2 py-2 focus:ring-0 outline-none text-[15px] text-gray-800" />
                  <button type="button" className="p-1.5 text-gray-400 hover:text-[#7c3aed]"><Paperclip size={22} /></button>
                </div>
                <button type="submit" disabled={!newMessage.trim() || isSending} className="p-3 bg-[#7c3aed] text-white rounded-full shadow-md hover:bg-[#6d28d9] disabled:opacity-50 transition-all flex-shrink-0">
                  <Send size={20} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-300">
            <MessageSquare size={64} className="opacity-10 mb-4" />
            <p>اختر محادثة للبدء</p>
          </div>
        )}
      </div>

      {callStatus !== 'idle' && (
        <div className="fixed inset-0 z-[100] bg-[#0f172a] flex flex-col items-center justify-center text-white p-6 animate-in fade-in duration-300">
          <div className="absolute top-6 right-6">
            <button onClick={endCall} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"><X size={24} /></button>
          </div>
          <div className="flex flex-col items-center mb-12">
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-[#7c3aed] mb-6 shadow-2xl animate-pulse">
              <Image src={getAvatarUrl(callStatus === 'incoming' ? incomingCallData?.avatar : selectedConversation?.avatar)} alt="Avatar" width={128} height={128} className="object-cover" unoptimized />
            </div>
            <h2 className="text-3xl font-bold mb-2">{callStatus === 'incoming' ? incomingCallData?.name : selectedConversation?.name}</h2>
            <p className="text-purple-300 animate-pulse font-medium">
              {callStatus === 'calling' ? 'جاري الاتصال...' : callStatus === 'incoming' ? 'مكالمة واردة...' : 'متصل'}
            </p>
          </div>
          {callType === 'video' && callStatus === 'connected' && (
            <div className="relative w-full max-w-4xl aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl mb-8">
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <div className="absolute bottom-4 right-4 w-1/4 aspect-video bg-gray-800 rounded-xl overflow-hidden border-2 border-white/20 shadow-lg">
                <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              </div>
            </div>
          )}
          <div className="flex items-center gap-6 mt-auto mb-10">
            {callStatus === 'incoming' ? (
              <>
                <button onClick={acceptCall} className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center hover:bg-green-600 transition-all shadow-lg hover:scale-110"><Phone size={32} /></button>
                <button onClick={endCall} className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-all shadow-lg hover:scale-110"><PhoneOff size={32} /></button>
              </>
            ) : (
              <>
                <button onClick={() => setIsMuted(!isMuted)} className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isMuted ? 'bg-red-500' : 'bg-white/10 hover:bg-white/20'}`}>{isMuted ? <MicOff size={24} /> : <Mic size={24} />}</button>
                <button onClick={endCall} className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-all shadow-lg hover:scale-110"><PhoneOff size={32} /></button>
                {callType === 'video' && (
                  <button onClick={() => setIsVideoOff(!isVideoOff)} className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isVideoOff ? 'bg-red-500' : 'bg-white/10 hover:bg-white/20'}`}>{isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}</button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
