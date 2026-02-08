import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send, ArrowLeft, MoreVertical, Phone, Video,
  Search, Smile, Paperclip, Mic, Check, CheckCheck,
  MessageSquare, Loader2, Shield, Lock, Ghost,
  Camera, RefreshCw, UserX, Wifi, WifiOff, Volume2, VolumeX
} from 'lucide-react';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/lib/contexts/ToastContext';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabase/client';

// PeerJS will be imported dynamically to avoid SSR issues
let Peer: any;

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
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [otherUserOnline, setOtherUserOnline] = useState(false);
  const [otherUserLastSeen, setOtherUserLastSeen] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Connection States
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'incoming' | 'connected' | 'ended'>('idle');
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');
  const [callOtherUser, setCallOtherUser] = useState({ name: '', avatar: '' as string | null });
  const [peerId, setPeerId] = useState<string | null>(null);
  const [isPeerReady, setIsPeerReady] = useState(false);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const callDurationRef = useRef<NodeJS.Timeout | null>(null);
  const peerRef = useRef<any>(null);
  const currentCallRef = useRef<any>(null);
  const channelRef = useRef<any>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const messageIds = useRef<Set<string>>(new Set());

  // Initialize PeerJS connection
  const initializePeerConnection = useCallback(async () => {
    if (typeof window === 'undefined' || !currentUser?.id) return null;

    try {
      if (!Peer) {
        const module = await import('peerjs');
        Peer = module.default;
      }

      if (peerRef.current && !peerRef.current.destroyed) {
        peerRef.current.destroy();
      }

      const peerIdToUse = `signal-${currentUser.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const peer = new Peer(peerIdToUse, {
        host: '0.peerjs.com',
        port: 443,
        path: '/',
        secure: true,
        debug: 1,
        pingInterval: 5000,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'turn:numb.viagenie.ca', credential: 'muazkh', username: 'webrtc@live.com' }
          ]
        }
      });

      return new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Peer connection timeout')), 15000);

        peer.on('open', async (id: string) => {
          clearTimeout(timeout);
          setPeerId(id);
          peerRef.current = peer;
          setIsPeerReady(true);
          
          try {
            await supabase.from('users').update({ 
              current_peer_id: id,
              last_seen: new Date().toISOString(),
              is_online: true 
            }).eq('id', currentUser.id);
          } catch (dbError) { console.error('DB update error:', dbError); }
          resolve(id);
        });

        peer.on('error', (err: any) => {
          clearTimeout(timeout);
          setIsPeerReady(false);
          if (err.type === 'network') setTimeout(() => peer.reconnect(), 5000);
          reject(err);
        });

        peer.on('disconnected', () => {
          setIsPeerReady(false);
          setTimeout(() => { if (!peer.destroyed) peer.reconnect(); }, 3000);
        });

        peer.on('close', () => setIsPeerReady(false));
      });
    } catch (error) {
      setIsPeerReady(false);
      throw error;
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser?.id) return;
    initializePeerConnection().catch(console.error);
    return () => {
      if (peerRef.current && !peerRef.current.destroyed) peerRef.current.destroy();
    };
  }, [currentUser?.id, initializePeerConnection]);

  // Load Conversations
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
    } catch (error) { console.error('Load conversations error:', error); }
  }, [selectedConversation]);

  useEffect(() => {
    loadConversations(initialUserId);
  }, [initialUserId, loadConversations]);

  // Real-time Subscription
  useEffect(() => {
    if (!selectedConversation || !currentUser?.id) return;

    const channelName = `dm-${Math.min(currentUser.id, selectedConversation.other_user_id)}-${Math.max(currentUser.id, selectedConversation.other_user_id)}`;
    const channel = supabase.channel(channelName);

    channel
      .on('broadcast', { event: 'new-message' }, ({ payload }) => {
        if (!messageIds.current.has(payload.id)) {
          messageIds.current.add(payload.id);
          setMessages(prev => [...prev, payload]);
          scrollToBottom();
        }
      })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.userId === selectedConversation.other_user_id) setOtherUserTyping(payload.isTyping);
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const otherUserPresent = Object.keys(state).some(key => key.includes(`user-${selectedConversation.other_user_id}`));
        setOtherUserOnline(otherUserPresent);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setIsSupabaseConnected(true);
          await channel.track({ userId: currentUser.id, online_at: new Date().toISOString() });
        } else {
          setIsSupabaseConnected(false);
        }
      });

    channelRef.current = channel;
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, [selectedConversation, currentUser.id]);

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const refreshConnection = async () => {
    toast.info(t('refreshConnection'));
    try {
      await initializePeerConnection();
      toast.success(t('success'));
    } catch (error) { toast.error(t('error')); }
  };

  const handleStartCall = async (type: 'audio' | 'video') => {
    if (!isSupabaseConnected || !isPeerReady) return;
    toast.info(t('calling'));
    // Call logic here...
  };

  const getAvatarUrl = (avatar?: string | null) => {
    if (!avatar) return '/default-avatar.png';
    if (avatar.startsWith('data:') || avatar.startsWith('http')) return avatar;
    return `https://neon-image-bucket.s3.us-east-1.amazonaws.com/${avatar}`;
  };

  const formatTime = (date: any) => {
    if (!date) return '';
    return new Date(date).toLocaleTimeString(locale === 'ar' ? 'ar-SA' : 'en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  return (
    <div className="flex h-full bg-white overflow-hidden font-sans text-[#1b1b1b]">
      {/* Sidebar */}
      <div className={`w-full md:w-[350px] flex-shrink-0 border-r border-gray-100 flex flex-col ${selectedConversation && 'hidden md:flex'}`}>
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg overflow-hidden">
              {currentUser.avatar ? <Image src={getAvatarUrl(currentUser.avatar)} alt={currentUser.name} width={40} height={40} className="object-cover" unoptimized /> : currentUser.name.charAt(0)}
            </div>
            <h1 className="text-xl font-bold tracking-tight">Signal</h1>
          </div>
        </div>

        {/* Connection Status - REAL & ACTUAL */}
        <div className="px-4 mb-3">
          <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${isSupabaseConnected && isPeerReady ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-yellow-50 text-yellow-700 border border-yellow-100'}`}>
            {isSupabaseConnected && isPeerReady ? <Wifi size={16} /> : <WifiOff size={16} />}
            <span className="font-medium">
              {isSupabaseConnected && isPeerReady ? t('callReady') : t('connecting')}
            </span>
            <button onClick={refreshConnection} className="ml-auto p-1 hover:bg-gray-100 rounded-full transition-colors">
              <RefreshCw size={14} className={!isSupabaseConnected || !isPeerReady ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {conversations.map((conv) => (
            <button key={conv.other_user_id} onClick={() => setSelectedConversation(conv)} className={`w-full p-3 flex items-center gap-3 hover:bg-gray-50 transition-colors ${selectedConversation?.other_user_id === conv.other_user_id ? 'bg-blue-50/50' : ''}`}>
              <div className="relative flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden">
                  <Image src={getAvatarUrl(conv.avatar)} alt={conv.name} width={48} height={48} className="object-cover" unoptimized />
                </div>
                {conv.is_online && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <h3 className="font-bold text-[15px] truncate">{conv.name}</h3>
                <p className="text-sm text-gray-500 truncate">{conv.last_message || 'Start a conversation'}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col bg-white ${!selectedConversation && 'hidden md:flex'}`}>
        {selectedConversation ? (
          <>
            <div className="h-16 border-b border-gray-100 flex items-center justify-between px-4 flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <button onClick={() => setSelectedConversation(null)} className="md:hidden p-2 -ml-2 hover:bg-gray-100 rounded-full"><ArrowLeft size={20} /></button>
                <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                  <Image src={getAvatarUrl(selectedConversation.avatar)} alt={selectedConversation.name} width={40} height={40} className="object-cover" unoptimized />
                </div>
                <div className="min-w-0">
                  <h2 className="font-bold text-[15px] truncate">{selectedConversation.name}</h2>
                  <p className="text-[11px] font-medium flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 ${isSupabaseConnected && isPeerReady ? 'text-green-600' : 'text-yellow-600'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isSupabaseConnected && isPeerReady ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></span>
                      {isSupabaseConnected && isPeerReady ? t('readyForCalls') : t('connecting')}
                    </span>
                    {otherUserOnline ? <span className="text-green-600">• Online</span> : <span className="text-gray-400">• Offline</span>}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={refreshConnection} className="p-2.5 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"><RefreshCw size={18} className={!isSupabaseConnected || !isPeerReady ? 'animate-spin' : ''} /></button>
                <button onClick={() => handleStartCall('video')} disabled={!isSupabaseConnected || !isPeerReady || callStatus !== 'idle'} className={`p-2.5 rounded-full transition-colors ${!isSupabaseConnected || !isPeerReady || callStatus !== 'idle' ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'}`} title={t('videoCall')}><Video size={20} /></button>
                <button onClick={() => handleStartCall('audio')} disabled={!isSupabaseConnected || !isPeerReady || callStatus !== 'idle'} className={`p-2.5 rounded-full transition-colors ${!isSupabaseConnected || !isPeerReady || callStatus !== 'idle' ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'}`} title={t('audioCall')}><Phone size={20} /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#f9f9f9]">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender_id === currentUser.id ? 'justify-end' : 'justify-start'} items-end gap-2`}>
                  <div className={`max-w-[75%] px-4 py-2 rounded-2xl text-[15px] shadow-sm ${msg.sender_id === currentUser.id ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white text-gray-800 rounded-bl-none border border-gray-100'}`}>
                    {msg.content}
                    <div className={`text-[10px] mt-1 ${msg.sender_id === currentUser.id ? 'text-blue-100' : 'text-gray-400'}`}>{formatTime(msg.created_at)}</div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <MessageSquare size={64} className="mb-4 opacity-20" />
            <p>Select a conversation to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
}
