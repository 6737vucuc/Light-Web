'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Image as ImageIcon, Smile, Phone, Video, Info, Search, Edit, MoreHorizontal, Check, CheckCheck, ArrowLeft, Users } from 'lucide-react';
import Image from 'next/image';
import Pusher from 'pusher-js';
import { useRouter } from 'next/navigation';

interface MessengerInstagramProps {
  currentUser: any;
  initialUserId?: number;
  fullPage?: boolean;
}

export default function MessengerInstagram({ currentUser, initialUserId, fullPage = false }: MessengerInstagramProps) {
  const router = useRouter();
  const [conversations, setConversations] = useState<any[]>([]);
  const [mutualFollowers, setMutualFollowers] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'primary' | 'requests'>('primary');
  const [showMutualFollowers, setShowMutualFollowers] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pusherRef = useRef<Pusher | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadConversations();
    loadMutualFollowers();
    
    // Initialize Pusher
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
    if (initialUserId) {
      handleInitialUser();
    }
  }, [initialUserId]);

  const handleInitialUser = async () => {
    if (!initialUserId) return;

    // Check if conversation exists
    const conv = conversations.find(c => 
      c.user?.id === initialUserId
    );

    if (conv) {
      // Conversation exists, select it
      selectConversation(conv);
    } else {
      // Create new conversation
      try {
        const response = await fetch('/api/messages/create-conversation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ otherUserId: initialUserId }),
        });

        if (response.ok) {
          const data = await response.json();
          // Reload conversations to include the new one
          await loadConversations();
          // Find and select the new conversation
          const newConv = conversations.find(c => c.user?.id === initialUserId);
          if (newConv) {
            selectConversation(newConv);
          }
        }
      } catch (error) {
        console.error('Error creating conversation:', error);
      }
    }
  };

  useEffect(() => {
    if (selectedConversation && pusherRef.current) {
      const channel = pusherRef.current.subscribe(`conversation-${selectedConversation.conversationId}`);
      
      channel.bind('new-message', (data: any) => {
        setMessages((prev) => [...prev, data.message]);
        scrollToBottom();
      });

      return () => {
        channel.unbind_all();
        channel.unsubscribe();
      };
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
      const response = await fetch(`/api/messages/conversations?type=${activeTab}`);
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

  const loadMutualFollowers = async () => {
    try {
      const response = await fetch('/api/follow/mutual-followers');
      if (response.ok) {
        const data = await response.json();
        setMutualFollowers(data.mutualFollowers || []);
      }
    } catch (error) {
      console.error('Error loading mutual followers:', error);
    }
  };

  useEffect(() => {
    loadConversations();
  }, [activeTab]);

  const selectConversation = async (conversation: any) => {
    setSelectedConversation(conversation);
    setIsLoading(true);
    setShowMutualFollowers(false);
    
    try {
      const response = await fetch(`/api/messages/conversation/${conversation.user.id}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startConversationWithUser = async (user: any) => {
    // Check if conversation already exists
    const existingConv = conversations.find(c => c.user?.id === user.id);
    
    if (existingConv) {
      selectConversation(existingConv);
      return;
    }

    // Create new conversation
    try {
      const response = await fetch('/api/messages/create-conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otherUserId: user.id }),
      });

      if (response.ok) {
        const data = await response.json();
        await loadConversations();
        
        // Create conversation object and select it
        const newConv = {
          conversationId: data.conversation.id,
          user: user,
          lastMessage: '',
          unreadCount: 0,
          isMutual: true,
        };
        selectConversation(newConv);
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
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

  const sendMessage = async () => {
    if ((!newMessage.trim() && !selectedImage) || !selectedConversation) return;

    setIsSending(true);
    try {
      let mediaUrl = null;
      let messageType = 'text';

      // Upload image if selected
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
          mediaUrl = uploadData.url;
          messageType = 'image';
        }
        setIsUploadingImage(false);
      }

      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          receiverId: selectedConversation.user.id,
          content: newMessage.trim() || (mediaUrl ? 'Sent an image' : ''),
          messageType: messageType,
          mediaUrl: mediaUrl,
        }),
      });

      if (response.ok) {
        setNewMessage('');
        setSelectedImage(null);
        setImagePreview(null);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
      setIsUploadingImage(false);
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

  const filteredConversations = conversations.filter(conv => {
    const user = conv.user;
    return user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           user?.username?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const filteredMutualFollowers = mutualFollowers.filter(user => {
    return user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           user?.username?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className={`flex ${fullPage ? 'h-full' : 'h-[600px]'} bg-white`}>
      {/* Conversations List */}
      <div className={`${selectedConversation && !fullPage ? 'hidden md:flex' : 'flex'} w-full md:w-96 border-r border-gray-200 flex-col`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold">{currentUser?.username || 'Messages'}</h2>
            <button 
              onClick={() => setShowMutualFollowers(!showMutualFollowers)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              title="Show mutual followers"
            >
              <Users className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          
          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search messages"
              className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Tabs */}
          {!showMutualFollowers && (
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('primary')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'primary'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Primary
              </button>
              <button
                onClick={() => setActiveTab('requests')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'requests'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Requests
              </button>
            </div>
          )}
        </div>

        {/* Conversations or Mutual Followers */}
        <div className="flex-1 overflow-y-auto">
          {showMutualFollowers ? (
            // Mutual Followers List
            <>
              <div className="p-3 bg-gray-50 border-b border-gray-200">
                <p className="text-sm text-gray-600 font-medium">Mutual Followers - Start a conversation</p>
              </div>
              {filteredMutualFollowers.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4">
                  <Users className="w-12 h-12 mb-2 opacity-30" />
                  <p className="text-center">No mutual followers yet</p>
                </div>
              ) : (
                filteredMutualFollowers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => startConversationWithUser(user)}
                    className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="relative w-14 h-14 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                      {user.avatar ? (
                        <Image
                          src={getAvatarUrl(user.avatar)}
                          alt={user.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-400 to-pink-400 text-white font-bold text-lg">
                          {user.name?.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-semibold text-sm truncate">{user.name}</p>
                      <p className="text-xs text-gray-500 truncate">@{user.username}</p>
                    </div>
                  </button>
                ))
              )}
            </>
          ) : (
            // Conversations List
            <>
              {isLoading && conversations.length === 0 ? (
                <div className="flex justify-center items-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800"></div>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4">
                  <p className="text-center">
                    {activeTab === 'primary' 
                      ? 'No conversations yet. Click the users icon to start chatting with mutual followers!' 
                      : 'No message requests'}
                  </p>
                </div>
              ) : (
                filteredConversations.map((conversation) => (
                  <button
                    key={conversation.conversationId}
                    onClick={() => selectConversation(conversation)}
                    className={`w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors ${
                      selectedConversation?.conversationId === conversation.conversationId ? 'bg-gray-100' : ''
                    }`}
                  >
                    <div className="relative w-14 h-14 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                      {conversation.user?.avatar ? (
                        <Image
                          src={getAvatarUrl(conversation.user.avatar)}
                          alt={conversation.user.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-400 to-pink-400 text-white font-bold text-lg">
                          {conversation.user?.name?.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-semibold text-sm truncate">{conversation.user?.name}</p>
                        {conversation.unreadCount > 0 && (
                          <span className="bg-purple-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                            {conversation.unreadCount}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 truncate">
                        {conversation.lastMessage || 'Start a conversation'}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className={`${!selectedConversation && !fullPage ? 'hidden md:flex' : 'flex'} flex-1 flex-col`}>
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                {fullPage && (
                  <button
                    onClick={() => setSelectedConversation(null)}
                    className="md:hidden p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                  </button>
                )}
                <button
                  onClick={() => router.push(`/user-profile/${selectedConversation.user.id}`)}
                  className="flex items-center gap-3 hover:bg-gray-50 rounded-lg p-2 -ml-2 transition-colors"
                >
                  <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-200">
                    {selectedConversation.user?.avatar ? (
                      <Image
                        src={getAvatarUrl(selectedConversation.user.avatar)}
                        alt={selectedConversation.user.name}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-400 to-pink-400 text-white font-bold">
                        {selectedConversation.user?.name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-sm">{selectedConversation.user?.name}</p>
                    <p className="text-xs text-gray-500">@{selectedConversation.user?.username}</p>
                  </div>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <Info className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {isLoading ? (
                <div className="flex justify-center items-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-800"></div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <div className="relative w-24 h-24 rounded-full overflow-hidden bg-gray-200 mb-4">
                    {selectedConversation.user?.avatar ? (
                      <Image
                        src={getAvatarUrl(selectedConversation.user.avatar)}
                        alt={selectedConversation.user.name}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-400 to-pink-400 text-white font-bold text-3xl">
                        {selectedConversation.user?.name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <p className="text-lg font-semibold mb-2">{selectedConversation.user?.name}</p>
                  <p className="text-sm text-gray-400 mb-4">@{selectedConversation.user?.username}</p>
                  <p className="text-sm">Send a message to start the conversation</p>
                </div>
              ) : (
                messages.map((message) => {
                  const isMine = message.senderId === currentUser.id;
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex gap-2 max-w-[70%] ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                        {!isMine && (
                          <div className="relative w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                            {selectedConversation.user?.avatar ? (
                              <Image
                                src={getAvatarUrl(selectedConversation.user.avatar)}
                                alt={selectedConversation.user.name}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-400 to-pink-400 text-white text-xs font-bold">
                                {selectedConversation.user?.name?.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                        )}
                        <div>
                          <div
                            className={`rounded-2xl ${
                              message.mediaUrl ? '' : 'px-4 py-2'
                            } ${
                              isMine
                                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                                : 'bg-gray-100 text-gray-900'
                            }`}
                          >
                            {message.mediaUrl && message.messageType === 'image' ? (
                              <div className="rounded-2xl overflow-hidden">
                                <img 
                                  src={message.mediaUrl} 
                                  alt="Sent image" 
                                  className="max-w-xs max-h-64 object-cover"
                                />
                                {message.content && message.content !== 'Sent an image' && (
                                  <p className="text-sm break-words px-4 py-2">{message.content}</p>
                                )}
                              </div>
                            ) : (
                              <p className="text-sm break-words">{message.content}</p>
                            )}
                          </div>
                          <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                            <p className="text-xs text-gray-400">
                              {formatTime(message.createdAt)}
                            </p>
                            {isMine && (
                              message.isRead ? (
                                <CheckCheck className="w-4 h-4 text-blue-500" />
                              ) : (
                                <CheckCheck className="w-4 h-4 text-gray-400" />
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-200">
              {/* Image Preview */}
              {imagePreview && (
                <div className="mb-3 relative inline-block">
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    className="max-h-32 rounded-lg"
                  />
                  <button
                    onClick={() => {
                      setSelectedImage(null);
                      setImagePreview(null);
                    }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
              )}
              
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingImage || isSending}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
                >
                  <ImageIcon className="w-5 h-5 text-blue-500" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <Smile className="w-5 h-5 text-blue-500" />
                </button>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Message..."
                  className="flex-1 px-4 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={isSending || isUploadingImage}
                />
                <button
                  onClick={sendMessage}
                  disabled={(!newMessage.trim() && !selectedImage) || isSending || isUploadingImage}
                  className={`p-2 rounded-full transition-colors ${
                    (newMessage.trim() || selectedImage) && !isSending && !isUploadingImage
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-lg'
                      : 'text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {isUploadingImage ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center mb-4">
              <Send className="w-12 h-12 text-white" />
            </div>
            <p className="text-xl font-semibold mb-2">Your Messages</p>
            <p className="text-sm text-center max-w-xs">
              Send private messages to your mutual followers
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
