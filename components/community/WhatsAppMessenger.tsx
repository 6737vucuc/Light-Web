'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Image as ImageIcon, ArrowLeft, MoreVertical, Phone, Search, Smile, Paperclip, Mic, X, Check, CheckCheck, Trash2, User as UserIcon, MessageCircle, Loader2, MessageSquare, Shield } from 'lucide-react';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
import Peer from 'peerjs';
import CallOverlay from './CallOverlay';
import { useToast } from '@/lib/contexts/ToastContext';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabase/client';

interface WhatsAppMessengerProps {
  currentUser: any;
  initialUserId?: number;
  fullPage?: boolean;
  onBack?: () => void;
}

export default function WhatsAppMessenger({ currentUser, initialUserId, fullPage = false, onBack }: WhatsAppMessengerProps) {
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
  
  // Call States (Unchanged)
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'incoming' | 'connected' | 'ended'>('idle');
  const [callOtherUser, setCallOtherUser] = useState({ name: '', avatar: '' as string | null });
  const [peerId, setPeerId] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const peerRef = useRef<Peer | null>(null);
  const currentCallRef = useRef<any>(null);
  const channelRef = useRef<any>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  // Load Conversations
  const loadConversations = async (targetUserId?: number) => {
    try {
      const res = await fetch('/api/direct-messages');
      if (res.ok) {
        const data = await res.json();
        const convs = data.conversations || [];
        setConversations(convs);
        
        // If initialUserId is provided, try to select that conversation
        if (targetUserId && !selectedConversation) {
          const existingConv = convs.find((c: any) => c.other_user_id === targetUserId);
          if (existingConv) {
            setSelectedConversation(existingConv);
          } else {
            // Create a temporary conversation object for a new chat
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
  };

  // Initial Load
  useEffect(() => {
    if (!currentUser?.id) return;
    loadConversations(initialUserId);
  }, [currentUser?.id, initialUserId]);

  // Real-time Messages, Typing, Presence and Calls using Supabase Realtime
  useEffect(() => {
    if (!currentUser?.id) return;

    // Create a Supabase Realtime channel for this user
    const channel = supabase.channel(`user-${currentUser.id}`, {
      config: {
        broadcast: { self: false },
      }
    });

    channel
      .on('broadcast', { event: 'private-message' }, ({ payload }) => {
        const newMsg = payload.message;
        if (selectedConversation && newMsg.sender_id === selectedConversation.other_user_id) {
          setMessages(prev => {
            if (prev.find(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          setTimeout(scrollToBottom, 100);
        }
        loadConversations();
      })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (selectedConversation && payload.senderId === selectedConversation.other_user_id) {
          setOtherUserTyping(payload.isTyping);
        }
      })
      .on('broadcast', { event: 'online-status' }, ({ payload }) => {
        if (selectedConversation && payload.userId === selectedConversation.other_user_id) {
          setOtherUserOnline(payload.isOnline);
          if (!payload.isOnline) setOtherUserLastSeen(new Date().toISOString());
        }
      })
      .on('broadcast', { event: 'incoming-call' }, ({ payload }) => {
        console.log('Incoming call received:', payload);
        setCallOtherUser({ name: payload.callerName, avatar: payload.callerAvatar });
        setCallStatus('incoming');
        (window as any).incomingPeerId = payload.callerPeerId;
        (window as any).incomingCallerId = payload.callerId;
      })
      .on('broadcast', { event: 'call-rejected' }, () => {
        console.log('Call rejected by other user');
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach(track => track.stop());
          localStreamRef.current = null;
        }
        setCallStatus('ended');
        setTimeout(() => setCallStatus('idle'), 2000);
      })
      .on('broadcast', { event: 'call-ended' }, () => {
        console.log('Call ended by other user');
        if (currentCallRef.current) {
          currentCallRef.current.close();
          currentCallRef.current = null;
        }
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach(track => track.stop());
          localStreamRef.current = null;
        }
        setCallStatus('ended');
        setTimeout(() => setCallStatus('idle'), 2000);
      })
      .on('broadcast', { event: 'call-accepted' }, ({ payload }) => {
        console.log('Call accepted by receiver:', payload);
        setCallStatus('connected');
        
        // When the receiver accepts, the caller should initiate the PeerJS call
        // if it hasn't been established yet via the 'call' event
        if (peerRef.current && localStreamRef.current && payload.receiverPeerId) {
          console.log('Caller initiating PeerJS call to:', payload.receiverPeerId);
          const call = peerRef.current.call(payload.receiverPeerId, localStreamRef.current);
          currentCallRef.current = call;
          setupCallEvents(call);
        }
      })
      .on('broadcast', { event: 'messages-read' }, ({ payload }) => {
        console.log('Messages read by other user:', payload);
        if (selectedConversation && payload.readerId === selectedConversation.other_user_id) {
          setMessages(prev => prev.map(msg => ({ ...msg, is_read: true })));
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Supabase Realtime Subscribed!');
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [currentUser?.id, selectedConversation?.other_user_id]);

  // Update online status on load and maintain real-time presence
  useEffect(() => {
    if (!currentUser?.id) return;
    
    // Initial update
    fetch('/api/users/update-lastseen', { method: 'POST' });
    
    // Heartbeat for online status - every 10 seconds for real-time presence
    const interval = setInterval(() => {
      fetch('/api/users/update-lastseen', { method: 'POST' });
    }, 10000);
    
    // Mark user as offline when leaving the page
    const handleBeforeUnload = () => {
      navigator.sendBeacon('/api/users/set-offline');
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Try to mark offline on cleanup
      fetch('/api/users/set-offline', { method: 'POST', keepalive: true });
    };
  }, [currentUser?.id]);

  // PeerJS Call Logic
  useEffect(() => {
    if (typeof window === 'undefined' || !currentUser?.id) return;
    
    let peerInstance: Peer | null = null;
    let retryCount = 0;
    const maxRetries = 5;

    const initPeer = () => {
      console.log(`Initializing PeerJS (Attempt ${retryCount + 1})...`);
      
      // Use a slightly randomized ID if the primary one is taken, or just retry
      const peerIdToUse = `light-user-${currentUser.id}${retryCount > 0 ? `-${Math.floor(Math.random() * 1000)}` : ''}`;
      
      const peer = new Peer(peerIdToUse, {
        debug: 1,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            {
              urls: 'turn:openrelay.metered.ca:80',
              username: 'openrelayproject',
              credential: 'openrelayproject'
            },
            {
              urls: 'turn:openrelay.metered.ca:443',
              username: 'openrelayproject',
              credential: 'openrelayproject'
            }
          ],
          iceCandidatePoolSize: 10
        }
      });

      peer.on('open', (id) => {
        console.log('PeerJS connected with ID:', id);
        setPeerId(id);
        peerRef.current = peer;
        peerInstance = peer;
        retryCount = 0; // Reset on success
      });

      peer.on('call', async (call) => {
        console.log('Receiving WebRTC call from:', call.peer);
        currentCallRef.current = call;
        if (localStreamRef.current) {
          call.answer(localStreamRef.current);
          setupCallEvents(call);
        }
      });

      peer.on('error', (err) => {
        console.error('PeerJS error:', err);
        if ((err.type === 'unavailable-id' || err.type === 'network' || err.type === 'server-error') && retryCount < maxRetries) {
          retryCount++;
          setTimeout(initPeer, 2000);
        }
      });

      peerInstance = peer;
    };

    initPeer();

    return () => {
      if (peerInstance) {
        peerInstance.destroy();
        peerRef.current = null;
      }
    };
  }, [currentUser?.id]);

  const handleStartCall = async () => {
    if (!selectedConversation) return;
    
    if (!peerId) {
      console.log('Call button pressed but peerId is not ready yet');
      toast.info('Initializing call system... Please try again in a second.');
      return;
    }
    
    console.log('Starting call with peerId:', peerId);
    setCallOtherUser({ name: selectedConversation.name, avatar: selectedConversation.avatar });
    setCallStatus('calling');

    try {
      // Improved constraints for better audio quality
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      localStreamRef.current = stream;

      // Notify recipient via Supabase Realtime
      await fetch('/api/calls/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId: selectedConversation.other_user_id,
          callerPeerId: peerId,
          callerName: currentUser.name,
          callerAvatar: currentUser.avatar
        })
      });

    } catch (err) {
      console.error('Call error:', err);
      toast.error('Could not access microphone');
      setCallStatus('idle');
    }
  };

  const handleAcceptCall = async () => {
    const callerPeerId = (window as any).incomingPeerId;
    const callerId = (window as any).incomingCallerId;
    
    if (!callerPeerId || !peerRef.current) return;

    try {
      // Improved constraints for better audio quality
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      localStreamRef.current = stream;
      
      // 1. Answer the incoming call if it exists
      if (currentCallRef.current) {
        currentCallRef.current.answer(stream);
        setupCallEvents(currentCallRef.current);
      } else {
        // 2. Or initiate a call back to the caller (standard WebRTC pattern)
        const call = peerRef.current.call(callerPeerId, stream);
        currentCallRef.current = call;
        setupCallEvents(call);
      }
      
      // 3. Notify caller that we accepted via Supabase Realtime
      await fetch('/api/calls/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          receiverId: callerId,
          receiverPeerId: peerId // Send our peerId so caller can connect
        })
      });
      
      setCallStatus('connected');

    } catch (err) {
      console.error('Accept call error:', err);
      toast.error('Could not connect call');
      setCallStatus('idle');
    }
  };

  const setupCallEvents = (call: any) => {
    call.on('stream', (remoteStream: MediaStream) => {
      console.log('Received remote stream');
      
      // Create audio element if it doesn't exist
      if (!remoteAudioRef.current) {
        remoteAudioRef.current = new Audio();
        remoteAudioRef.current.autoplay = true;
      }
      
      // Set the remote stream
      remoteAudioRef.current.srcObject = remoteStream;
      
      // Play the audio
      remoteAudioRef.current.play()
        .then(() => console.log('Remote audio playing successfully'))
        .catch(e => {
          console.error("Audio play error:", e);
          // Try to play again after user interaction
          toast.error('Please click anywhere to enable audio');
        });
    });

    call.on('close', () => {
      console.log('Call stream closed');
      handleEndCall();
    });

    call.on('error', (err: any) => {
      console.error('Call stream error:', err);
      handleEndCall();
    });
  };

  const handleRejectCall = async () => {
    const callerId = (window as any).incomingCallerId;
    const targetId = callerId || selectedConversation?.other_user_id;
    
    // Clean up resources
    if (currentCallRef.current) {
      currentCallRef.current.close();
      currentCallRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.pause();
      remoteAudioRef.current.srcObject = null;
      remoteAudioRef.current = null;
    }
    
    if (targetId) {
      fetch('/api/calls/decline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId: targetId })
      });
    }
    setCallStatus('idle');
  };

  const handleEndCall = async () => {
    if (currentCallRef.current) currentCallRef.current.close();
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    
    // Clean up remote audio
    if (remoteAudioRef.current) {
      remoteAudioRef.current.pause();
      remoteAudioRef.current.srcObject = null;
      remoteAudioRef.current = null;
    }
    
    const targetId = (window as any).incomingCallerId || selectedConversation?.other_user_id;
    if (targetId) {
      fetch('/api/calls/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId: targetId })
      });
    }
    setCallStatus('idle');
  };

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.other_user_id);
      setOtherUserOnline(selectedConversation.is_online || false);
      setOtherUserLastSeen(selectedConversation.last_seen || null);
    }
  }, [selectedConversation?.other_user_id]);

  const fetchMessages = async (otherUserId: number) => {
    try {
      const res = await fetch(`/api/direct-messages/${otherUserId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        setTimeout(scrollToBottom, 100);
        
        // Mark messages as read in DB and notify sender
        fetch('/api/direct-messages/mark-read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ senderId: otherUserId })
        });
      }
    } catch (error) { console.error(error); }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() || isSending || !selectedConversation) return;

    setIsSending(true);
    const content = newMessage.trim();
    setNewMessage('');

    try {
      const res = await fetch('/api/direct-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId: selectedConversation.other_user_id, content }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, data.message]);
        setTimeout(scrollToBottom, 100);
        loadConversations();
      }
    } catch (error) { toast.error('Failed to send'); } finally { setIsSending(false); }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    if (!isTyping) {
      setIsTyping(true);
      broadcastTyping(true);
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      broadcastTyping(false);
    }, 2000);
  };

  const broadcastTyping = (typing: boolean) => {
    if (!selectedConversation) return;
    fetch('/api/messages/typing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        receiverId: selectedConversation.other_user_id, 
        isTyping: typing 
      }),
    }).catch(console.error);
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString(locale === 'ar' ? 'ar-SA' : 'en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const getAvatarUrl = (avatar?: string | null) => {
    if (!avatar) return '/default-avatar.png';
    if (avatar.startsWith('data:') || avatar.startsWith('http')) return avatar;
    return `https://neon-image-bucket.s3.us-east-1.amazonaws.com/${avatar}`;
  };

  if (isLoading && conversations.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white">
        <Loader2 className="w-10 h-10 text-purple-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-full bg-[#f0f2f5] overflow-hidden relative" dir={isRtl ? 'rtl' : 'ltr'}>
      <CallOverlay 
        callStatus={callStatus} 
        otherUser={callOtherUser} 
        onAccept={handleAcceptCall} 
        onReject={handleRejectCall} 
        onEnd={handleEndCall} 
      />
      
      {/* Sidebar */}
      <div className={`${selectedConversation ? 'hidden md:flex' : 'flex'} w-full md:w-[350px] lg:w-[400px] flex-col bg-white border-x border-gray-200 h-full shadow-lg z-20`}>
        <div className="bg-[#f0f2f5] px-4 py-4 flex items-center justify-between border-b border-gray-200">
          <button onClick={() => router.push(`/${locale}/community`)} className="p-2 hover:bg-gray-200 rounded-full md:hidden">
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <h2 className="text-xl font-black text-gray-900 tracking-tight">{t('title')}</h2>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-lg">
             <UserIcon className="w-6 h-6 text-white" />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center text-gray-400">
              <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
              <p className="font-bold">{t('noConversations') || 'No conversations yet'}</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <button 
                key={conv.other_user_id} 
                onClick={() => setSelectedConversation(conv)} 
                className={`w-full px-4 py-4 flex items-center gap-4 hover:bg-[#f5f6f6] border-b border-gray-100 transition-all ${selectedConversation?.other_user_id === conv.other_user_id ? 'bg-[#f0f2f5] border-l-4 border-l-purple-600' : ''}`}
              >
                <div className="relative flex-shrink-0">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gray-200 shadow-md border-2 border-white">
                    <Image src={getAvatarUrl(conv.avatar)} alt={conv.name} width={56} height={56} className="object-cover" unoptimized />
                  </div>
                  {conv.is_online && (
                    <div className="absolute -bottom-1 -right-1">
                      <div className="w-4 h-4 bg-green-500 border-2 border-white rounded-full shadow-sm"></div>
                      <div className="absolute inset-0 w-4 h-4 bg-green-400 rounded-full animate-ping opacity-75"></div>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className="font-black text-gray-900 truncate">{conv.name}</h3>
                    <span className="text-[10px] font-bold text-gray-400">{conv.last_message_time ? formatTime(conv.last_message_time) : ''}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500 truncate font-medium flex-1">{conv.last_message || t('noMessages')}</p>
                    {conv.unread_count > 0 && (
                      <span className="ml-2 bg-green-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full min-w-[20px] text-center shadow-sm">
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
      <div className={`${!selectedConversation ? 'hidden md:flex' : 'flex'} flex-1 flex-col bg-[#efeae2] h-full relative`}>
        {selectedConversation ? (
          <>
            <div className="bg-[#f0f2f5] px-4 py-3 flex items-center gap-4 border-b border-gray-200 z-30 shadow-md">
              <button onClick={() => setSelectedConversation(null)} className="md:hidden p-2 hover:bg-gray-200 rounded-full">
                <ArrowLeft className="w-6 h-6 text-gray-600" />
              </button>
              <div className="w-12 h-12 rounded-2xl overflow-hidden bg-gray-200 shadow-sm border-2 border-white">
                <Image src={getAvatarUrl(selectedConversation.avatar)} alt={selectedConversation.name} width={48} height={48} className="object-cover" unoptimized />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-black text-gray-900 truncate">{selectedConversation.name}</h3>
                <div className="flex items-center gap-1.5">
                  {otherUserTyping ? (
                    <>
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-[11px] font-bold text-green-600 animate-pulse">{t('typing')}</span>
                    </>
                  ) : otherUserOnline ? (
                    <>
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-[11px] font-bold text-green-600">Online • Real-Time</span>
                    </>
                  ) : otherUserLastSeen ? (
                    <span className="text-[11px] font-bold text-gray-500">{t('lastSeen')} {new Date(otherUserLastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  ) : <span className="text-[11px] font-bold text-gray-400">{t('offline')}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleStartCall}
                  className="p-2.5 text-gray-600 hover:bg-gray-200 hover:text-purple-600 rounded-xl transition-all"
                >
                  <Phone className="w-5 h-5" />
                </button>
                <button className="p-2.5 text-gray-600 hover:bg-gray-200 hover:text-purple-600 rounded-xl transition-all">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4 relative custom-scrollbar">
              <div className="absolute inset-0 opacity-5 pointer-events-none bg-[url('https://w0.peakpx.com/wallpaper/508/606/HD-wallpaper-whatsapp-background-whatsapp-patterns.jpg')] bg-repeat"></div>
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full opacity-30 select-none">
                  <div className="bg-white/50 backdrop-blur px-6 py-2 rounded-full border border-white/20 text-xs font-black uppercase tracking-widest text-gray-600 shadow-sm">
                    {t('endToEndEncrypted') || 'End-to-End Encrypted'}
                  </div>
                </div>
              )}
              {messages.map((msg) => {
                const isOwn = msg.sender_id === currentUser.id;
                return (
                  <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                    <div className={`max-w-[75%] relative px-4 py-2.5 rounded-2xl shadow-sm ${isOwn ? 'bg-[#dcf8c6] text-gray-800 rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none'}`}>
                      <p className="text-sm font-bold whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                      <div className="flex items-center justify-end gap-1 mt-1 opacity-70">
                        <span className="text-[9px] text-gray-500 font-black">{formatTime(msg.created_at)}</span>
                        {isOwn && (msg.is_read ? <CheckCheck className="w-3.5 h-3.5 text-blue-500" /> : <Check className="w-3.5 h-3.5 text-gray-400" />)}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
            
            <div className="bg-[#f0f2f5] p-4 flex items-center gap-3 z-30 border-t border-gray-200">
              <button className="p-2 text-gray-500 hover:text-purple-600 transition-colors"><Smile className="w-7 h-7" /></button>
              <button className="p-2 text-gray-500 hover:text-purple-600 transition-colors"><Paperclip className="w-7 h-7" /></button>
              <form onSubmit={handleSendMessage} className="flex-1">
                <input 
                  type="text" 
                  value={newMessage} 
                  onChange={handleTyping} 
                  placeholder={t('typeMessage')} 
                  className="w-full px-6 py-3.5 rounded-2xl bg-white text-gray-900 font-bold focus:outline-none shadow-sm border-none ring-0 placeholder:text-gray-400" 
                />
              </form>
              <button 
                onClick={handleSendMessage} 
                disabled={!newMessage.trim() || isSending}
                className={`p-4 rounded-2xl shadow-xl transform active:scale-95 transition-all ${newMessage.trim() && !isSending ? 'bg-purple-600 text-white hover:bg-purple-700 hover:rotate-12' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
              >
                <Send className="w-6 h-6" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-10 text-center relative overflow-hidden">
             <div className="absolute inset-0 opacity-5 pointer-events-none bg-[url('https://w0.peakpx.com/wallpaper/508/606/HD-wallpaper-whatsapp-background-whatsapp-patterns.jpg')] bg-repeat"></div>
            <div className="w-32 h-32 bg-white rounded-3xl flex items-center justify-center mb-8 shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-500 border-2 border-purple-50">
              <MessageCircle className="w-16 h-16 text-purple-600" />
            </div>
            <h2 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">WhatsApp Real-time</h2>
            <p className="max-w-md font-bold text-lg text-gray-400 leading-relaxed">Select a contact to start a secure, real-time conversation. Powered by Supabase & Pusher.</p>
            <div className="mt-12 flex items-center gap-2 text-gray-300 font-black uppercase tracking-widest text-[10px] bg-white/50 backdrop-blur px-4 py-2 rounded-full border border-white">
              <Shield className="w-3 h-3" /> End-to-End Encrypted
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
