'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Image as ImageIcon, ArrowLeft, MoreVertical, Phone, Search, Smile, Paperclip, Mic, X, Check, CheckCheck, Trash2, User as UserIcon } from 'lucide-react';
import Image from 'next/image';
import Pusher from 'pusher-js';
import { useRouter, useParams } from 'next/navigation';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import Peer from 'peerjs';
import CallOverlay from './CallOverlay';
import { useToast } from '@/lib/contexts/ToastContext';
import { useTranslations } from 'next-intl';

interface WhatsAppMessengerProps {
  currentUser: any;
  initialUserId?: number;
  fullPage?: boolean;
}

export default function WhatsAppMessenger({ currentUser, initialUserId, fullPage = false }: WhatsAppMessengerProps) {
  const router = useRouter();
  const params = useParams();
  const locale = params?.locale as string || 'ar';
  const isRtl = locale === 'ar';
  const t = useTranslations('messages');
  const tCommon = useTranslations('common');
  const toast = useToast();
  
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  
  // Call States
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'incoming' | 'connected' | 'ended'>('idle');
  const [callOtherUser, setCallOtherUser] = useState({ name: '', avatar: '' as string | null });
  const [peerId, setPeerId] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pusherRef = useRef<Pusher | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const headerMenuRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const peerRef = useRef<Peer | null>(null);
  const currentCallRef = useRef<any>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize PeerJS with a clean approach
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Use a unique ID for each session to avoid conflicts
    const myPeerId = `light-chat-${currentUser.id}-${Math.random().toString(36).substr(2, 4)}`;
    
    const peer = new Peer(myPeerId, {
      host: '0.peerjs.com',
      port: 443,
      secure: true,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      }
    });

    peer.on('open', (id) => {
      setPeerId(id);
      peerRef.current = peer;
    });

    peer.on('call', (incomingCall) => {
      currentCallRef.current = incomingCall;
      // Incoming call handling is done via acceptCall
    });

    peer.on('error', (err) => {
      console.error('PeerJS error:', err);
    });

    return () => {
      if (peer) peer.destroy();
    };
  }, [currentUser.id]);

  useEffect(() => {
    loadConversations();
    
    if (typeof window !== 'undefined') {
      pusherRef.current = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY || '', {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us2',
      });

      const userChannel = pusherRef.current.subscribe(`user-${currentUser.id}`);
      
      userChannel.bind('incoming-call', (data: any) => {
        if (callStatus === 'idle') {
          setCallOtherUser({ name: data.callerName, avatar: data.callerAvatar });
          setCallStatus('incoming');
          // Important: Store caller's peer ID
          currentCallRef.current = { peerId: data.callerPeerId, isInitiator: false };
        }
      });

      userChannel.bind('call-rejected', () => {
        cleanupCall();
        setCallStatus('ended');
        setTimeout(() => setCallStatus('idle'), 2000);
      });

      userChannel.bind('call-ended', () => {
        cleanupCall();
        setCallStatus('ended');
        setTimeout(() => setCallStatus('idle'), 2000);
      });
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
      if (headerMenuRef.current && !headerMenuRef.current.contains(event.target as Node)) {
        setShowHeaderMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      if (pusherRef.current) pusherRef.current.disconnect();
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [currentUser.id, callStatus]);

  const cleanupCall = () => {
    if (currentCallRef.current && currentCallRef.current.close) currentCallRef.current.close();
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    if (!initialUserId || isLoading) return;
    const existingConv = conversations.find(conv => conv.other_user_id === initialUserId);
    if (existingConv) {
      setSelectedConversation(existingConv);
    } else {
      openConversationWithUser(initialUserId);
    }
  }, [initialUserId, conversations, isLoading]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.other_user_id);
      const unsubscribe = subscribeToMessages(selectedConversation.other_user_id);
      return unsubscribe;
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversations = async () => {
    try {
      const response = await fetch('/api/messages/conversations');
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessages = async (otherUserId: number) => {
    try {
      const response = await fetch(`/api/messages/${otherUserId}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const subscribeToMessages = (otherUserId: number) => {
    if (!pusherRef.current) return;
    const currentUserId = currentUser.id;
    const channelId = `conversation-${Math.min(currentUserId, otherUserId)}-${Math.max(currentUserId, otherUserId)}`;
    const channel = pusherRef.current.subscribe(channelId);
    
    channel.bind('new-message', (data: any) => {
      setMessages((prev) => {
        if (prev.find(m => m.id === data.message.id)) return prev;
        return [...prev, data.message];
      });
      setIsTyping(false);
      scrollToBottom();
    });
    
    channel.bind('message-deleted', (data: any) => {
      setMessages((prev) => prev.map(m => 
        m.id === data.messageId ? { ...m, isDeleted: true, content: t('messageDeleted') } : m
      ));
    });

    channel.bind('typing', (data: any) => {
      if (data.userId !== currentUser.id) {
        setIsTyping(data.isTyping);
      }
    });

    return () => {
      channel.unbind_all();
      pusherRef.current?.unsubscribe(channelId);
    };
  };

  const handleTyping = () => {
    if (!selectedConversation) return;
    const targetId = selectedConversation.other_user_id;
    fetch('/api/messages/typing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientId: targetId, isTyping: true })
    });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      fetch('/api/messages/typing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId: targetId, isTyping: false })
      });
    }, 3000);
  };

  const openConversationWithUser = async (userId: number) => {
    try {
      const response = await fetch('/api/messages/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId: userId }),
      });
      if (response.ok) {
        const data = await response.json();
        setSelectedConversation(data.conversation);
        await loadConversations();
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
    }
  };

  const sendMessage = async () => {
    const content = newMessage.trim();
    if ((!content && !selectedImage) || !selectedConversation || isSending) return;

    setIsSending(true);
    try {
      let imageUrl = null;
      if (selectedImage) {
        setIsUploadingImage(true);
        const formData = new FormData();
        formData.append('file', selectedImage);
        const uploadResponse = await fetch('/api/upload', { method: 'POST', body: formData });
        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          imageUrl = uploadData.url;
        }
        setIsUploadingImage(false);
      }

      const targetId = Number(selectedConversation.other_user_id);
      const response = await fetch(`/api/messages/${targetId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content,
          mediaUrl: imageUrl,
          messageType: imageUrl ? 'image' : 'text'
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setMessages(prev => [...prev, data.message]);
        setNewMessage('');
        setSelectedImage(null);
        setImagePreview(null);
        setShowEmojiPicker(false);
        scrollToBottom();
      }
    } catch (error: any) {
      toast.error(t('error'));
    } finally {
      setIsSending(false);
    }
  };

  const deleteForEveryone = async (messageId: number) => {
    const confirmed = await toast.confirm({
      title: t('deleteMessage'),
      message: t('deleteMessageConfirm'),
      confirmText: t('deleteForEveryone'),
      cancelText: t('cancel'),
      type: 'danger'
    });

    if (confirmed) {
      setIsDeleting(true);
      try {
        const response = await fetch(`/api/messages/${selectedConversation.other_user_id}?messageId=${messageId}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          setMessages(prev => prev.map(m => 
            m.id === messageId ? { ...m, isDeleted: true, content: t('messageDeleted') } : m
          ));
          toast.success(t('deleteSuccess'));
        } else {
          toast.error(t('deleteError'));
        }
      } catch (error) {
        toast.error(t('deleteError'));
      } finally {
        setIsDeleting(false);
        setSelectedMessageId(null);
      }
    }
  };

  const clearChat = async () => {
    const confirmed = await toast.confirm({
      title: t('clearChat'),
      message: t('clearChatConfirm'),
      confirmText: tCommon('delete'),
      cancelText: t('cancel'),
      type: 'danger'
    });
    
    if (confirmed) {
      setMessages([]);
      setShowHeaderMenu(false);
      toast.success(t('chatCleared'));
    }
  };

  const startCall = async () => {
    if (!selectedConversation || !peerId) {
      toast.error(t('callFailed'));
      return;
    }
    
    try {
      // 1. Request Mic Access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      setCallOtherUser({ name: selectedConversation.other_user_name, avatar: selectedConversation.other_user_avatar });
      setCallStatus('calling');
      
      // 2. Signal recipient via Pusher
      await fetch('/api/messages/call/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId: selectedConversation.other_user_id,
          callerPeerId: peerId,
          callerName: currentUser.name,
          callerAvatar: currentUser.avatar
        })
      });
    } catch (err) {
      toast.error(t('callFailed'));
      setCallStatus('idle');
    }
  };

  const acceptCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      setCallStatus('connected');

      if (peerRef.current && currentCallRef.current?.peerId) {
        // We call them back
        const call = peerRef.current.call(currentCallRef.current.peerId, stream);
        currentCallRef.current = call;
        setupCallEvents(call);
      } else if (currentCallRef.current && currentCallRef.current.answer) {
        // They already called us via PeerJS
        currentCallRef.current.answer(stream);
        setupCallEvents(currentCallRef.current);
      }
    } catch (err) {
      rejectCall();
    }
  };

  const rejectCall = () => {
    cleanupCall();
    setCallStatus('idle');
    if (selectedConversation) {
      fetch('/api/messages/call/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId: selectedConversation.other_user_id })
      });
    }
  };

  const endCall = () => {
    cleanupCall();
    setCallStatus('ended');
    if (selectedConversation) {
      fetch('/api/messages/call/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId: selectedConversation.other_user_id })
      });
    }
    setTimeout(() => setCallStatus('idle'), 2000);
  };

  const setupCallEvents = (call: any) => {
    call.on('stream', (remoteStream: MediaStream) => {
      if (!remoteAudioRef.current) {
        remoteAudioRef.current = document.createElement('audio');
        remoteAudioRef.current.autoplay = true;
      }
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.play().catch(() => {});
    });
    
    call.on('close', () => {
      cleanupCall();
      setCallStatus('ended');
      setTimeout(() => setCallStatus('idle'), 2000);
    });
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setNewMessage(prev => prev + emojiData.emoji);
  };

  const getAvatarUrl = (avatar?: string | null) => {
    if (!avatar) return '/default-avatar.png';
    if (avatar.startsWith('data:') || avatar.startsWith('http')) return avatar;
    return `https://neon-image-bucket.s3.us-east-1.amazonaws.com/${avatar}`;
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString(locale === 'ar' ? 'ar-SA' : 'en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  return (
    <div className="flex h-full bg-[#f0f2f5] overflow-hidden relative" dir={isRtl ? 'rtl' : 'ltr'}>
      <CallOverlay callStatus={callStatus} otherUser={callOtherUser} onAccept={acceptCall} onReject={rejectCall} onEnd={endCall} />

      {/* Conversations List */}
      <div className={`${selectedConversation ? 'hidden md:flex' : 'flex'} w-full md:w-[350px] lg:w-[400px] flex-col bg-white border-x border-gray-200 h-full`}>
        <div className="bg-[#f0f2f5] px-4 py-[10px] flex items-center justify-between border-b border-gray-200 min-h-[59px]">
          <button onClick={() => router.push(`/${locale}/community`)} className="p-2 hover:bg-gray-200 rounded-full md:hidden">
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <h2 className="text-xl font-semibold text-gray-900">{t('title')}</h2>
          <button className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <MoreVertical className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="p-2 bg-white border-b border-gray-100">
          <div className="relative">
            <Search className={`absolute ${isRtl ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400`} />
            <input
              type="text"
              placeholder={t('searchMessages')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full ${isRtl ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2 bg-[#f0f2f5] rounded-lg text-sm focus:outline-none text-gray-900`}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.filter(c => c.other_user_name?.toLowerCase().includes(searchQuery.toLowerCase())).map((conv) => (
            <button
              key={conv.id}
              onClick={() => setSelectedConversation(conv)}
              className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-[#f5f6f6] transition-colors border-b border-gray-100 ${selectedConversation?.id === conv.id ? 'bg-[#f5f6f6]' : ''}`}
            >
              <div className="relative w-12 h-12 flex-shrink-0">
                <div className="w-full h-full rounded-full overflow-hidden bg-gray-200">
                  <Image src={getAvatarUrl(conv.other_user_avatar)} alt={conv.other_user_name} fill className="object-cover" unoptimized />
                </div>
              </div>
              <div className={`flex-1 min-w-0 ${isRtl ? 'text-right' : 'text-left'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-gray-500">{formatTime(conv.last_message_at || conv.created_at)}</span>
                  <h3 className="font-semibold text-gray-900 truncate">{conv.other_user_name}</h3>
                </div>
                <p className="text-sm text-gray-600 truncate">{conv.last_message || t('noMessages')}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`${!selectedConversation ? 'hidden md:flex' : 'flex'} flex-1 flex-col bg-[#efeae2] h-full relative overflow-hidden`}>
        {selectedConversation ? (
          <>
            <div className="bg-[#f0f2f5] px-4 py-2 flex items-center gap-3 border-b border-gray-200 z-30 min-h-[59px]">
              <button onClick={() => setSelectedConversation(null)} className="p-2 hover:bg-gray-200 rounded-full md:hidden">
                <ArrowLeft className="w-6 h-6 text-gray-600" />
              </button>
              <div className="relative w-10 h-10 flex-shrink-0">
                <div className="w-full h-full rounded-full overflow-hidden bg-gray-200">
                  <Image src={getAvatarUrl(selectedConversation.other_user_avatar)} alt={selectedConversation.other_user_name} fill className="object-cover" unoptimized />
                </div>
              </div>
              <div className={`flex-1 min-w-0 ${isRtl ? 'text-right' : 'text-left'}`}>
                <h3 className="font-semibold text-gray-900 truncate">{selectedConversation.other_user_name}</h3>
                <p className="text-xs text-green-600 font-medium">{isTyping ? t('typing') : t('online')}</p>
              </div>
              <div className="flex items-center gap-4 text-gray-600">
                <button onClick={startCall} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><Phone className="w-5 h-5" /></button>
                <div className="relative" ref={headerMenuRef}>
                  <button onClick={() => setShowHeaderMenu(!showHeaderMenu)} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><MoreVertical className="w-5 h-5" /></button>
                  {showHeaderMenu && (
                    <div className={`absolute ${isRtl ? 'left-0' : 'right-0'} mt-2 w-48 bg-white rounded-lg shadow-xl py-2 z-50 border border-gray-100`}>
                      <button onClick={clearChat} className={`w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 ${isRtl ? 'justify-end text-right' : 'justify-start text-left'}`}><Trash2 className="w-4 h-4" /> {t('clearChat')}</button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#efeae2] relative">
              <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: "url('https://w0.peakpx.com/wallpaper/580/650/wallpaper-whatsapp-background.jpg')", backgroundSize: '400px' }}></div>
              {messages.map((msg) => {
                const isOwn = msg.sender_id === currentUser.id;
                const isDeleted = msg.is_deleted || msg.isDeleted;
                return (
                  <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} relative z-10`}>
                    <div 
                      onClick={() => isOwn && !isDeleted && setSelectedMessageId(selectedMessageId === msg.id ? null : msg.id)}
                      className={`relative max-w-[70%] px-3 py-1.5 rounded-lg shadow-sm cursor-pointer ${isOwn ? 'bg-[#dcf8c6] rounded-tr-none' : 'bg-white rounded-tl-none'}`}
                    >
                      {msg.message_type === 'image' && msg.media_url && (
                        <div className="mb-1 rounded overflow-hidden">
                          <Image src={msg.media_url} alt="Sent image" width={300} height={300} className="object-cover" unoptimized />
                        </div>
                      )}
                      <div className="flex flex-col">
                        <p className={`text-[15px] leading-relaxed text-gray-800 ${isDeleted ? 'italic text-gray-500' : ''}`}>
                          {isDeleted ? t('messageDeleted') : msg.content}
                        </p>
                        <div className="flex items-center gap-1 mt-1 self-end">
                          <span className="text-[10px] text-gray-500 uppercase">{formatTime(msg.created_at)}</span>
                          {isOwn && (msg.is_read ? <CheckCheck className="w-3 h-3 text-blue-500" /> : <Check className="w-3 h-3 text-gray-400" />)}
                        </div>
                      </div>

                      {selectedMessageId === msg.id && isOwn && !isDeleted && (
                        <div className={`absolute ${isRtl ? 'right-0' : 'left-0'} top-full mt-1 z-50 bg-white rounded shadow-xl border border-gray-100 py-1 min-w-[140px] animate-in fade-in zoom-in duration-200`}>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteForEveryone(msg.id); }}
                            className={`w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 ${isRtl ? 'justify-end text-right' : 'justify-start text-left'}`}
                          >
                            <Trash2 className="w-4 h-4" /> {t('deleteForEveryone')}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {isTyping && (
                <div className="flex justify-start relative z-10">
                  <div className="bg-white px-3 py-2 rounded-lg shadow-sm rounded-tl-none flex gap-1">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="bg-[#f0f2f5] p-2 flex items-center gap-2 z-30">
              <div className="relative">
                <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-2 hover:bg-gray-200 rounded-full text-gray-600"><Smile className="w-6 h-6" /></button>
                {showEmojiPicker && (
                  <div className={`absolute bottom-full ${isRtl ? 'right-0' : 'left-0'} mb-2 z-50`}>
                    <EmojiPicker onEmojiClick={onEmojiClick} theme={Theme.LIGHT} searchDisabled />
                  </div>
                )}
              </div>
              <button onClick={() => fileInputRef.current?.click()} className="p-2 hover:bg-gray-200 rounded-full text-gray-600"><Paperclip className="w-6 h-6" /></button>
              <input type="file" ref={fileInputRef} onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) { setSelectedImage(file); const reader = new FileReader(); reader.onloadend = () => setImagePreview(reader.result as string); reader.readAsDataURL(file); }
              }} accept="image/*" className="hidden" />
              <input
                type="text"
                placeholder={t('typeMessage')}
                value={newMessage}
                onChange={(e) => { setNewMessage(e.target.value); handleTyping(); }}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                className="flex-1 px-4 py-2.5 bg-white rounded-lg focus:outline-none text-gray-900"
              />
              <button onClick={sendMessage} disabled={isSending} className="p-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-full disabled:opacity-50">
                <Send className={`w-5 h-5 ${isRtl ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {imagePreview && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
                <div className="bg-white rounded-lg p-4 max-w-lg w-full">
                  <div className="flex justify-between items-center mb-4"><h3 className="font-semibold">{t('imagePreview')}</h3><button onClick={() => { setSelectedImage(null); setImagePreview(null); }}><X className="w-5 h-5" /></button></div>
                  <div className="relative aspect-video mb-4 bg-gray-100 rounded overflow-hidden"><Image src={imagePreview} alt="Preview" fill className="object-contain" /></div>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => { setSelectedImage(null); setImagePreview(null); }} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">{t('cancel')}</button>
                    <button onClick={sendMessage} disabled={isSending} className="px-6 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">{isSending ? t('sending') : t('send')}</button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 bg-[#f8f9fa]">
            <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mb-4"><Send className="w-10 h-10 text-gray-400" /></div>
            <h2 className="text-xl font-medium mb-2">{t('chat')}</h2>
            <p className="text-sm">{t('noConversations')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
