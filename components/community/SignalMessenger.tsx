'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send, Image as ImageIcon, ArrowLeft, MoreVertical, Phone, Video,
  Search, Smile, Paperclip, Mic, X, Check, CheckCheck, Trash2,
  User as UserIcon, MessageCircle, Loader2, MessageSquare, Shield,
  Info, Camera, Lock, Settings, Bell, Archive, UserPlus, Ghost,
  RefreshCw
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
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Call States
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'incoming' | 'connected' | 'ended'>('idle');
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');
  const [callOtherUser, setCallOtherUser] = useState({ name: '', avatar: '' as string | null });
  const [peerId, setPeerId] = useState<string | null>(null);
  const [isPeerReady, setIsPeerReady] = useState(false);

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

  // Initialize Peer Connection
  const initializePeerConnection = useCallback(async () => {
    if (typeof window === 'undefined' || !currentUser?.id) {
      console.log('[Signal] Cannot initialize: window not defined or no user');
      return null;
    }

    try {
      console.log('[Signal] Starting peer initialization...');
      
      // Load PeerJS if not loaded
      if (!Peer) {
        console.log('[Signal] Loading PeerJS module...');
        const module = await import('peerjs');
        Peer = module.default;
        console.log('[Signal] PeerJS loaded');
      }

      // Destroy existing peer if any
      if (peerRef.current && !peerRef.current.destroyed) {
        console.log('[Signal] Destroying existing peer connection');
        peerRef.current.destroy();
      }

      const peerIdToUse = `signal-${currentUser.id}-${Date.now()}`;
      console.log('[Signal] Creating new peer with ID:', peerIdToUse);
      
      const peer = new Peer(peerIdToUse, {
        debug: 3,
        secure: true,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' },
            // Public TURN servers from Metered.ca
            {
              urls: 'turn:a.relay.metered.ca:80',
              username: 'metered',
              credential: 'metered'
            },
            {
              urls: 'turn:a.relay.metered.ca:443',
              username: 'metered',
              credential: 'metered'
            },
            {
              urls: 'turn:a.relay.metered.ca:443?transport=tcp',
              username: 'metered',
              credential: 'metered'
            }
          ],
          iceCandidatePoolSize: 10,
          iceTransportPolicy: 'all'
        }
      });

      return new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Peer connection timeout (10s)'));
        }, 10000);

        peer.on('open', async (id: string) => {
          clearTimeout(timeout);
          console.log('[Signal] Peer connection opened with ID:', id);
          setPeerId(id);
          peerRef.current = peer;
          setIsPeerReady(true);
          
          // Update user's peer ID in database
          try {
            await supabase
              .from('users')
              .update({ current_peer_id: id })
              .eq('id', currentUser.id);
            console.log('[Signal] Updated peer ID in database');
          } catch (dbError) {
            console.error('[Signal] Error updating database:', dbError);
          }
          
          resolve(id);
        });

        peer.on('call', (call: any) => {
          console.log('[Signal] Incoming call received');
          currentCallRef.current = call;
          // Don't answer automatically - wait for user to accept
        });

        peer.on('error', (err: any) => {
          console.error('[Signal] Peer error:', err);
          clearTimeout(timeout);
          
          if (err.type === 'unavailable-id') {
            // Try again with different ID
            console.log('[Signal] Peer ID unavailable, will retry...');
            setTimeout(() => initializePeerConnection(), 1000);
          }
          
          reject(err);
        });

        peer.on('disconnected', () => {
          console.log('[Signal] Peer disconnected');
          setIsPeerReady(false);
        });

        peer.on('close', () => {
          console.log('[Signal] Peer connection closed');
          setIsPeerReady(false);
        });
      });
    } catch (error) {
      console.error('[Signal] Failed to initialize peer:', error);
      toast.error('Failed to initialize connection');
      setIsPeerReady(false);
      throw error;
    }
  }, [currentUser?.id, toast]);

  // Initialize peer connection on mount
  useEffect(() => {
    if (!currentUser?.id || typeof window === 'undefined') return;

    console.log('[Signal] Initializing peer connection for user:', currentUser.id);
    
    initializePeerConnection().catch(error => {
      console.error('[Signal] Initial peer initialization failed:', error);
    });

    return () => {
      console.log('[Signal] Cleaning up peer connection');
      if (peerRef.current && !peerRef.current.destroyed) {
        peerRef.current.destroy();
      }
      if (currentUser?.id) {
        supabase.from('users').update({ current_peer_id: null }).eq('id', currentUser.id);
      }
    };
  }, [currentUser?.id, initializePeerConnection]);

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
          console.log('[Signal] Received incoming call broadcast:', payload);
          
          // Ensure peer is ready
          if (!isPeerReady) {
            console.log('[Signal] Peer not ready, initializing...');
            toast.info('Setting up connection for incoming call...');
            initializePeerConnection().then(() => {
              setCallOtherUser({ 
                name: payload.callerName, 
                avatar: payload.callerAvatar 
              });
              setCallStatus('incoming');
              setCallType(payload.callType || 'audio');
              (window as any).incomingPeerId = payload.callerPeerId;
              (window as any).incomingCallerId = payload.callerId;
              console.log('[Signal] Call setup complete');
            }).catch(err => {
              console.error('[Signal] Failed to initialize peer for incoming call:', err);
              toast.error('Failed to accept call - connection error');
            });
          } else {
            setCallOtherUser({ 
              name: payload.callerName, 
              avatar: payload.callerAvatar 
            });
            setCallStatus('incoming');
            setCallType(payload.callType || 'audio');
            (window as any).incomingPeerId = payload.callerPeerId;
            (window as any).incomingCallerId = payload.callerId;
            console.log('[Signal] Incoming call set up');
          }
        }  
      })  
      .on('broadcast', { event: 'call-accepted' }, ({ payload }) => {  
        if (payload.receiverId === currentUser.id) {  
          console.log('[Signal] Call accepted by other user');
          setCallStatus('connected');  
        }  
      })  
      .on('broadcast', { event: 'call-ended' }, ({ payload }) => {  
        if (payload.receiverId === currentUser.id) {  
          console.log('[Signal] Call ended by other user');
          handleEndCall();  
        }  
      })  
      .subscribe();  

    channelRef.current = channel;  

    return () => {  
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        console.log('[Signal] Removed Supabase channel');
      }
    };

  }, [selectedConversation, currentUser.id, loadConversations, isPeerReady, initializePeerConnection, toast]);

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

  const sendMessage = async (e?: any, mediaUrl?: string, mediaType?: string) => {
    if (e) e.preventDefault();
    if (!mediaUrl && (!newMessage.trim() || !selectedConversation || isSending)) return;

    setIsSending(true);  
    const content = mediaUrl ? '' : newMessage.trim();  
    if (!mediaUrl) setNewMessage('');  

    try {  
      const res = await fetch('/api/direct-messages', {  
        method: 'POST',  
        headers: { 'Content-Type': 'application/json' },  
        body: JSON.stringify({  
          receiverId: selectedConversation.other_user_id,  
          content,  
          messageType: mediaType || 'text',  
          mediaUrl: mediaUrl || null  
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConversation) return;

    setIsUploading(true);  
    const formData = new FormData();  
    formData.append('file', file);  

    try {  
      const res = await fetch('/api/upload', {  
        method: 'POST',  
        body: formData  
      });  

      if (res.ok) {  
        const data = await res.json();  
        const type = file.type.startsWith('image/') ? 'image' : 'video';  
        await sendMessage(null, data.url, type);  
        toast.success('File sent successfully');  
      } else {  
        const error = await res.json();  
        toast.error(error.error || 'Upload failed');  
      }  
    } catch (err) {  
      toast.error('Upload failed');  
    } finally {  
      setIsUploading(false);  
      if (fileInputRef.current) fileInputRef.current.value = '';  
    }
  };

  const handleStartCall = async (type: 'audio' | 'video' = 'audio') => {
    if (!selectedConversation) {
      toast.error('No conversation selected');
      return;
    }
    
    console.log('[SignalCall] Starting call with:', selectedConversation.name);
    console.log('[SignalCall] Peer ready:', isPeerReady);
    console.log('[SignalCall] Peer ID:', peerId);
    console.log('[SignalCall] Peer ref:', peerRef.current);
    
    setCallOtherUser({ name: selectedConversation.name, avatar: selectedConversation.avatar });
    setCallStatus('calling');
    setCallType(type);

    try {
      // Check if peer is ready
      if (!isPeerReady || !peerRef.current || peerRef.current.destroyed || !peerId) {
        console.log('[SignalCall] Peer not ready, initializing...');
        toast.info('Setting up secure connection...');
        
        try {
          await initializePeerConnection();
          console.log('[SignalCall] Peer initialized successfully');
        } catch (peerError) {
          console.error('[SignalCall] Failed to initialize peer:', peerError);
          toast.error('Connection failed. Please try again.');
          setCallStatus('idle');
          return;
        }
      }

      // Get user media permissions
      console.log('[SignalCall] Requesting media permissions...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: type === 'video' 
      });
      localStreamRef.current = stream;
      console.log('[SignalCall] Media permissions granted');

      // Get receiver's peer ID from database
      console.log('[SignalCall] Fetching receiver peer ID for user:', selectedConversation.other_user_id);
      const { data: receiverData, error } = await supabase
        .from('users')
        .select('current_peer_id')
        .eq('id', selectedConversation.other_user_id)
        .single();

      if (error || !receiverData?.current_peer_id) {
        console.error('[SignalCall] Receiver not online or peer ID not found:', error);
        toast.error('User is offline or not available for calls');
        handleEndCall();
        return;
      }

      console.log('[SignalCall] Receiver peer ID:', receiverData.current_peer_id);

      // Send call notification via Supabase
      console.log('[SignalCall] Sending call notification...');
      await channelRef.current.send({
        type: 'broadcast',
        event: 'incoming-call',
        payload: {
          receiverId: selectedConversation.other_user_id,
          callerId: currentUser.id,
          callerPeerId: peerId,
          callerName: currentUser.name,
          callerAvatar: currentUser.avatar,
          callType: type
        }
      });

      // Start the call
      console.log('[SignalCall] Initiating call to:', receiverData.current_peer_id);
      const call = peerRef.current.call(receiverData.current_peer_id, stream);
      currentCallRef.current = call;
      setupCallEvents(call);
      console.log('[SignalCall] Call initiated');

      // Set call timeout
      setTimeout(() => {
        if (callStatus === 'calling') {
          console.log('[SignalCall] Call timeout - no answer');
          toast.error('Call timed out. User not answering.');
          handleEndCall();
        }
      }, 45000); // 45 seconds timeout

    } catch (err: any) {
      console.error('[SignalCall] Error during call setup:', err);
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        toast.error('Microphone/camera permission denied. Please allow access.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        toast.error('No microphone/camera found. Please check your device.');
      } else if (err.message && err.message.includes('offline')) {
        toast.error('User is offline. Please try again later.');
      } else {
        toast.error(err.message || 'Call failed. Please try again.');
      }
      
      handleEndCall();
    }
  };

  const handleAcceptCall = async () => {
    console.log('[SignalCall] Accepting incoming call');
    const callerId = (window as any).incomingCallerId;
    const callerPeerId = (window as any).incomingPeerId;
    
    if (!callerPeerId) {
      toast.error('Call information missing');
      handleEndCall();
      return;
    }

    try {
      console.log('[SignalCall] Getting media permissions...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === 'video'
      });
      localStreamRef.current = stream;
      console.log('[SignalCall] Media permissions granted');

      // Check if we have a call object already
      if (currentCallRef.current) {
        console.log('[SignalCall] Answering existing call');
        currentCallRef.current.answer(stream);
        setupCallEvents(currentCallRef.current);
      } else if (peerRef.current && callerPeerId) {
        // If no call object, we might need to call back
        console.log('[SignalCall] No call object, calling back to:', callerPeerId);
        const call = peerRef.current.call(callerPeerId, stream);
        currentCallRef.current = call;
        setupCallEvents(call);
      } else {
        throw new Error('No active call connection');
      }
      
      // Notify caller that call was accepted
      console.log('[SignalCall] Sending call accepted notification');
      await channelRef.current.send({
        type: 'broadcast',
        event: 'call-accepted',
        payload: {
          receiverId: callerId,
          receiverPeerId: peerId
        }
      });
      
      setCallStatus('connected');
      console.log('[SignalCall] Call connected');
      
    } catch (err: any) {
      console.error('[SignalCall] Error accepting call:', err);
      toast.error('Could not connect to call');
      handleEndCall();
    }
  };

  const handleEndCall = useCallback(() => {
    console.log('[SignalCall] Ending call and cleaning up resources');
    
    // Close current call
    if (currentCallRef.current) {
      currentCallRef.current.close();
      currentCallRef.current = null;
    }
    
    // Stop local media stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      localStreamRef.current = null;
    }
    
    // Stop remote audio/video
    if (remoteAudioRef.current) {
      remoteAudioRef.current.pause();
      remoteAudioRef.current.srcObject = null;
    }
    
    if (remoteVideoRef.current) {
      remoteVideoRef.current.pause();
      remoteVideoRef.current.srcObject = null;
    }

    // Notify other user that call ended
    if (selectedConversation) {
      console.log('[SignalCall] Notifying other user call ended');
      channelRef.current?.send({
        type: 'broadcast',
        event: 'call-ended',
        payload: { receiverId: selectedConversation.other_user_id }
      }).catch(console.error);
    }

    setCallStatus('idle');
    console.log('[SignalCall] Call ended');
  }, [selectedConversation]);

  const setupCallEvents = (call: any) => {
    console.log('[SignalCall] Setting up call events');
    
    call.on('stream', (remoteStream: MediaStream) => {
      console.log('[SignalCall] Received remote stream');
      
      setTimeout(() => {
        if (callType === 'video') {
          const remoteVideo = document.getElementById('remoteVideo') as HTMLVideoElement;
          const localVideo = document.getElementById('localVideo') as HTMLVideoElement;
          
          if (remoteVideo) {
            remoteVideo.srcObject = remoteStream;
            remoteVideo.play().catch(console.error);
            console.log('[SignalCall] Remote video stream playing');
          }
          if (localVideo && localStreamRef.current) {
            localVideo.srcObject = localStreamRef.current;
            localVideo.play().catch(console.error);
            console.log('[SignalCall] Local video stream playing');
          }
        } else {
          if (!remoteAudioRef.current) {
            remoteAudioRef.current = new Audio();
          }
          remoteAudioRef.current.srcObject = remoteStream;
          remoteAudioRef.current.play().catch(console.error);
          console.log('[SignalCall] Audio stream playing');
        }
      }, 500);
    });
    
    call.on('close', () => {
      console.log('[SignalCall] Call closed by remote');
      handleEndCall();
    });
    
    call.on('error', (err: any) => {
      console.error('[SignalCall] Call error:', err);
      handleEndCall();
    });
  };

  const getAvatarUrl = (avatar?: string | null) => {
    if (!avatar) return '/default-avatar.png';
    if (avatar.startsWith('data:') || avatar.startsWith('http')) return avatar;
    return `https://neon-image-bucket.s3.us-east-1.amazonaws.com/${avatar}`;
  };

  const formatTime = (date: any) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleTimeString(locale === 'ar' ? 'ar-SA' : 'en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    });
  };

  const refreshConnection = async () => {
    toast.info('Refreshing connection...');
    try {
      await initializePeerConnection();
      toast.success('Connection refreshed successfully');
    } catch (error) {
      toast.error('Failed to refresh connection');
    }
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

        {/* Connections Status */}
        <div className="px-4 mb-3">
          <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${isPeerReady ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
            <div className={`w-2 h-2 rounded-full ${isPeerReady ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></div>
            <span className="font-medium">
              {isPeerReady ? 'Call Ready' : 'Connecting...'}
            </span>
            <button 
              onClick={refreshConnection}
              className="ml-auto p-1 hover:bg-gray-100 rounded-full transition-colors"
              title="Refresh Connection"
            >
              <RefreshCw size={14} className={!isPeerReady ? 'animate-spin' : ''} />
            </button>
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
                  <p className="text-[11px] text-gray-500 font-medium flex items-center gap-2">  
                    <span className={`inline-flex items-center gap-1 ${isPeerReady ? 'text-green-600' : 'text-yellow-600'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isPeerReady ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></span>
                      {isPeerReady ? 'Call Ready' : 'Connecting...'}
                    </span>
                    {otherUserTyping ? (  
                      <span className="text-blue-600 animate-pulse">• typing...</span>  
                    ) : otherUserOnline ? (  
                      <span className="text-green-600">• Online</span>  
                    ) : otherUserLastSeen ? (  
                      <span>• Last seen {formatTime(otherUserLastSeen)}</span>
                    ) : '• Offline'}  
                  </p>  
                </div>  
              </div>  
              <div className="flex items-center gap-1">  
                <button 
                  onClick={refreshConnection}
                  className="p-2.5 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"
                  title="Refresh Connection"
                >
                  <RefreshCw size={18} />
                </button>
                <button 
                  onClick={() => handleStartCall('video')} 
                  disabled={!isPeerReady || callStatus !== 'idle'}
                  className={`p-2.5 hover:bg-gray-100 rounded-full transition-colors ${!isPeerReady || callStatus !== 'idle' ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600'}`}
                  title={!isPeerReady ? "Connection not ready" : "Video call"}
                >
                  <Video size={20} />
                </button>  
                <button 
                  onClick={() => handleStartCall('audio')} 
                  disabled={!isPeerReady || callStatus !== 'idle'}
                  className={`p-2.5 hover:bg-gray-100 rounded-full transition-colors ${!isPeerReady || callStatus !== 'idle' ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600'}`}
                  title={!isPeerReady ? "Connection not ready" : "Audio call"}
                >
                  <Phone size={20} />
                </button>  
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
                        {msg.message_type === 'image' ? (  
                          <div className="relative w-64 h-64 rounded-lg overflow-hidden mb-1">  
                            <Image src={msg.media_url} alt="Sent image" fill className="object-cover" unoptimized />  
                          </div>  
                        ) : msg.message_type === 'video' ? (  
                          <video src={msg.media_url} controls className="w-64 rounded-lg mb-1" />  
                        ) : (  
                          msg.content  
                        )}  
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
                  <input   
                    type="file"   
                    ref={fileInputRef}   
                    className="hidden"   
                    onChange={handleFileUpload}  
                    accept="image/*,video/*"  
                  />  
                  <button   
                    type="button"   
                    onClick={() => fileInputRef.current?.click()}  
                    disabled={isUploading}  
                    className="p-2 text-gray-500 hover:bg-gray-200 rounded-full transition-colors disabled:opacity-50"  
                  >  
                    {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip size={22} />}  
                  </button>  
                  <button   
                    type="button"   
                    onClick={() => fileInputRef.current?.click()}  
                    className="p-2 text-gray-500 hover:bg-gray-200 rounded-full transition-colors"  
                  >  
                    <Camera size={22} />  
                  </button>  
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
            <div className="mt-6 flex flex-col items-center gap-2">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${isPeerReady ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                <div className={`w-2 h-2 rounded-full ${isPeerReady ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`}></div>
                <span className="font-medium">
                  {isPeerReady ? 'Call system ready' : 'Initializing call system...'}
                </span>
              </div>
              {!isPeerReady && (
                <button 
                  onClick={refreshConnection}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <RefreshCw size={16} className="animate-spin" />
                  Initialize Connection
                </button>
              )}
            </div>
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