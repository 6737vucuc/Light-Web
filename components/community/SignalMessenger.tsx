'use client';
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
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callDurationRef = useRef<NodeJS.Timeout | null>(null);
  const peerRef = useRef<any>(null);
  const currentCallRef = useRef<any>(null);
  const channelRef = useRef<any>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const messageIds = useRef<Set<string>>(new Set());

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
    } catch (error) { console.error('Load conversations error:', error); }
  }, [selectedConversation]);

  useEffect(() => {
    if (!currentUser?.id) return;
    loadConversations(initialUserId);
  }, [currentUser?.id, initialUserId, loadConversations]);

  // Initialize PeerJS connection
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

      // Generate unique peer ID with timestamp
      const peerIdToUse = `signal-${currentUser.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      console.log('[Signal] Creating new peer with ID:', peerIdToUse);
      
      // Use public PeerJS server
      const peer = new Peer(peerIdToUse, {
        host: '0.peerjs.com',
        port: 443,
        path: '/',
        secure: true,
        debug: 1, // Reduced debug level
        pingInterval: 5000, // Added ping interval to keep connection alive
        config: {
          iceServers: [
            // Public STUN servers
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' },
            { urls: 'stun:stun.voipbuster.com:3478' },
            { urls: 'stun:stun.voipstunt.com:3478' },
            // Public TURN servers (free)
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
          ],
          iceCandidatePoolSize: 10,
          iceTransportPolicy: 'all',
          rtcpMuxPolicy: 'require',
          bundlePolicy: 'max-bundle'
        }
      });

      return new Promise<string>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout (15 seconds)'));
        }, 15000);

        peer.on('open', async (id: string) => {
          clearTimeout(timeout);
          console.log('[Signal] ✅ Peer connection opened with ID:', id);
          setPeerId(id);
          peerRef.current = peer;
          setIsPeerReady(true);
          
          // Update user's peer ID in database
          try {
            const { error: dbError } = await supabase
              .from('users')
              .update({ 
                current_peer_id: id,
                last_seen: new Date().toISOString(),
                is_online: true 
              })
              .eq('id', currentUser.id);
            
            if (dbError) throw dbError;
            console.log('[Signal] ✅ Updated peer ID in database');
          } catch (dbError) {
            console.error('[Signal] ❌ Error updating database:', dbError);
          }
          
          // Only show success toast if it's not the initial connection to reduce noise
          // toast.success('Connected to call server');
          resolve(id);
        });

        peer.on('call', (call: any) => {
          console.log('[Signal] 📞 Incoming call received from:', call.peer);
          currentCallRef.current = call;
          
          // Show incoming call UI
          const callerId = call.peer.split('-')[1];
          if (selectedConversation?.other_user_id === parseInt(callerId)) {
            setCallStatus('incoming');
          }
        });

        peer.on('error', (err: any) => {
          console.error('[Signal] ❌ Peer error:', err);
          clearTimeout(timeout);
          setIsPeerReady(false);
          
          if (err.type === 'unavailable-id') {
            console.log('[Signal] 🔄 Peer ID unavailable, retrying with new ID...');
            setTimeout(() => initializePeerConnection(), 2000);
          } else if (err.type === 'network') {
            console.log('[Signal] 🌐 Network error, checking connection...');
            // Try to reconnect on network error
            setTimeout(() => {
              if (peer && !peer.destroyed) peer.reconnect();
            }, 5000);
          }
          
          reject(err);
        });

        peer.on('disconnected', () => {
          console.log('[Signal] 🔌 Peer disconnected');
          setIsPeerReady(false);
          toast.info('Connection lost, reconnecting...');
          
          // Try to reconnect
          setTimeout(() => {
            if (!peer.destroyed) {
              peer.reconnect();
            }
          }, 3000);
        });

        peer.on('close', () => {
          console.log('[Signal] 🔒 Peer connection closed');
          setIsPeerReady(false);
        });
      });
    } catch (error) {
      console.error('[Signal] ❌ Failed to initialize peer:', error);
      toast.error('Connection failed. Please refresh the page.');
      setIsPeerReady(false);
      throw error;
    }
  }, [currentUser?.id, toast, selectedConversation]);

  // Initialize peer connection on mount
  useEffect(() => {
    if (!currentUser?.id || typeof window === 'undefined') return;

    console.log('[Signal] 🚀 Initializing peer connection for user:', currentUser.id);
    
    const init = async () => {
      try {
        await initializePeerConnection();
      } catch (error) {
        console.error('[Signal] ❌ Initial peer initialization failed:', error);
      }
    };
    
    init();

    // Cleanup on unmount
    return () => {
      console.log('[Signal] 🧹 Cleaning up peer connection');
      if (peerRef.current && !peerRef.current.destroyed) {
        peerRef.current.destroy();
      }
      if (currentUser?.id) {
        supabase.from('users').update({ 
          current_peer_id: null,
          is_online: false 
        }).eq('id', currentUser.id);
      }
    };
  }, [currentUser?.id, initializePeerConnection]);

  // Subscribe to real-time messages and calls
  useEffect(() => {
    if (!selectedConversation || !currentUser?.id) return;

    let isSubscribed = true;
    messageIds.current.clear();

    const loadMessages = async () => {  
      try {  
        const res = await fetch(`/api/direct-messages/${selectedConversation.other_user_id}`);  
        if (res.ok && isSubscribed) {  
          const data = await res.json();  
          const uniqueMessages = data.messages?.filter((msg: any) => {
            if (messageIds.current.has(msg.id)) return false;
            messageIds.current.add(msg.id);
            return true;
          }) || [];
          setMessages(uniqueMessages);  
          setOtherUserOnline(selectedConversation.is_online);  
          setOtherUserLastSeen(selectedConversation.last_seen);  
          scrollToBottom();  
        }  
      } catch (error) { console.error('Load messages error:', error); }  
    };  

    loadMessages();  

    // Create unique channel name for this conversation
    const channelName = `dm-${Math.min(currentUser.id, selectedConversation.other_user_id)}-${Math.max(currentUser.id, selectedConversation.other_user_id)}`;
    console.log('[Signal] 📡 Subscribing to channel:', channelName);
    
    const channel = supabase.channel(channelName, {  
      config: { 
        broadcast: { self: false, ack: true }
      }  
    });  

    // Message handler
    channel.on('broadcast', { event: 'new-message' }, ({ payload }) => {  
      if (!isSubscribed) return;
      
      const msg = payload;
      if ((msg.sender_id === selectedConversation.other_user_id && msg.receiver_id === currentUser.id) ||
          (msg.receiver_id === selectedConversation.other_user_id && msg.sender_id === currentUser.id)) {  
        
        if (messageIds.current.has(msg.id)) return;
        messageIds.current.add(msg.id);
        
        setMessages(prev => [...prev, msg]);  
        scrollToBottom();  
          
        // Mark as read if we are the receiver  
        if (msg.receiver_id === currentUser.id && !msg.is_read) {  
          fetch(`/api/direct-messages/${msg.id}/read`, { method: 'POST' });  
        }  
      }  
    });

    // Typing indicator handler
    channel.on('broadcast', { event: 'typing' }, ({ payload }) => {  
      if (!isSubscribed) return;
      if (payload.userId === selectedConversation.other_user_id) {  
        setOtherUserTyping(payload.isTyping);  
      }  
    });

    // Incoming call handler
    channel.on('broadcast', { event: 'incoming-call' }, ({ payload }) => {  
      if (!isSubscribed) return;
      if (payload.receiverId === currentUser.id) {
        console.log('[Signal] 📞 Received call invitation from:', payload.callerName);
        
        setCallOtherUser({ 
          name: payload.callerName, 
          avatar: payload.callerAvatar 
        });
        setCallStatus('incoming');
        setCallType(payload.callType || 'audio');
        
        // Store caller info for later use
        (window as any).callerInfo = {
          peerId: payload.callerPeerId,
          userId: payload.callerId
        };
        
        // Play ringtone
        playRingtone();
      }  
    });

    // Call accepted handler
    channel.on('broadcast', { event: 'call-accepted' }, ({ payload }) => {  
      if (!isSubscribed) return;
      if (payload.receiverId === currentUser.id) {  
        console.log('[Signal] ✅ Call accepted by other user');
        setCallStatus('connected');  
        stopRingtone();
        startCallTimer();
      }  
    });

    // Call ended handler
    channel.on('broadcast', { event: 'call-ended' }, ({ payload }) => {  
      if (!isSubscribed) return;
      if (payload.receiverId === currentUser.id) {  
        console.log('[Signal] ❌ Call ended by other user');
        stopRingtone();
        handleEndCall();  
      }  
    });

    // User online status
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const otherUserPresent = Object.keys(state).some(key => 
        key.includes(`user-${selectedConversation.other_user_id}`)
      );
      setOtherUserOnline(otherUserPresent);
    });

    // Subscribe to channel
    channel.subscribe(async (status) => {
      console.log('[Signal] Channel status:', status);
      if (status === 'SUBSCRIBED') {
        // Track presence
        await channel.track({
          userId: currentUser.id,
          online_at: new Date().toISOString()
        });
      }
    });

    channelRef.current = channel;  

    return () => {  
      isSubscribed = false;
      stopRingtone();
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
          .then(() => console.log('[Signal] ✅ Channel removed'))
          .catch(err => console.error('[Signal] ❌ Error removing channel:', err));
      }
    };

  }, [selectedConversation, currentUser.id]);

  // Call timer
  const startCallTimer = useCallback(() => {
    if (callDurationRef.current) clearInterval(callDurationRef.current);
    
    setCallDuration(0);
    callDurationRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  }, []);

  // Ringtone functions
  const playRingtone = () => {
    try {
      const audio = new Audio('/ringtone.mp3');
      audio.loop = true;
      audio.volume = 0.5;
      audio.play().catch(console.error);
      (window as any).ringtone = audio;
    } catch (error) {
      console.error('Error playing ringtone:', error);
    }
  };

  const stopRingtone = () => {
    try {
      if ((window as any).ringtone) {
        (window as any).ringtone.pause();
        (window as any).ringtone.currentTime = 0;
      }
    } catch (error) {
      console.error('Error stopping ringtone:', error);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleTyping = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
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

  const sendMessage = async (e?: React.FormEvent, mediaUrl?: string, mediaType?: string) => {
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
        if (!messageIds.current.has(data.message.id)) {
          messageIds.current.add(data.message.id);
          setMessages(prev => [...prev, data.message]);  
          scrollToBottom();  
          
          // Send via real-time
          channelRef.current?.send({
            type: 'broadcast',
            event: 'new-message',
            payload: data.message
          });
        }
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
        await sendMessage(undefined, data.url, type);  
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

  // Call Functions
  const handleStartCall = async (type: 'audio' | 'video' = 'audio') => {
    if (!selectedConversation) {
      toast.error('No conversation selected');
      return;
    }
    
    console.log('[SignalCall] 📞 Starting', type, 'call with:', selectedConversation.name);
    
    if (!isPeerReady || !peerRef.current) {
      toast.error('Connection not ready. Please wait...');
      return;
    }

    setCallOtherUser({ name: selectedConversation.name, avatar: selectedConversation.avatar });
    setCallStatus('calling');
    setCallType(type);
    setIsVideoOn(type === 'video');

    try {
      // Get media permissions
      const constraints = { 
        audio: true, 
        video: type === 'video' ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        } : false 
      };
      
      console.log('[SignalCall] Requesting media with constraints:', constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      console.log('[SignalCall] ✅ Media permissions granted');

      // Get receiver's peer ID from database
      const { data: receiverData } = await supabase
        .from('users')
        .select('current_peer_id')
        .eq('id', selectedConversation.other_user_id)
        .single();

      if (!receiverData?.current_peer_id) {
        toast.error('User is offline or not available for calls');
        handleEndCall();
        return;
      }

      console.log('[SignalCall] 📞 Calling peer:', receiverData.current_peer_id);

      // Send call invitation via Supabase
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

      // Start the call with timeout
      const call = peerRef.current.call(receiverData.current_peer_id, stream);
      currentCallRef.current = call;
      setupCallEvents(call);
      
      // Set call timeout (30 seconds)
      setTimeout(() => {
        if (callStatus === 'calling') {
          console.log('[SignalCall] ⏰ Call timeout - no answer');
          toast.error('Call timed out. User not answering.');
          handleEndCall();
        }
      }, 30000);

    } catch (err: any) {
      console.error('[SignalCall] ❌ Error during call setup:', err);
      
      if (err.name === 'NotAllowedError') {
        toast.error('Microphone/camera permission denied');
      } else if (err.name === 'NotFoundError') {
        toast.error('No microphone/camera found');
      } else if (err.name === 'NotReadableError') {
        toast.error('Device is busy or not accessible');
      } else {
        toast.error('Call failed: ' + (err.message || 'Unknown error'));
      }
      
      handleEndCall();
    }
  };

  const handleAcceptCall = async () => {
    console.log('[SignalCall] ✅ Accepting incoming call');
    const callerInfo = (window as any).callerInfo;
    
    if (!callerInfo?.peerId) {
      toast.error('Call information missing');
      handleEndCall();
      return;
    }

    try {
      stopRingtone();
      
      const constraints = { 
        audio: true, 
        video: callType === 'video' ? {
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } : false 
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      console.log('[SignalCall] ✅ Media permissions granted for answering');

      // Answer the call
      if (currentCallRef.current) {
        currentCallRef.current.answer(stream);
        setupCallEvents(currentCallRef.current);
      } else {
        // If no call object, initiate call back
        const call = peerRef.current.call(callerInfo.peerId, stream);
        currentCallRef.current = call;
        setupCallEvents(call);
      }
      
      // Notify caller that call was accepted
      await channelRef.current.send({
        type: 'broadcast',
        event: 'call-accepted',
        payload: {
          receiverId: callerInfo.userId,
          receiverPeerId: peerId
        }
      });
      
      setCallStatus('connected');
      startCallTimer();
      console.log('[SignalCall] ✅ Call connected');
      
    } catch (err: any) {
      console.error('[SignalCall] ❌ Error accepting call:', err);
      toast.error('Could not connect to call');
      handleEndCall();
    }
  };

  const handleEndCall = useCallback(() => {
    console.log('[SignalCall] 🚫 Ending call');
    
    stopRingtone();
    
    // Clear call timer
    if (callDurationRef.current) {
      clearInterval(callDurationRef.current);
      callDurationRef.current = null;
    }
    
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
    
    // Stop and clean remote streams
    if (remoteAudioRef.current) {
      remoteAudioRef.current.pause();
      remoteAudioRef.current.srcObject = null;
    }
    
    if (remoteVideoRef.current) {
      remoteVideoRef.current.pause();
      remoteVideoRef.current.srcObject = null;
    }
    
    if (localVideoRef.current) {
      localVideoRef.current.pause();
      localVideoRef.current.srcObject = null;
    }

    // Notify other user that call ended
    if (selectedConversation && channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'call-ended',
        payload: { receiverId: selectedConversation.other_user_id }
      }).catch(console.error);
    }

    // Reset call states
    setCallStatus('idle');
    setCallDuration(0);
    setIsMuted(false);
    setIsVideoOn(true);
    
    console.log('[SignalCall] ✅ Call ended cleanly');
  }, [selectedConversation]);

  const setupCallEvents = (call: any) => {
    console.log('[SignalCall] Setting up call events');
    
    call.on('stream', (remoteStream: MediaStream) => {
      console.log('[SignalCall] 📹 Received remote stream');
      
      if (callType === 'video') {
        if (!remoteVideoRef.current) {
          remoteVideoRef.current = document.createElement('video');
          remoteVideoRef.current.autoplay = true;
          remoteVideoRef.current.playsInline = true;
          remoteVideoRef.current.style.position = 'fixed';
          remoteVideoRef.current.style.top = '0';
          remoteVideoRef.current.style.left = '0';
          remoteVideoRef.current.style.width = '100%';
          remoteVideoRef.current.style.height = '100%';
          remoteVideoRef.current.style.objectFit = 'cover';
          remoteVideoRef.current.style.zIndex = '9998';
          document.body.appendChild(remoteVideoRef.current);
        }
        remoteVideoRef.current.srcObject = remoteStream;
      } else {
        if (!remoteAudioRef.current) {
          remoteAudioRef.current = new Audio();
          remoteAudioRef.current.autoplay = true;
        }
        remoteAudioRef.current.srcObject = remoteStream;
      }
    });
    
    call.on('close', () => {
      console.log('[SignalCall] 🔒 Call closed by remote');
      handleEndCall();
    });
    
    call.on('error', (err: any) => {
      console.error('[SignalCall] ❌ Call error:', err);
      handleEndCall();
    });
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

  const refreshConnection = async () => {
    toast.info('Refreshing connection...');
    setIsPeerReady(false);
    
    try {
      await initializePeerConnection();
      toast.success('Connection refreshed');
    } catch (error) {
      toast.error('Failed to refresh connection');
    }
  };

  const formatCallDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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

  const filteredConversations = conversations.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-full bg-white overflow-hidden font-sans text-[#1b1b1b]">
      {/* Sidebar */}
      <div className={`w-full md:w-[350px] flex-shrink-0 border-r border-gray-100 flex flex-col ${selectedConversation && 'hidden md:flex'}`}>
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
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <Search size={20} />
            </button>
          </div>
        </div>

        {/* Connection Status */}
        <div className="px-4 mb-3">
          <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${isPeerReady ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-yellow-50 text-yellow-700 border border-yellow-100'}`}>
            {isPeerReady ? <Wifi size={16} /> : <WifiOff size={16} />}
            <span className="font-medium">
              {isPeerReady ? t('callReady') : t('connecting')}
            </span>
            <button 
              onClick={refreshConnection}
              className="ml-auto p-1 hover:bg-gray-100 rounded-full transition-colors"
              title={t('refreshConnection')}
            >
              <RefreshCw size={14} className={!isPeerReady ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Search */}
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
                key={`conv-${conv.other_user_id}`}  
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

      {/* Chat Area */}  
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
                      {isPeerReady ? t('readyForCalls') : t('connecting')}
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
                  title={t('refreshConnection')}
                >
                  <RefreshCw size={18} className={!isPeerReady ? 'animate-spin' : ''} />
                </button>
                <button 
                  onClick={() => handleStartCall('video')} 
                  disabled={!isPeerReady || callStatus !== 'idle'}
                  className={`p-2.5 rounded-full transition-colors ${!isPeerReady || callStatus !== 'idle' ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'}`}
                  title={!isPeerReady ? t('connecting') : callStatus !== 'idle' ? t('alreadyInCall') : t('videoCall')}
                >
                  <Video size={20} />
                </button>  
                <button 
                  onClick={() => handleStartCall('audio')} 
                  disabled={!isPeerReady || callStatus !== 'idle'}
                  className={`p-2.5 rounded-full transition-colors ${!isPeerReady || callStatus !== 'idle' ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'}`}
                  title={!isPeerReady ? t('connecting') : callStatus !== 'idle' ? t('alreadyInCall') : t('audioCall')}
                >
                  <Phone size={20} />
                </button>  
              </div>  
            </div>  

            {/* Messages Area */}  
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#f9f9f9]">  
              <div className="flex justify-center mb-6">  
                <div className="bg-blue-50 text-blue-700 text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5 border border-blue-100">  
                  <Lock size={10} /> End-to-End Encrypted  
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
                    placeholder="Type a message..."  
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
            <h2 className="text-2xl font-bold mb-2">Signal Messenger</h2>  
            <p className="text-gray-500 max-w-xs mx-auto text-sm leading-relaxed mb-6">  
              End-to-end encrypted messaging and calling. Select a conversation to start.  
            </p>  
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg mb-4 ${isPeerReady ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-yellow-50 text-yellow-700 border border-yellow-100'}`}>
              {isPeerReady ? <Wifi size={18} /> : <WifiOff size={18} />}
              <span className="font-medium">
                {isPeerReady ? 'Call system ready' : 'Initializing call system...'}
              </span>
            </div>
            <div className="mt-8 flex gap-4">  
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
      {callStatus !== 'idle' && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
          <div className="bg-gray-900 rounded-2xl p-8 max-w-md w-full mx-4 text-white">
            {/* Call Header */}
            <div className="text-center mb-6">
              <div className="w-20 h-20 rounded-full bg-gray-700 mx-auto mb-4 overflow-hidden">
                {callOtherUser.avatar ? (
                  <Image src={getAvatarUrl(callOtherUser.avatar)} alt={callOtherUser.name} width={80} height={80} className="object-cover" unoptimized />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">
                    {callOtherUser.name.charAt(0)}
                  </div>
                )}
              </div>
              <h3 className="text-xl font-bold">{callOtherUser.name}</h3>
              <p className="text-gray-300 mt-1">
                {callStatus === 'calling' && 'Calling...'}
                {callStatus === 'incoming' && 'Incoming call...'}
                {callStatus === 'connected' && `${formatCallDuration(callDuration)}`}
              </p>
            </div>

            {/* Call Controls */}
            <div className="flex justify-center gap-6 mb-8">
              {callStatus === 'connected' && (
                <>
                  <button 
                    onClick={toggleMute}
                    className={`w-14 h-14 rounded-full flex items-center justify-center ${isMuted ? 'bg-red-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                  >
                    {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
                  </button>
                  {callType === 'video' && (
                    <button 
                      onClick={toggleVideo}
                      className={`w-14 h-14 rounded-full flex items-center justify-center ${!isVideoOn ? 'bg-red-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                    >
                      <Camera size={24} />
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-6">
              {callStatus === 'incoming' && (
                <>
                  <button 
                    onClick={handleEndCall}
                    className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center hover:bg-red-700"
                  >
                    <Phone size={24} className="rotate-135" />
                  </button>
                  <button 
                    onClick={handleAcceptCall}
                    className="w-14 h-14 rounded-full bg-green-600 flex items-center justify-center hover:bg-green-700"
                  >
                    <Phone size={24} />
                  </button>
                </>
              )}
              
              {callStatus === 'calling' && (
                <button 
                  onClick={handleEndCall}
                  className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center hover:bg-red-700"
                >
                  <Phone size={24} className="rotate-135" />
                </button>
              )}
              
              {callStatus === 'connected' && (
                <button 
                  onClick={handleEndCall}
                  className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center hover:bg-red-700 mx-auto"
                >
                  <Phone size={24} className="rotate-135" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}