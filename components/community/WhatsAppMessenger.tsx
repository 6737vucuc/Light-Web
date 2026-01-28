'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Image as ImageIcon, ArrowLeft, MoreVertical, Phone, Video, Search, Smile, Paperclip, Mic, X, Reply, Check, CheckCheck } from 'lucide-react';
import Image from 'next/image';
import Pusher from 'pusher-js';
import { useRouter } from 'next/navigation';

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
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [longPressedMessage, setLongPressedMessage] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pusherRef = useRef<Pusher | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadConversations();
    
    if (typeof window !== 'undefined') {
      pusherRef.current = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY || '', {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us2',
      });
    }

    return () => {
      if (pusherRef.current) {
        pusherRef.current.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    if (!initialUserId || isLoading) return;
    
    const existingConv = conversations.find(
      (conv) => conv.other_user_id === initialUserId
    );
    
    if (existingConv) {
      setSelectedConversation(existingConv);
    } else {
      openConversationWithUser(initialUserId);
    }
  }, [initialUserId, conversations, isLoading]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
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

  const loadMessages = async (conversationId: number) => {
    try {
      const response = await fetch(`/api/messages/${conversationId}`);
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
    if ((!newMessage.trim() && !selectedImage) || !selectedConversation || isSending) return;

    setIsSending(true);

    try {
      let imageUrl = null;

      if (selectedImage) {
        setIsUploadingImage(true);
        const formData = new FormData();
        formData.append('file', selectedImage);

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          imageUrl = uploadData.url;
        }
        setIsUploadingImage(false);
      }

      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: selectedConversation.id,
          content: newMessage.trim(),
          mediaUrl: imageUrl,
          replyToId: replyingTo?.id,
        }),
      });

      if (response.ok) {
        setNewMessage('');
        setSelectedImage(null);
        setImagePreview(null);
        setReplyingTo(null);
        loadMessages(selectedConversation.id);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLongPress = (message: any) => {
    setLongPressedMessage(message);
  };

  const handleMessageTouchStart = (message: any) => {
    longPressTimer.current = setTimeout(() => {
      handleLongPress(message);
    }, 500);
  };

  const handleMessageTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  const getAvatarUrl = (avatar?: string) => {
    if (!avatar) return '/default-avatar.png';
    if (avatar.startsWith('data:')) return avatar;
    if (avatar.startsWith('http')) return avatar;
    return `https://neon-image-bucket.s3.us-east-1.amazonaws.com/${avatar}`;
  };

  const formatTime = (date: string) => {
    const messageDate = new Date(date);
    return messageDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (date: string) => {
    const messageDate = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (messageDate.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (messageDate.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return messageDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
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
    <div className="flex h-full bg-[#f0f2f5] overflow-hidden">
      {/* Conversations List */}
      <div className={`${selectedConversation ? 'hidden md:flex' : 'flex'} w-full md:w-[400px] flex-col bg-white border-r border-gray-200`}>
        {/* Header */}
        <div className="bg-[#f0f2f5] px-4 py-3 flex items-center justify-between border-b border-gray-200">
          <button onClick={() => router.push('/community')} className="md:hidden">
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <h2 className="text-xl font-semibold text-gray-900">Messages</h2>
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-gray-200 rounded-full transition-colors">
              <MoreVertical className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="p-2 bg-white border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#f0f2f5] rounded-lg text-sm focus:outline-none text-gray-900 placeholder:text-gray-500"
            />
          </div>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 px-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                <Send className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-center">No conversations yet</p>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setSelectedConversation(conv)}
                className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-[#f5f6f6] transition-colors border-b border-gray-100 ${
                  selectedConversation?.id === conv.id ? 'bg-[#f5f6f6]' : ''
                }`}
              >
                <div className="relative w-12 h-12 flex-shrink-0">
                  <div className="w-full h-full rounded-full overflow-hidden bg-gray-200">
                    {conv.other_user_avatar ? (
                      <Image src={getAvatarUrl(conv.other_user_avatar)} alt={conv.other_user_name} fill className="object-cover" unoptimized />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-600 to-pink-500 text-white text-lg font-bold">
                        {conv.other_user_name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-gray-900 truncate">{conv.other_user_name}</h3>
                    <span className="text-xs text-gray-500 ml-2">{formatTime(conv.last_message_at || conv.created_at)}</span>
                  </div>
                  <p className="text-sm text-gray-600 truncate">{conv.last_message || 'No messages yet'}</p>
                </div>
                {conv.unread_count > 0 && (
                  <div className="w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-xs text-white font-semibold">{conv.unread_count}</span>
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`${!selectedConversation ? 'hidden md:flex' : 'flex'} flex-1 flex-col bg-[#efeae2] relative`}>
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="bg-[#f0f2f5] px-4 py-2 flex items-center gap-3 border-b border-gray-200 z-10">
              <button onClick={() => setSelectedConversation(null)} className="md:hidden">
                <ArrowLeft className="w-6 h-6 text-gray-600" />
              </button>
              <div className="relative w-10 h-10 flex-shrink-0">
                <div className="w-full h-full rounded-full overflow-hidden bg-gray-200">
                  {selectedConversation.other_user_avatar ? (
                    <Image src={getAvatarUrl(selectedConversation.other_user_avatar)} alt={selectedConversation.other_user_name} fill className="object-cover" unoptimized />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-600 to-pink-500 text-white font-bold">
                      {selectedConversation.other_user_name?.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{selectedConversation.other_user_name}</h3>
                <p className="text-xs text-gray-500">Online</p>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-gray-200 rounded-full transition-colors"><Video className="w-5 h-5 text-gray-600" /></button>
                <button className="p-2 hover:bg-gray-200 rounded-full transition-colors"><Phone className="w-5 h-5 text-gray-600" /></button>
                <button className="p-2 hover:bg-gray-200 rounded-full transition-colors"><MoreVertical className="w-5 h-5 text-gray-600" /></button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#efeae2] bg-opacity-90" style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundBlendMode: 'overlay' }}>
              {messages.map((message, index) => {
                const isOwnMessage = message.sender_id === currentUser.id;
                const showDate = index === 0 || formatDate(messages[index - 1].created_at) !== formatDate(message.created_at);
                return (
                  <div key={message.id}>
                    {showDate && (
                      <div className="flex justify-center my-4">
                        <div className="bg-white/90 px-3 py-1 rounded-lg shadow-sm">
                          <span className="text-xs text-gray-600 font-medium">{formatDate(message.created_at)}</span>
                        </div>
                      </div>
                    )}
                    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-lg px-3 py-2 shadow-sm relative ${isOwnMessage ? 'bg-[#d9fdd3]' : 'bg-white'}`}>
                        {message.reply_to && (
                          <div className="bg-black/5 border-l-4 border-purple-600 pl-2 py-1 mb-2 rounded">
                            <p className="text-[11px] text-purple-700 font-bold">{message.reply_to_user_name}</p>
                            <p className="text-xs text-gray-600 truncate">{message.reply_to_content}</p>
                          </div>
                        )}
                        {message.media_url && (
                          <div className="relative w-full h-48 rounded-lg overflow-hidden mb-2">
                            <Image src={message.media_url} alt="Message image" fill className="object-cover" unoptimized />
                          </div>
                        )}
                        <p className="text-[14.2px] text-black whitespace-pre-wrap break-words leading-relaxed">
                          {message.content}
                        </p>
                        <div className="flex items-center justify-end gap-1 mt-1">
                          <span className="text-[10px] text-gray-500">{formatTime(message.created_at)}</span>
                          {isOwnMessage && (message.is_read ? <CheckCheck className="w-4 h-4 text-[#53bdeb]" /> : <Check className="w-4 h-4 text-gray-500" />)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="bg-[#f0f2f5] px-4 py-3 flex items-center gap-3 border-t border-gray-200">
              <button className="p-2 hover:bg-gray-200 rounded-full transition-colors"><Smile className="w-6 h-6 text-gray-600" /></button>
              <button onClick={() => fileInputRef.current?.click()} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><Paperclip className="w-6 h-6 text-gray-600" /></button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
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
                className="flex-1 px-4 py-2.5 bg-white rounded-lg text-[15px] text-black focus:outline-none shadow-sm"
              />
              <button
                onClick={sendMessage}
                disabled={isSending || (!newMessage.trim() && !selectedImage)}
                className={`p-2.5 rounded-full transition-all ${
                  newMessage.trim() || selectedImage 
                    ? 'bg-[#00a884] text-white shadow-md hover:bg-[#008f6f]' 
                    : 'text-gray-500 hover:bg-gray-200'
                }`}
              >
                {newMessage.trim() || selectedImage ? <Send className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center bg-[#f8f9fa] border-l border-gray-200">
            <div className="text-center px-4">
              <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Send className="w-12 h-12 text-purple-600" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Light Web Messenger</h2>
              <p className="text-gray-600 max-w-md">Select a conversation to start messaging.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
