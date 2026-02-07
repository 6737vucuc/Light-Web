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

// PeerJS will be imported dynamically to avoid SSR issues
let Peer: any;
if (typeof window !== 'undefined') {
  import('peerjs').then(module => {
    Peer = module.default;
  });
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
          const existingConv = convs.find((c: any) => c.other_user_id === targetUserId);
          if (existingConv) {
            setSelectedConversation(existingConv);
          } else {
            try {
              const userRes = await fetch(`/api/users/${targetUserId}`);
              if (userRes.ok) {
                const userData = await userRes.json();
                const tempConv = {
                  other_user_id: targetUserId,
                  name: userData.user.name,
                  avatar: userData.user.avatar,
                  is_online: false,
                  last_message: null,
                  last_message_time: null
                };
                setSelectedConversation(tempConv);
              }
            } catch (err) { console.error('Error fetching target user:', err); }
          }
        }
        setIsLoading(false);
      }
    } catch (error) { console.error(error); }
  }, [selectedConversation]);

  useEffect(() => {
    if (!currentUser?.id) return;
    loadConversations(initialUserId);
  }, [currentUser?.id, initialUserId, loadConversations]);

  // Load Messages when conversation selected
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

    // Subscribe to real-time messages for this user
    const channel = supabase.channel(`user-${currentUser.id}`, {
      config: { broadcast: { self: true } }
    });

    channel
      .on('broadcast', { event: 'private-message' }, ({ payload }) => {
        const msg = payload.message;
        if (msg.sender_id === selectedConversation.other_user_id || msg.receiver_id === selectedConversation.other_user_id) {
          setMessages(prev => {
            if (prev.find(m => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          scrollToBottom();
          
          // Mark as read if we are the receiver
          if (msg.receiver_id === currentUser.id) {
            fetch(`/api/direct-messages/${selectedConversation.other_user_id}/read`, { method: 'POST' });
          }
        }
        // Update conversations list
        loadConversations();
      })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.userId === selectedConversation.other_user_id) {
          setOtherUserTyping(payload.isTyping);
        }
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
      .on('broadcast', { event: 'call-accepted' }, ({ payload }) => {
        if (payload.receiverId === currentUser.id) {
          setCallStatus('connected');
        }
      })
      .on('broadcast', { event: 'call-ended' }, ({ payload }) => {
        if (payload.receiverId === currentUser.id) {
          handleEndCall();
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [selectedConversation, currentUser.id, loadConversations]);

  // PeerJS Initialization
  useEffect(() => {
    if (typeof window === 'undefined' || !currentUser?.id) return;
    
    let peerInstance: any = null;
    let retryCount = 0;
    const maxRetries = 5;

    const initPeer = async () => {
      if (typeof window === 'undefined') return;
      if (!Peer) {
        try {
          const module = await import('peerjs');
          Peer = module.default;
        } catch (err) { return; }
      }

      if (peerRef.current && !peerRef.current.destroyed && !peerRef.current.disconnected) return;

      const peerIdToUse = `signal-user-${currentUser.id}${retryCount > 0 ? `-${Math.floor(Math.random() * 1000)}` : ''}`;
      const peer = new Peer(peerIdToUse, {
        debug: 1,
        secure: true,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' }
          ]
        }
      });

      peer.on('open', async (id: string) => {
        setPeerId(id);
        peerRef.current = peer;
        peerInstance = peer;
        retryCount = 0;
        await supabase.from('users').update({ current_peer_id: id }).eq('id', currentUser.id);
      });

      peer.on('call', async (call: any) => {
        currentCallRef.current = call;
        if (localStreamRef.current) {
          call.answer(localStreamRef.current);
          setupCallEvents(call);
        }
      });

      peer.on('error', (err: any) => {
        if ((err.type === 'unavailable-id' || err.type === 'network') && retryCount < maxRetries) {
          retryCount++;
          setTimeout(initPeer, 2000);
        }
      });

      peerInstance = peer;
    };

    initPeer();

    return () => {
      if (currentUser?.id) {
        supabase.from('users').update({ current_peer_id: null }).eq('id', currentUser.id);
      }
      if (peerInstance) peerInstance.destroy();
    };
  }, [currentUser?.id]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleTyping = (e: any) => {
    setNewMessage(e.target.value);
    if (!isTyping) {
      setIsTyping(true);
      channelRef.current?.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId: currentUser.id, isTyping: true }
      });
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      channelRef.current?.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId: currentUser.id, isTyping: false }
      });
    }, 2000);
  };

  const sendMessage = async (e?: any) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || isSending) return;

    setIsSending(true);
    const content = newMessage.trim();
    setNewMessage('');

    try {
      const res = await fetch('/api/direct-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId: selectedConversation.other_user_id,
          content,
          messageType: 'text'
        })
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, data.message]);
        scrollToBottom();
        loadConversations();
      }
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleStartCall = async (type: 'audio' | 'video' = 'audio') => {
    if (!selectedConversation) return;
    setCallOtherUser({ name: selectedConversation.name, avatar: selectedConversation.avatar });
    setCallStatus('calling');
    setCallType(type);

    try {
      if (!Peer && typeof window !== 'undefined') {
        const module = await import('peerjs');
        Peer = module.default;
      }

      if (!peerRef.current || peerRef.current.destroyed) {
        toast.error('Connection not ready');
        setCallStatus('idle');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: type === 'video' 
      });
      localStreamRef.current = stream;

      const { data: receiverData } = await supabase
        .from('users')
        .select('current_peer_id')
        .eq('id', selectedConversation.other_user_id)
        .single();

      if (!receiverData?.current_peer_id) {
        throw new Error('User is offline');
      }

      await fetch('/api/calls/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId: selectedConversation.other_user_id,
          callerPeerId: peerId,
          callerName: currentUser.name,
          callerAvatar: currentUser.avatar,
          callType: type
        })
      });

      const call = peerRef.current.call(receiverData.current_peer_id, stream);
      currentCallRef.current = call;
      setupCallEvents(call);

    } catch (err: any) {
      toast.error(err.message || 'Call failed');
      handleEndCall();
    }
  };

  const handleAcceptCall = async () => {
    const callerId = (window as any).incomingCallerId;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: callType === 'video' 
      });
      localStreamRef.current = stream;
      
      if (currentCallRef.current) {
        currentCallRef.current.answer(stream);
        setupCallEvents(currentCallRef.current);
      }
      
      await fetch('/api/calls/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId: callerId, receiverPeerId: peerId })
      });
      
      setCallStatus('connected');
    } catch (err: any) {
      toast.error('Could not connect');
      handleEndCall();
    }
  };

  const handleEndCall = () => {
    if (currentCallRef.current) currentCallRef.current.close();
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    setCallStatus('idle');
    currentCallRef.current = null;
  };

  const setupCallEvents = (call: any) => {
    call.on('stream', (remoteStream: MediaStream) => {
      console.log('[SignalCall] Received remote stream');
      
      // Wait for DOM to update if callType is video
      setTimeout(() => {
        if (callType === 'video') {
          const remoteVideo = document.getElementById('remoteVideo') as HTMLVideoElement;
          const localVideo = document.getElementById('localVideo') as HTMLVideoElement;
          
          if (remoteVideo) {
            remoteVideo.srcObject = remoteStream;
            remoteVideo.play().catch(console.error);
          }
          if (localVideo && localStreamRef.current) {
            localVideo.srcObject = localStreamRef.current;
            localVideo.play().catch(console.error);
          }
        } else {
          if (!remoteAudioRef.current) remoteAudioRef.current = new Audio();
          remoteAudioRef.current.srcObject = remoteStream;
          remoteAudioRef.current.play().catch(console.error);
        }
      }, 500);
    });
    call.on('close', () => handleEndCall());
    call.on('error', () => handleEndCall());
  };

  const getAvatarUrl = (avatar?: string | null) => {
    if (!avatar) return '/default-avatar.png';
    if (avatar.startsWith('data:') || avatar.startsWith('http')) return avatar;
    return `https://neon-image-bucket.s3.us-east-1.amazonaws.com/${avatar}`;
  };

  const formatTime = (date: any) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleTimeString(locale === 'ar' ? 'ar-SA' : 'en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const filteredConversations = conversations.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-full bg-white overflow-hidden font-sans text-[#1b1b1b]">
      {/* Sidebar - Signal Style */}
      <div className={`w-full md:w-[350px] flex-shrink-0 border-r border-gray-100 flex flex-col ${selectedConversation && 'hidden md:flex'}`}>
        {/* Sidebar Header */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg overflow-hidden">
              {currentUser.avatar ? (
                <Image src={getAvatarUrl(currentUser.avatar)} alt={currentUser.name} width={40} height={40} className="object-cover" unoptimized />
              ) : currentUser.name.charAt(0)}
            </div>
            <h1 className="text-xl font-bold tracking-tight">Signal</h1>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors"><Search size={20} /></button>
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors"><MoreVertical size={20} /></button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-4 mb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Search" 
              className="w-full bg-gray-100 border-none rounded-full py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2">
              <Loader2 className="animate-spin text-blue-600" />
              <p className="text-xs text-gray-400">Loading chats...</p>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="text-gray-300" />
              </div>
              <p className="text-sm text-gray-500 font-medium">No conversations yet</p>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <button
                key={conv.other_user_id}
                onClick={() => setSelectedConversation(conv)}
                className={`w-full p-3 flex items-center gap-3 hover:bg-gray-50 transition-colors relative ${selectedConversation?.other_user_id === conv.other_user_id ? 'bg-blue-50/50' : ''}`}
              >
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
                    <p className="text-sm text-gray-500 truncate pr-4">
                      {conv.last_message || 'Start a conversation'}
                    </p>
                    {conv.unread_count > 0 && (
                      <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px]">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Area - Signal Style */}
      <div className={`flex-1 flex flex-col bg-white ${!selectedConversation && 'hidden md:flex'}`}>
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="h-16 border-b border-gray-100 flex items-center justify-between px-4 flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <button onClick={() => setSelectedConversation(null)} className="md:hidden p-2 -ml-2 hover:bg-gray-100 rounded-full">
                  <ArrowLeft size={20} />
                </button>
                <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                  <Image src={getAvatarUrl(selectedConversation.avatar)} alt={selectedConversation.name} width={40} height={40} className="object-cover" unoptimized />
                </div>
                <div className="min-w-0">
                  <h2 className="font-bold text-[15px] truncate">{selectedConversation.name}</h2>
                  <p className="text-[11px] text-gray-500 font-medium">
                    {otherUserTyping ? (
                      <span className="text-blue-600 animate-pulse">typing...</span>
                    ) : otherUserOnline ? (
                      <span className="text-green-600">Online</span>
                    ) : otherUserLastSeen ? (
                      `Last seen ${formatTime(otherUserLastSeen)}`
                    ) : 'Offline'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => handleStartCall('video')} className="p-2.5 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"><Video size={20} /></button>
                <button onClick={() => handleStartCall('audio')} className="p-2.5 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"><Phone size={20} /></button>
                <button className="p-2.5 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"><Search size={20} /></button>
                <button className="p-2.5 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"><MoreVertical size={20} /></button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#f9f9f9]">
              <div className="flex justify-center mb-6">
                <div className="bg-blue-50 text-blue-700 text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5 border border-blue-100">
                  <Lock size={10} /> Signal Encrypted
                </div>
              </div>

              {messages.map((msg, idx) => {
                const isMe = msg.sender_id === currentUser.id;
                const showAvatar = !isMe && (idx === 0 || messages[idx-1].sender_id !== msg.sender_id);
                
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} items-end gap-2`}>
                    {!isMe && (
                      <div className="w-7 h-7 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 mb-1">
                        {showAvatar && <Image src={getAvatarUrl(selectedConversation.avatar)} alt="" width={28} height={28} className="object-cover" unoptimized />}
                      </div>
                    )}
                    <div className={`max-w-[75%] group relative`}>
                      <div className={`px-4 py-2.5 rounded-[20px] text-[15px] leading-relaxed shadow-sm ${
                        isMe 
                          ? 'bg-blue-600 text-white rounded-br-none' 
                          : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
                      }`}>
                        {msg.content}
                      </div>
                      <div className={`flex items-center gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <span className="text-[10px] text-gray-400 font-medium">{formatTime(msg.created_at)}</span>
                        {isMe && (
                          msg.is_read ? <CheckCheck size={12} className="text-blue-500" /> : <Check size={12} className="text-gray-300" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-white border-t border-gray-100">
              <form onSubmit={sendMessage} className="flex items-end gap-2 max-w-4xl mx-auto">
                <div className="flex-1 bg-gray-100 rounded-[24px] flex items-end p-1.5 min-h-[44px]">
                  <button type="button" className="p-2 text-gray-500 hover:bg-gray-200 rounded-full transition-colors"><Smile size={22} /></button>
                  <textarea 
                    rows={1}
                    placeholder="Signal message"
                    className="flex-1 bg-transparent border-none focus:ring-0 outline-none py-2 px-2 text-[15px] resize-none max-h-32"
                    value={newMessage}
                    onChange={handleTyping}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                  />
                  <button type="button" className="p-2 text-gray-500 hover:bg-gray-200 rounded-full transition-colors"><Paperclip size={22} /></button>
                  <button type="button" className="p-2 text-gray-500 hover:bg-gray-200 rounded-full transition-colors"><Camera size={22} /></button>
                </div>
                {newMessage.trim() ? (
                  <button 
                    type="submit"
                    className="w-11 h-11 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-all shadow-md active:scale-95"
                  >
                    <Send size={20} className={isRtl ? 'rotate-180' : ''} />
                  </button>
                ) : (
                  <button 
                    type="button"
                    className="w-11 h-11 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center hover:bg-gray-200 transition-all"
                  >
                    <Mic size={22} />
                  </button>
                )}
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#f9f9f9]">
            <div className="w-24 h-24 bg-blue-600 rounded-3xl flex items-center justify-center text-white shadow-2xl mb-8 transform rotate-12">
              <MessageSquare size={48} />
            </div>
            <h2 className="text-2xl font-bold mb-2">Signal for Web</h2>
            <p className="text-gray-500 max-w-xs mx-auto text-sm leading-relaxed">
              Select a conversation to start messaging securely with your friends.
            </p>
            <div className="mt-10 flex gap-4">
              <div className="flex flex-col items-center gap-1">
                <div className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center text-blue-600"><Shield size={20} /></div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Secure</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center text-blue-600"><Lock size={20} /></div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Private</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center text-blue-600"><Ghost size={20} /></div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Fast</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Call Overlay */}
      <CallOverlay 
        callStatus={callStatus}
        otherUser={callOtherUser}
        onAccept={handleAcceptCall}
        onReject={handleEndCall}
        onEnd={handleEndCall}
      />
    </div>
  );
}
