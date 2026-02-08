'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send, ArrowLeft, MoreVertical, Phone, Video,
  Search, Smile, Paperclip, Mic, Check, CheckCheck,
  MessageSquare, Loader2, Shield, Lock, Ghost,
  Camera, RefreshCw, Wifi, WifiOff, Volume2, VolumeX,
  Users, PhoneOff, PhoneIncoming, PhoneMissed, User, Clock,
  X, CheckCircle, Radio, VideoOff, MicOff
} from 'lucide-react';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/lib/contexts/ToastContext';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabase/client';

// Types
interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  online?: boolean;
  last_seen?: string;
  peer_id?: string;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  type: 'text' | 'image' | 'video' | 'audio';
  media_url?: string;
  read: boolean;
  created_at: string;
  sender?: UserProfile;
}

interface Call {
  id: string;
  caller_id: string;
  receiver_id: string;
  caller_peer_id: string;
  receiver_peer_id?: string;
  type: 'audio' | 'video';
  status: 'pending' | 'ringing' | 'answered' | 'rejected' | 'ended';
  started_at?: string;
  ended_at?: string;
}

interface SignalMessengerProps {
  currentUser: UserProfile;
  initialConversationId?: string;
  fullPage?: boolean;
  onBack?: () => void;
}

// WebRTC ICE Servers (مجانية)
const ICE_SERVERS = [
  // STUN servers
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
  { urls: 'stun:global.stun.twilio.com:3478' },
  
  // TURN servers (مجانية)
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  },
  {
    urls: 'turn:numb.viagenie.ca',
    credential: 'muazkh',
    username: 'webrtc@live.com'
  },
  {
    urls: 'turn:turn.bistri.com:80',
    credential: 'homeo',
    username: 'homeo'
  }
];

export default function SignalMessenger({ 
  currentUser, 
  initialConversationId, 
  fullPage = false, 
  onBack 
}: SignalMessengerProps) {
  const router = useRouter();
  const params = useParams();
  const locale = params?.locale as string || 'ar';
  const isRtl = locale === 'ar';
  const t = useTranslations('messages');
  const toast = useToast();
  
  // States
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [otherUserOnline, setOtherUserOnline] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  
  // Call States
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'incoming' | 'connected' | 'ended'>('idle');
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');
  const [callPeer, setCallPeer] = useState<string | null>(null);
  const [peerId, setPeerId] = useState<string | null>(null);
  const [isPeerReady, setIsPeerReady] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [incomingCall, setIncomingCall] = useState<any>(null);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callDurationRef = useRef<NodeJS.Timeout | null>(null);
  const peerRef = useRef<any>(null);
  const currentCallRef = useRef<any>(null);
  const channelRef = useRef<any>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const messageIds = useRef<Set<string>>(new Set());
  
  // ==================== PEERJS SETUP ====================
  
  const initializePeer = useCallback(async () => {
    if (typeof window === 'undefined' || !currentUser?.id) return;
    
    try {
      // Dynamic import for PeerJS
      const PeerJS = (await import('peerjs')).default;
      
      // Generate unique peer ID
      const peerId = `signal-${currentUser.id}-${Date.now()}`;
      
      // Create peer with free STUN/TURN servers
      const peer = new PeerJS(peerId, {
        host: '0.peerjs.com',
        port: 443,
        path: '/',
        secure: true,
        debug: 2,
        config: { iceServers: ICE_SERVERS }
      });
      
      peer.on('open', async (id: string) => {
        console.log('✅ Peer connected with ID:', id);
        setPeerId(id);
        peerRef.current = peer;
        setIsPeerReady(true);
        
        // Update user's peer ID in database
        await supabase
          .from('profiles')
          .update({ peer_id: id, online: true })
          .eq('id', currentUser.id);
      });
      
      peer.on('call', (call: any) => {
        console.log('📞 Incoming call from:', call.peer);
        setIncomingCall(call);
        setCallStatus('incoming');
      });
      
      peer.on('error', (err: any) => {
        console.error('❌ Peer error:', err);
        setIsPeerReady(false);
      });
      
      peer.on('disconnected', () => {
        console.log('🔌 Peer disconnected');
        setIsPeerReady(false);
      });
      
      peerRef.current = peer;
      
    } catch (error) {
      console.error('❌ Failed to initialize PeerJS:', error);
      toast.error('Failed to initialize call system');
    }
  }, [currentUser?.id, toast]);
  
  // Initialize peer on mount
  useEffect(() => {
    initializePeer();
    
    return () => {
      if (peerRef.current) {
        peerRef.current.destroy();
      }
    };
  }, [initializePeer]);
  
  // ==================== LOAD CONVERSATIONS ====================
  
  const loadConversations = useCallback(async () => {
    if (!currentUser?.id) return;
    
    try {
      setIsLoading(true);
      
      // Fetch conversations from your API
      const res = await fetch(`/api/messages/conversations?userId=${currentUser.id}`);
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.id]);
  
  // ==================== LOAD MESSAGES ====================
  
  const loadMessages = useCallback(async (userId: string) => {
    if (!currentUser?.id || !userId) return;
    
    try {
      // Fetch messages between current user and selected user
      const res = await fetch(`/api/messages?userId=${currentUser.id}&otherUserId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        scrollToBottom();
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  }, [currentUser?.id]);
  
  // ==================== REAL-TIME SUBSCRIPTION ====================
  
  useEffect(() => {
    if (!currentUser?.id || !selectedUser?.id) return;
    
    // Subscribe to real-time messages
    const channel = supabase.channel(`messages-${currentUser.id}-${selectedUser.id}`, {
      config: {
        broadcast: { self: true }
      }
    });
    
    channel
      .on('broadcast', { event: 'new-message' }, ({ payload }) => {
        const message = payload.message;
        if (
          (message.sender_id === selectedUser.id && message.receiver_id === currentUser.id) ||
          (message.receiver_id === selectedUser.id && message.sender_id === currentUser.id)
        ) {
          setMessages(prev => [...prev, message]);
          scrollToBottom();
        }
      })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.userId === selectedUser.id) {
          setOtherUserTyping(payload.isTyping);
        }
      })
      .on('broadcast', { event: 'incoming-call' }, ({ payload }) => {
        if (payload.receiverId === currentUser.id) {
          setIncomingCall(payload);
          setCallStatus('incoming');
          setCallType(payload.callType);
          setCallPeer(payload.callerPeerId);
        }
      })
      .subscribe();
    
    channelRef.current = channel;
    
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [currentUser?.id, selectedUser?.id]);
  
  // ==================== CALL FUNCTIONS ====================
  
  const startCall = async (type: 'audio' | 'video') => {
    if (!selectedUser || !peerRef.current || !isPeerReady) {
      toast.error('Call system not ready');
      return;
    }
    
    try {
      setCallType(type);
      setCallStatus('calling');
      
      // Get media stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video'
      });
      localStreamRef.current = stream;
      
      // Get receiver's peer ID
      const { data: receiver } = await supabase
        .from('profiles')
        .select('peer_id')
        .eq('id', selectedUser.id)
        .single();
      
      if (!receiver?.peer_id) {
        toast.error('User is not available for calls');
        return;
      }
      
      // Send call notification
      await channelRef.current.send({
        type: 'broadcast',
        event: 'incoming-call',
        payload: {
          callerId: currentUser.id,
          callerPeerId: peerId,
          receiverId: selectedUser.id,
          callType: type,
          callerName: currentUser.name,
          callerAvatar: currentUser.avatar_url
        }
      });
      
      // Start call
      const call = peerRef.current.call(receiver.peer_id, stream);
      currentCallRef.current = call;
      
      call.on('stream', (remoteStream: MediaStream) => {
        if (type === 'video') {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
          }
        } else {
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = remoteStream;
            remoteAudioRef.current.play();
          }
        }
        setCallStatus('connected');
        startCallTimer();
      });
      
      call.on('close', () => {
        endCall();
      });
      
      // Call timeout
      setTimeout(() => {
        if (callStatus === 'calling') {
          toast.error('Call timed out');
          endCall();
        }
      }, 30000);
      
    } catch (error: any) {
      console.error('Call error:', error);
      toast.error(error.message || 'Call failed');
      endCall();
    }
  };
  
  const answerCall = async () => {
    if (!incomingCall) return;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === 'video'
      });
      localStreamRef.current = stream;
      
      incomingCall.answer(stream);
      currentCallRef.current = incomingCall;
      
      incomingCall.on('stream', (remoteStream: MediaStream) => {
        if (callType === 'video') {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
          }
        } else {
          if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = remoteStream;
            remoteAudioRef.current.play();
          }
        }
        setCallStatus('connected');
        startCallTimer();
      });
      
      setIncomingCall(null);
      
    } catch (error) {
      console.error('Answer call error:', error);
      toast.error('Failed to answer call');
      endCall();
    }
  };
  
  const endCall = () => {
    if (currentCallRef.current) {
      currentCallRef.current.close();
    }
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    setCallStatus('idle');
    setCallDuration(0);
    setIncomingCall(null);
    
    if (callDurationRef.current) {
      clearInterval(callDurationRef.current);
    }
  };
  
  const startCallTimer = () => {
    if (callDurationRef.current) clearInterval(callDurationRef.current);
    
    callDurationRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };
  
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };
  
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOn(videoTrack.enabled);
      }
    }
  };
  
  // ==================== MESSAGE FUNCTIONS ====================
  
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser || isSending) return;
    
    setIsSending(true);
    
    try {
      const message = {
        sender_id: currentUser.id,
        receiver_id: selectedUser.id,
        content: newMessage.trim(),
        type: 'text' as const,
        read: false,
        created_at: new Date().toISOString()
      };
      
      // Send via API
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      });
      
      if (res.ok) {
        const savedMessage = await res.json();
        setMessages(prev => [...prev, savedMessage]);
        setNewMessage('');
        scrollToBottom();
        
        // Send real-time notification
        channelRef.current?.send({
          type: 'broadcast',
          event: 'new-message',
          payload: { message: savedMessage }
        });
      }
    } catch (error) {
      console.error('Send message error:', error);
      toast.error('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const handleTyping = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
    
    // Send typing indicator
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
  
  // ==================== UI RENDER ====================
  
  const getAvatarUrl = (avatar?: string) => {
    if (!avatar) return '/default-avatar.png';
    if (avatar.startsWith('http')) return avatar;
    return `https://lzqyucohnjtubivlmdkw.supabase.co/storage/v1/object/public/avatars/${avatar}`;
  };
  
  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };
  
  const formatCallDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);
  
  return (
    <div className="flex h-full bg-white overflow-hidden">
      {/* Sidebar */}
      <div className={`w-full md:w-80 border-r flex flex-col ${selectedUser ? 'hidden md:flex' : ''}`}>
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">Messages</h1>
            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-gray-100 rounded-full">
                <Users size={20} />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-full">
                <MoreVertical size={20} />
              </button>
            </div>
          </div>
          
          {/* Connection Status */}
          <div className={`mt-4 flex items-center gap-2 px-3 py-2 rounded-lg ${isPeerReady ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
            {isPeerReady ? <Wifi size={16} /> : <WifiOff size={16} />}
            <span className="text-sm">
              {isPeerReady ? 'Call ready' : 'Connecting...'}
            </span>
            <button 
              onClick={initializePeer}
              className="ml-auto"
              title="Refresh connection"
            >
              <RefreshCw size={14} className={!isPeerReady ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
        
        {/* Search */}
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search messages"
              className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="animate-spin text-blue-500" size={24} />
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-10">
              <MessageSquare className="mx-auto text-gray-300 mb-2" size={48} />
              <p className="text-gray-500">No conversations yet</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                className={`p-4 border-b hover:bg-gray-50 cursor-pointer ${selectedUser?.id === conv.other_user?.id ? 'bg-blue-50' : ''}`}
                onClick={() => {
                  setSelectedUser(conv.other_user);
                  loadMessages(conv.other_user.id);
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={getAvatarUrl(conv.other_user?.avatar_url)}
                      alt={conv.other_user?.name}
                      className="w-12 h-12 rounded-full"
                    />
                    {conv.other_user?.online && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <h3 className="font-semibold truncate">{conv.other_user?.name}</h3>
                      <span className="text-xs text-gray-500">
                        {conv.last_message_at ? formatTime(conv.last_message_at) : ''}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 truncate">
                      {conv.last_message || 'Start a conversation'}
                    </p>
                  </div>
                  {conv.unread_count > 0 && (
                    <span className="bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                      {conv.unread_count}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* Chat Area */}
      <div className={`flex-1 flex flex-col ${!selectedUser ? 'hidden md:flex' : ''}`}>
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedUser(null)}
                  className="md:hidden"
                >
                  <ArrowLeft size={20} />
                </button>
                <img
                  src={getAvatarUrl(selectedUser.avatar_url)}
                  alt={selectedUser.name}
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <h2 className="font-semibold">{selectedUser.name}</h2>
                  <p className="text-sm text-gray-500">
                    {otherUserTyping ? (
                      <span className="text-blue-500">typing...</span>
                    ) : selectedUser.online ? (
                      <span className="text-green-500">Online</span>
                    ) : (
                      selectedUser.last_seen ? `Last seen ${formatTime(selectedUser.last_seen)}` : 'Offline'
                    )}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => startCall('video')}
                  disabled={!isPeerReady || callStatus !== 'idle'}
                  className={`p-2 rounded-full ${!isPeerReady || callStatus !== 'idle' ? 'text-gray-300' : 'text-gray-600 hover:bg-gray-100'}`}
                  title="Video call"
                >
                  <Video size={20} />
                </button>
                <button
                  onClick={() => startCall('audio')}
                  disabled={!isPeerReady || callStatus !== 'idle'}
                  className={`p-2 rounded-full ${!isPeerReady || callStatus !== 'idle' ? 'text-gray-300' : 'text-gray-600 hover:bg-gray-100'}`}
                  title="Voice call"
                >
                  <Phone size={20} />
                </button>
              </div>
            </div>
            
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender_id === currentUser.id ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-2 ${msg.sender_id === currentUser.id ? 'bg-blue-500 text-white rounded-br-none' : 'bg-gray-100 text-gray-800 rounded-bl-none'}`}
                  >
                    <p>{msg.content}</p>
                    <div className={`text-xs mt-1 flex items-center gap-1 ${msg.sender_id === currentUser.id ? 'text-blue-200' : 'text-gray-500'}`}>
                      <span>{formatTime(msg.created_at)}</span>
                      {msg.sender_id === currentUser.id && (
                        msg.read ? <CheckCheck size={12} /> : <Check size={12} />
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            
            {/* Message Input */}
            <div className="p-4 border-t">
              <form onSubmit={sendMessage} className="flex gap-2">
                <div className="flex-1 flex items-end bg-gray-100 rounded-2xl p-2">
                  <button type="button" className="p-2 text-gray-500">
                    <Smile size={20} />
                  </button>
                  <textarea
                    value={newMessage}
                    onChange={handleTyping}
                    placeholder="Type a message..."
                    className="flex-1 bg-transparent border-none focus:outline-none resize-none py-2 px-2 max-h-32"
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage(e as any);
                      }
                    }}
                  />
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    accept="image/*,video/*"
                  />
                  <label htmlFor="file-upload" className="p-2 text-gray-500 cursor-pointer">
                    <Paperclip size={20} />
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={!newMessage.trim() || isSending}
                  className={`p-3 rounded-full ${!newMessage.trim() ? 'bg-gray-100 text-gray-400' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
                >
                  {isSending ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <Send size={20} />
                  )}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <MessageSquare className="text-blue-500" size={48} />
            </div>
            <h2 className="text-2xl font-bold mb-2">Your Messages</h2>
            <p className="text-gray-500 mb-6">Select a conversation to start messaging</p>
            <div className="flex gap-4">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Shield className="text-blue-500" size={24} />
                </div>
                <span className="text-xs font-medium text-gray-500">Secure</span>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Lock className="text-blue-500" size={24} />
                </div>
                <span className="text-xs font-medium text-gray-500">Private</span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Call Overlay */}
      {callStatus !== 'idle' && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
          <div className="bg-gray-900 rounded-2xl p-8 max-w-md w-full mx-4">
            <div className="text-center mb-8">
              <div className="w-24 h-24 bg-gray-800 rounded-full mx-auto mb-4 flex items-center justify-center">
                {callOtherUser?.avatar ? (
                  <img
                    src={getAvatarUrl(callOtherUser.avatar)}
                    alt={callOtherUser.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <User className="text-white" size={48} />
                )}
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                {callStatus === 'incoming' ? 'Incoming Call' : callStatus === 'calling' ? 'Calling...' : callOtherUser?.name}
              </h3>
              <p className="text-gray-300">
                {callStatus === 'connected' ? formatCallDuration(callDuration) : callType === 'video' ? 'Video Call' : 'Voice Call'}
              </p>
            </div>
            
            <div className="flex justify-center gap-4">
              {callStatus === 'incoming' && (
                <>
                  <button
                    onClick={endCall}
                    className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600"
                  >
                    <PhoneOff className="text-white" size={24} />
                  </button>
                  <button
                    onClick={answerCall}
                    className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center hover:bg-green-600"
                  >
                    <Phone className="text-white" size={24} />
                  </button>
                </>
              )}
              
              {callStatus === 'calling' && (
                <button
                  onClick={endCall}
                  className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600"
                >
                  <PhoneOff className="text-white" size={24} />
                </button>
              )}
              
              {callStatus === 'connected' && (
                <>
                  <button
                    onClick={toggleMute}
                    className={`w-14 h-14 rounded-full flex items-center justify-center ${isMuted ? 'bg-red-500' : 'bg-gray-700'}`}
                  >
                    {isMuted ? <MicOff className="text-white" size={20} /> : <Mic className="text-white" size={20} />}
                  </button>
                  {callType === 'video' && (
                    <button
                      onClick={toggleVideo}
                      className={`w-14 h-14 rounded-full flex items-center justify-center ${!isVideoOn ? 'bg-red-500' : 'bg-gray-700'}`}
                    >
                      {!isVideoOn ? <VideoOff className="text-white" size={20} /> : <Video className="text-white" size={20} />}
                    </button>
                  )}
                  <button
                    onClick={endCall}
                    className="w-14 h-14 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600"
                  >
                    <PhoneOff className="text-white" size={20} />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Hidden video/audio elements */}
      <video
        ref={remoteVideoRef}
        className="hidden"
        autoPlay
        playsInline
      />
      <audio
        ref={remoteAudioRef}
        className="hidden"
        autoPlay
        playsInline
      />
    </div>
  );
}