'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Image as ImageIcon, ArrowLeft, MoreVertical, Phone, Search, Smile, Paperclip, Mic, X, Check, CheckCheck, Trash2, User as UserIcon } from 'lucide-react';
import Image from 'next/image';
import Pusher from 'pusher-js';
import { useRouter } from 'next/navigation';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import Peer from 'peerjs';
import CallOverlay from './CallOverlay';
import { useToast } from '@/lib/contexts/ToastContext';

interface WhatsAppMessengerProps {
  currentUser: any;
  initialUserId?: number;
  fullPage?: boolean;
}

export default function WhatsAppMessenger({ currentUser, initialUserId, fullPage = false }: WhatsAppMessengerProps) {
  const router = useRouter();
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
  
  // Call States
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'incoming' | 'connected' | 'ended'>('idle');
  const [callOtherUser, setCallOtherUser] = useState({ name: '', avatar: '' as string | null });
  const [peerId, setPeerId] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pusherRef = useRef<Pusher | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const headerMenuRef = useRef<HTMLDivElement>(null);
  
  const peerRef = useRef<Peer | null>(null);
  const currentCallRef = useRef<any>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

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
          currentCallRef.current = { peerId: data.callerPeerId };
        }
      });

      userChannel.bind('call-rejected', () => {
        setCallStatus('ended');
        setTimeout(() => setCallStatus('idle'), 2000);
      });

      const peer = new Peer(`user-${currentUser.id}-${Math.random().toString(36).substr(2, 9)}`);
      peer.on('open', (id) => {
        setPeerId(id);
        peerRef.current = peer;
      });

      peer.on('call', (call) => {
        currentCallRef.current = call;
      });
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
      if (headerMenuRef.current && !headerMenuRef.current.contains(event.target as Node)) {
        setShowHeaderMenu(false);
      }
      if (selectedMessageId !== null) {
        const target = event.target as HTMLElement;
        if (!target.closest('.message-bubble')) {
          setSelectedMessageId(null);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      if (pusherRef.current) pusherRef.current.disconnect();
      if (peerRef.current) peerRef.current.destroy();
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [selectedMessageId]);

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
      subscribeToMessages(selectedConversation.other_user_id);
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
    const channel = pusherRef.current.subscribe(`conversation-${otherUserId}`);
    channel.bind('new-message', (data: any) => {
      setMessages((prev) => {
        if (prev.find(m => m.id === data.message.id)) return prev;
        return [...prev, data.message];
      });
      scrollToBottom();
    });
    
    channel.bind('message-deleted', (data: any) => {
      setMessages((prev) => prev.map(m => 
        m.id === data.messageId ? { ...m, isDeleted: true, content: 'تم حذف هذه الرسالة' } : m
      ));
    });

    channel.bind('messages-read', () => {
      setMessages((prev) => prev.map(m => ({ ...m, isRead: true })));
    });
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
      } else {
        toast.error(data.error || 'Failed to send message');
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error('Error: ' + (error.message || 'Failed to send message'));
    } finally {
      setIsSending(false);
    }
  };

  const deleteForEveryone = async (messageId: number) => {
    const confirmed = await toast.confirm({
      title: 'حذف الرسالة',
      message: 'هل تريد حذف هذه الرسالة لدى الجميع؟',
      confirmText: 'حذف لدى الجميع',
      type: 'danger'
    });

    if (confirmed) {
      try {
        const response = await fetch(`/api/messages/${selectedConversation.other_user_id}?messageId=${messageId}`, {
          method: 'DELETE'
        });
        if (response.ok) {
          setMessages(prev => prev.map(m => 
            m.id === messageId ? { ...m, isDeleted: true, content: 'تم حذف هذه الرسالة' } : m
          ));
          toast.success('تم حذف الرسالة لدى الجميع');
        }
      } catch (error) {
        toast.error('فشل حذف الرسالة');
      }
    }
    setSelectedMessageId(null);
  };

  const clearChat = async () => {
    const confirmed = await toast.confirm({
      title: 'Clear Chat',
      message: 'Are you sure you want to clear this chat? This action cannot be undone.',
      confirmText: 'Clear',
      type: 'danger'
    });
    
    if (confirmed) {
      setMessages([]);
      setShowHeaderMenu(false);
      toast.success('Chat cleared successfully');
    }
  };

  const startCall = async () => {
    if (!selectedConversation || !peerId) return;
    try {
      // Explicitly request microphone permissions
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      setCallOtherUser({ name: selectedConversation.other_user_name, avatar: selectedConversation.other_user_avatar });
      setCallStatus('calling');
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
      toast.error('يرجى السماح بالوصول للميكروفون من إعدادات المتصفح لإجراء المكالمة');
    }
  };

  const acceptCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      if (currentCallRef.current && currentCallRef.current.answer) {
        currentCallRef.current.answer(stream);
        setupCallEvents(currentCallRef.current);
        setCallStatus('connected');
      }
    } catch (err) {
      rejectCall();
    }
  };

  const rejectCall = () => {
    setCallStatus('idle');
    fetch('/api/messages/call/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientId: selectedConversation?.other_user_id })
    });
  };

  const endCall = () => {
    if (currentCallRef.current && currentCallRef.current.close) currentCallRef.current.close();
    if (localStreamRef.current) localStreamRef.current.getTracks().forEach(track => track.stop());
    setCallStatus('ended');
    setTimeout(() => setCallStatus('idle'), 2000);
  };

  const setupCallEvents = (call: any) => {
    call.on('stream', (remoteStream: MediaStream) => {
      if (!remoteAudioRef.current) {
        remoteAudioRef.current = document.createElement('audio');
        remoteAudioRef.current.autoplay = true;
      }
      remoteAudioRef.current.srcObject = remoteStream;
    });
    call.on('close', endCall);
    call.on('error', endCall);
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setNewMessage(prev => prev + emojiData.emoji);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const getAvatarUrl = (avatar?: string | null) => {
    if (!avatar) return '/default-avatar.png';
    if (avatar.startsWith('data:') || avatar.startsWith('http')) return avatar;
    return `https://neon-image-bucket.s3.us-east-1.amazonaws.com/${avatar}`;
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const filteredConversations = conversations.filter(conv =>
    conv.other_user_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#f0f2f5]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-[#f0f2f5] overflow-hidden relative">
      <CallOverlay callStatus={callStatus} otherUser={callOtherUser} onAccept={acceptCall} onReject={rejectCall} onEnd={endCall} />

      {/* Conversations List */}
      <div className={`${selectedConversation ? 'hidden md:flex' : 'flex'} w-full md:w-[350px] lg:w-[400px] flex-col bg-white border-r border-gray-200 h-full`}>
        <div className="bg-[#f0f2f5] px-4 py-[10px] flex items-center justify-between border-b border-gray-200 min-h-[59px]">
          <button onClick={() => router.push('/community')} className="p-2 hover:bg-gray-200 rounded-full md:hidden">
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <h2 className="text-xl font-semibold text-gray-900">Messages</h2>
          <button className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <MoreVertical className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="p-2 bg-white border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#f0f2f5] rounded-lg text-sm focus:outline-none text-gray-900"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4">
              <p>No conversations yet</p>
            </div>
          ) : (
            filteredConversations.map((conv) => (
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
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-gray-900 truncate">{conv.other_user_name}</h3>
                    <span className="text-[11px] text-gray-500">{formatTime(conv.last_message_at || conv.created_at)}</span>
                  </div>
                  <p className="text-sm text-gray-600 truncate">{conv.last_message || 'No messages yet'}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`${!selectedConversation ? 'hidden md:flex' : 'flex'} flex-1 flex-col bg-[#efeae2] h-full relative overflow-hidden`}>
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="bg-[#f0f2f5] px-4 py-2 flex items-center gap-3 border-b border-gray-200 z-30 min-h-[59px]">
              <button onClick={() => setSelectedConversation(null)} className="p-2 hover:bg-gray-200 rounded-full md:hidden">
                <ArrowLeft className="w-6 h-6 text-gray-600" />
              </button>
              <div className="relative w-10 h-10 flex-shrink-0">
                <div className="w-full h-full rounded-full overflow-hidden bg-gray-200">
                  <Image src={getAvatarUrl(selectedConversation.other_user_avatar)} alt={selectedConversation.other_user_name} fill className="object-cover" unoptimized />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 truncate">{selectedConversation.other_user_name}</h3>
                <p className="text-xs text-gray-500">Online</p>
              </div>
              <div className="flex items-center gap-4 text-gray-600">
                <button onClick={startCall} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                  <Phone className="w-5 h-5" />
                </button>
                <div className="relative" ref={headerMenuRef}>
                  <button onClick={() => setShowHeaderMenu(!showHeaderMenu)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                  {showHeaderMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl py-2 z-50 border border-gray-100">
                      <button className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2">
                        <UserIcon className="w-4 h-4" /> View Profile
                      </button>
                      <button onClick={clearChat} className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                        <Trash2 className="w-4 h-4" /> Clear Chat
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Messages List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
              {messages.map((msg) => {
                const isOwn = msg.senderId === currentUser.id;
                const isSelected = selectedMessageId === msg.id;
                return (
                  <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    <div 
                      onClick={() => isOwn && !msg.isDeleted && setSelectedMessageId(isSelected ? null : msg.id)}
                      className={`
                        message-bubble relative max-w-[85%] md:max-w-[65%] px-3 py-1.5 rounded-lg shadow-sm cursor-pointer transition-all
                        ${isOwn ? 'bg-[#d9fdd3] rounded-tr-none' : 'bg-white rounded-tl-none'}
                        ${isSelected ? 'ring-2 ring-blue-400' : ''}
                        ${msg.isDeleted ? 'italic text-gray-500' : 'text-[#111b21]'}
                      `}
                    >
                      {msg.messageType === 'image' && msg.mediaUrl && (
                        <div className="mb-1 rounded overflow-hidden">
                          <img src={msg.mediaUrl} alt="Sent image" className="max-w-full h-auto" />
                        </div>
                      )}
                      <p className="text-[14.5px] leading-relaxed break-words">{msg.content}</p>
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <span className="text-[10px] text-[#667781]">{formatTime(msg.createdAt)}</span>
                        {isOwn && !msg.isDeleted && (
                          msg.isRead ? <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" /> : <CheckCheck className="w-3.5 h-3.5 text-[#667781]" />
                        )}
                      </div>

                      {/* Delete for Everyone Context Menu */}
                      {isSelected && isOwn && !msg.isDeleted && (
                        <div className="absolute bottom-full right-0 mb-2 bg-white rounded-lg shadow-xl py-1 z-50 border border-gray-100 min-w-[140px]">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteForEveryone(msg.id);
                            }}
                            className="w-full px-3 py-2 text-right text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <Trash2 className="w-4 h-4" /> الحذف لدى الجميع
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="bg-[#f0f2f5] p-2 flex items-center gap-2 z-10">
              <div className="relative" ref={emojiPickerRef}>
                <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-2 text-gray-600 hover:text-gray-900">
                  <Smile className="w-6 h-6" />
                </button>
                {showEmojiPicker && (
                  <div className="absolute bottom-full left-0 mb-2 z-50">
                    <EmojiPicker onEmojiClick={onEmojiClick} theme={Theme.LIGHT} />
                  </div>
                )}
              </div>
              <button onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-600 hover:text-gray-900">
                <Paperclip className="w-6 h-6" />
              </button>
              <input type="file" ref={fileInputRef} onChange={handleImageSelect} className="hidden" accept="image/*" />
              
              <div className="flex-1 relative">
                {imagePreview && (
                  <div className="absolute bottom-full left-0 mb-2 p-2 bg-white rounded-lg shadow-lg border border-gray-200">
                    <button onClick={() => {setSelectedImage(null); setImagePreview(null);}} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1">
                      <X className="w-4 h-4" />
                    </button>
                    <img src={imagePreview} alt="Preview" className="h-20 w-20 object-cover rounded" />
                  </div>
                )}
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a message"
                  className="w-full bg-white px-4 py-2 rounded-lg text-sm focus:outline-none text-gray-900"
                />
              </div>
              
              <button onClick={sendMessage} disabled={isSending || (!newMessage.trim() && !selectedImage)} className={`p-2 rounded-full transition-all ${newMessage.trim() || selectedImage ? 'text-[#00a884] scale-110' : 'text-gray-400'}`}>
                <Send className="w-6 h-6" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mb-4">
              <ImageIcon className="w-12 h-12 text-gray-400" />
            </div>
            <h2 className="text-2xl font-light mb-2">WhatsApp Web</h2>
            <p className="text-sm text-center max-w-xs">Send and receive messages without keeping your phone online.</p>
          </div>
        )}
      </div>
    </div>
  );
}
