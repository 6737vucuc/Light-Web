'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Image as ImageIcon, ArrowLeft, MoreVertical, Phone, Search, Smile, Paperclip, Mic, X, Check, CheckCheck, Trash2, User as UserIcon } from 'lucide-react';
import Image from 'next/image';
import Pusher from 'pusher-js';
import { useRouter } from 'next/navigation';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';

interface WhatsAppMessengerProps {
  currentUser: any;
  initialUserId?: number;
  fullPage?: boolean;
}

export default function WhatsAppMessenger({ currentUser, initialUserId, fullPage = false }: WhatsAppMessengerProps) {
  const router = useRouter();
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
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pusherRef = useRef<Pusher | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const headerMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversations();
    if (typeof window !== 'undefined') {
      pusherRef.current = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY || '', {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us2',
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
  }, []);

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
      subscribeToMessages(selectedConversation.id);
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

  const subscribeToMessages = (conversationId: number) => {
    if (!pusherRef.current) return;
    const channel = pusherRef.current.subscribe(`conversation-${conversationId}`);
    channel.bind('new-message', (data: any) => {
      setMessages((prev) => [...prev, data.message]);
      scrollToBottom();
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

      // Corrected API path: /api/messages/[otherUserId]
      const response = await fetch(`/api/messages/${selectedConversation.other_user_id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content,
          mediaUrl: imageUrl,
          messageType: imageUrl ? 'image' : 'text'
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(prev => [...prev, data.message]);
        setNewMessage('');
        setSelectedImage(null);
        setImagePreview(null);
        setShowEmojiPicker(false);
        scrollToBottom();
      } else {
        const errorData = await response.json();
        console.error('Failed to send message:', errorData.error);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
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

  const formatDate = (date: string) => {
    const d = new Date(date);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Today';
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleCall = () => {
    window.location.href = `tel:${selectedConversation.other_user_phone || ''}`;
  };

  const clearChat = async () => {
    if (!confirm('Are you sure you want to clear this chat?')) return;
    setMessages([]);
    setShowHeaderMenu(false);
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
      {/* Conversations List */}
      <div className={`${selectedConversation ? 'hidden md:flex' : 'flex'} w-full md:w-[350px] lg:w-[400px] flex-col bg-white border-r border-gray-200 h-full`}>
        <div className="bg-[#f0f2f5] px-4 py-[10px] flex items-center justify-between border-b border-gray-200 min-h-[59px]">
          <button onClick={() => router.push('/community')} className="p-2 hover:bg-gray-200 rounded-full md:hidden">
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <h2 className="text-xl font-semibold text-gray-900">Messages</h2>
          <div className="relative">
            <button className="p-2 hover:bg-gray-200 rounded-full transition-colors">
              <MoreVertical className="w-5 h-5 text-gray-600" />
            </button>
          </div>
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
                <p className="text-[11px] text-green-600 font-medium">Online</p>
              </div>
              <div className="flex items-center gap-1 sm:gap-2 relative">
                <button onClick={handleCall} className="p-2 hover:bg-gray-200 rounded-full transition-colors" title="Call">
                  <Phone className="w-5 h-5 text-gray-600" />
                </button>
                <button onClick={() => setShowHeaderMenu(!showHeaderMenu)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                  <MoreVertical className="w-5 h-5 text-gray-600" />
                </button>
                
                {/* Header Menu */}
                {showHeaderMenu && (
                  <div ref={headerMenuRef} className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-xl border border-gray-100 py-1 z-50">
                    <button onClick={() => router.push(`/user-profile/${selectedConversation.other_user_id}`)} className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                      <UserIcon className="w-4 h-4" /> View Profile
                    </button>
                    <button onClick={clearChat} className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                      <Trash2 className="w-4 h-4" /> Clear Chat
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Messages Container */}
            <div 
              className="flex-1 overflow-y-auto p-4 space-y-2 relative"
              style={{ 
                backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")',
                backgroundBlendMode: 'overlay',
                backgroundColor: '#efeae2'
              }}
            >
              {messages.map((message, index) => {
                const isOwnMessage = message.sender_id === currentUser.id;
                const showDate = index === 0 || formatDate(messages[index - 1].created_at) !== formatDate(message.created_at);
                return (
                  <div key={message.id}>
                    {showDate && (
                      <div className="flex justify-center my-4">
                        <div className="bg-white/90 px-3 py-1 rounded-lg shadow-sm text-[11px] text-gray-600 font-medium">
                          {formatDate(message.created_at)}
                        </div>
                      </div>
                    )}
                    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] sm:max-w-[75%] rounded-lg px-3 py-1.5 shadow-sm relative ${isOwnMessage ? 'bg-[#d9fdd3]' : 'bg-white'}`}>
                        {message.media_url && (
                          <div className="relative w-full min-w-[150px] h-48 rounded-lg overflow-hidden mb-1.5">
                            <Image src={message.media_url} alt="Message image" fill className="object-cover" unoptimized />
                          </div>
                        )}
                        <p className="text-[14.5px] text-black whitespace-pre-wrap break-words leading-normal pr-10">
                          {message.content}
                        </p>
                        <div className="absolute bottom-1 right-1.5 flex items-center gap-0.5">
                          <span className="text-[10px] text-gray-500">{formatTime(message.created_at)}</span>
                          {isOwnMessage && (message.is_read ? <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" /> : <Check className="w-3.5 h-3.5 text-gray-400" />)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} className="h-2" />
            </div>

            {/* Input Area */}
            <div className="bg-[#f0f2f5] p-2 sm:p-3 flex items-center gap-2 sm:gap-3 border-t border-gray-200 z-30 relative">
              <div className="flex items-center">
                <div className="relative" ref={emojiPickerRef}>
                  <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                    <Smile className="w-6 h-6 text-gray-600" />
                  </button>
                  {showEmojiPicker && (
                    <div className="absolute bottom-full left-0 mb-2 z-50">
                      <EmojiPicker onEmojiClick={onEmojiClick} theme={Theme.LIGHT} />
                    </div>
                  )}
                </div>
                <button onClick={() => fileInputRef.current?.click()} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                  <Paperclip className="w-6 h-6 text-gray-600" />
                </button>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
              
              <div className="flex-1 relative">
                {imagePreview && (
                  <div className="absolute bottom-full left-0 mb-2 p-2 bg-white rounded-lg shadow-lg flex items-center gap-2 border border-gray-200">
                    <div className="relative w-12 h-12 rounded overflow-hidden">
                      <Image src={imagePreview} alt="Preview" fill className="object-cover" />
                    </div>
                    <button onClick={() => {setSelectedImage(null); setImagePreview(null);}} className="p-1 bg-gray-100 rounded-full hover:bg-gray-200">
                      <X className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                )}
                <input
                  type="text"
                  placeholder="Type a message"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  className="w-full px-4 py-2.5 bg-white rounded-lg text-[15px] text-black focus:outline-none shadow-sm"
                />
              </div>

              <button
                onClick={sendMessage}
                disabled={isSending || (!newMessage.trim() && !selectedImage)}
                className={`p-2.5 rounded-full transition-all flex-shrink-0 ${
                  newMessage.trim() || selectedImage 
                    ? 'bg-[#00a884] text-white shadow-md hover:bg-[#008f6f]' 
                    : 'bg-transparent text-gray-500 hover:bg-gray-200'
                }`}
              >
                {newMessage.trim() || selectedImage ? <Send className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center bg-[#f8f9fa] p-4">
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-4 shadow-lg">
              <Send className="w-12 h-12 text-purple-600" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">Light Web Messenger</h2>
            <p className="text-gray-600 text-center max-w-md">Select a conversation to start messaging.</p>
          </div>
        )}
      </div>
    </div>
  );
}
