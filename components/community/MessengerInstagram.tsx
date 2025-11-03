'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Send, Search, MoreVertical, Image as ImageIcon, Smile, 
  Phone, Video, Info, Heart, Trash2, Reply, Check, CheckCheck,
  MessageCircle, X
} from 'lucide-react';
import Image from 'next/image';
import Pusher from 'pusher-js';

interface Message {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  mediaUrl?: string;
  messageType: string;
  isRead: boolean;
  readAt?: string;
  reaction?: string;
  createdAt: string;
}

interface Conversation {
  userId: number;
  userName: string;
  username: string;
  userAvatar: string | null;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isOnline: boolean;
}

interface MessengerInstagramProps {
  currentUser?: any;
  initialUserId?: number;
  fullPage?: boolean;
}

export default function MessengerInstagram({ currentUser, initialUserId, fullPage = false }: MessengerInstagramProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [hoveredMessageId, setHoveredMessageId] = useState<number | null>(null);
  const [showConversationInfo, setShowConversationInfo] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pusherRef = useRef<Pusher | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const emojis = ['❤️', '😂', '😮', '😢', '😡', '👍', '🔥', '🎉'];

  useEffect(() => {
    fetchConversations();
    initializePusher();

    // If initialUserId is provided, open that conversation
    if (initialUserId) {
      openConversationByUserId(initialUserId);
    }

    return () => {
      if (pusherRef.current) {
        pusherRef.current.disconnect();
      }
    };
  }, [initialUserId]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.userId);
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializePusher = () => {
    if (!pusherRef.current && currentUser) {
      pusherRef.current = new Pusher(process.env.NEXT_PUBLIC_PUSHER_APP_KEY || '', {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'eu',
      });

      const channel = pusherRef.current.subscribe(`private-user-${currentUser.id}`);
      
      channel.bind('new-message', (data: Message) => {
        if (selectedConversation && data.senderId === selectedConversation.userId) {
          setMessages((prev) => [...prev, data]);
          markAsRead(data.id);
        }
        fetchConversations();
      });

      channel.bind('typing', (data: { userId: number; isTyping: boolean }) => {
        if (selectedConversation && data.userId === selectedConversation.userId) {
          setIsTyping(data.isTyping);
        }
      });

      channel.bind('message-read', (data: { messageIds: number[] }) => {
        setMessages((prev) =>
          prev.map((msg) =>
            data.messageIds.includes(msg.id) ? { ...msg, isRead: true, readAt: new Date().toISOString() } : msg
          )
        );
      });
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    try {
      const response = await fetch('/api/messages/conversations');
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const openConversationByUserId = async (userId: number) => {
    try {
      const response = await fetch(`/api/users/${userId}`);
      if (response.ok) {
        const data = await response.json();
        const conversation: Conversation = {
          userId: data.user.id,
          userName: data.user.name,
          username: data.user.username,
          userAvatar: data.user.avatar,
          lastMessage: '',
          lastMessageTime: '',
          unreadCount: 0,
          isOnline: false,
        };
        setSelectedConversation(conversation);
      }
    } catch (error) {
      console.error('Error opening conversation:', error);
    }
  };

  const fetchMessages = async (userId: number) => {
    try {
      console.log('Fetching messages for user:', userId);
      const response = await fetch(`/api/messages/user/${userId}`);
      console.log('Response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Messages data:', data);
        setMessages(data.messages || []);
        
        // Mark all messages as read
        const unreadMessageIds = data.messages
          .filter((msg: Message) => !msg.isRead && msg.receiverId === currentUser?.id)
          .map((msg: Message) => msg.id);
        
        if (unreadMessageIds.length > 0) {
          await fetch('/api/messages/mark-read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messageIds: unreadMessageIds }),
          });
        }
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const markAsRead = async (messageId: number) => {
    try {
      await fetch('/api/messages/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageIds: [messageId] }),
      });
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedImage) || !selectedConversation) return;

    try {
      let mediaUrl = null;

      // Upload image if selected
      if (selectedImage) {
        const formData = new FormData();
        formData.append('file', selectedImage);

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          mediaUrl = uploadData.url;
        }
      }

      const response = await fetch('/api/messages/private', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId: selectedConversation.userId,
          content: mediaUrl || newMessage, // Use mediaUrl if no text message
          mediaUrl,
          messageType: mediaUrl ? 'image' : 'text',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Decrypt and add the new message
        const newMsg = data.data || data.message;
        if (newMsg) {
          setMessages((prev) => [...prev, {
            ...newMsg,
            content: newMessage, // Use the original message content
          }]);
        }
        setNewMessage('');
        setSelectedImage(null);
        setImagePreview(null);
        fetchConversations();
      } else {
        const errorData = await response.json();
        console.error('Failed to send message:', errorData);
        alert(errorData.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleTyping = () => {
    if (!selectedConversation) return;

    // Send typing indicator
    fetch('/api/messages/typing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        receiverId: selectedConversation.userId,
        isTyping: true,
      }),
    });

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      fetch('/api/messages/typing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId: selectedConversation.userId,
          isTyping: false,
        }),
      });
    }, 2000);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleReaction = async (messageId: number, reaction: string) => {
    try {
      const response = await fetch(`/api/messages/${messageId}/reaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reaction }),
      });

      if (response.ok) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId ? { ...msg, reaction } : msg
          )
        );
      }
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };

  const handleDeleteMessage = async (messageId: number) => {
    try {
      const response = await fetch(`/api/messages/${messageId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
      }
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const getAvatarUrl = (avatar?: string | null) => {
    if (!avatar) return '/default-avatar.png';
    if (avatar.startsWith('data:')) return avatar;
    if (avatar.startsWith('http')) return avatar;
    return `https://neon-image-bucket.s3.us-east-1.amazonaws.com/${avatar}`;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 24) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const filteredConversations = conversations.filter(
    (conv) =>
      conv.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStartCall = async (type: 'audio' | 'video') => {
    if (!selectedConversation) return;

    try {
      // Map 'audio' to 'voice' for API
      const apiCallType = type === 'audio' ? 'voice' : 'video';
      
      // Create a call
      const response = await fetch('/api/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId: selectedConversation.userId,
          callType: apiCallType,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.call) {
          // Redirect to call page
          window.location.href = `/call/${data.call.id}`;
        } else {
          alert('Failed to start call. Please try again.');
        }
      } else {
        const errorData = await response.json();
        console.error('Failed to start call:', errorData);
        alert(errorData.error || 'Failed to start call. Please try again.');
      }
    } catch (error) {
      console.error('Error starting call:', error);
      alert('Failed to start call. Please try again.');
    }
  };

  return (
    <div className={`flex ${fullPage ? 'h-full' : 'h-[calc(100vh-200px)]'} bg-white ${fullPage ? '' : 'border border-gray-200 rounded-lg'} overflow-hidden relative`}>
      {/* Conversations List */}
      <div className={`${selectedConversation ? 'hidden md:flex' : 'flex'} w-full md:w-96 border-r border-gray-200 flex-col`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">{currentUser?.username}</h2>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search"
              className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 px-4">
              <MessageCircle className="w-16 h-16 mb-4" />
              <p className="text-center">No conversations yet</p>
              <p className="text-sm text-center mt-2">Start a conversation from a user's profile</p>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <button
                key={conv.userId}
                onClick={() => setSelectedConversation(conv)}
                className={`w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors ${
                  selectedConversation?.userId === conv.userId ? 'bg-gray-100' : ''
                }`}
              >
                <div className="relative">
                  <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-200">
                    <Image
                      src={getAvatarUrl(conv.userAvatar)}
                      alt={conv.userName}
                      width={56}
                      height={56}
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  {conv.isOnline && (
                    <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                  )}
                </div>

                <div className="flex-1 text-left overflow-hidden">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm">{conv.username}</span>
                    <span className="text-xs text-gray-500">{formatTime(conv.lastMessageTime)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className={`text-sm truncate ${conv.unreadCount > 0 ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>
                      {conv.lastMessage || 'Start a conversation'}
                    </p>
                    {conv.unreadCount > 0 && (
                      <span className="ml-2 px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className={`${selectedConversation ? 'flex' : 'hidden md:flex'} flex-1 flex-col`}>
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Back Button for Mobile */}
                <button
                  onClick={() => setSelectedConversation(null)}
                  className="md:hidden p-2 hover:bg-gray-100 rounded-full transition-colors"
                  title="Back"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200">
                  <Image
                    src={getAvatarUrl(selectedConversation.userAvatar)}
                    alt={selectedConversation.userName}
                    width={40}
                    height={40}
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <div>
                  <div className="font-semibold text-sm">{selectedConversation.username}</div>
                  {isTyping && (
                    <div className="text-xs text-gray-500">typing...</div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <button 
                  onClick={() => handleStartCall('audio')}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  title="Audio Call"
                >
                  <Phone className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => handleStartCall('video')}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  title="Video Call"
                >
                  <Video className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setShowConversationInfo(!showConversationInfo)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  title="Conversation Info"
                >
                  <Info className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => {
                const isSent = message.senderId === currentUser?.id;
                return (
                  <div
                    key={message.id}
                    className={`flex ${isSent ? 'justify-end' : 'justify-start'}`}
                    onMouseEnter={() => setHoveredMessageId(message.id)}
                    onMouseLeave={() => setHoveredMessageId(null)}
                  >
                    <div className={`max-w-md ${isSent ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                      {message.messageType === 'image' && message.mediaUrl ? (
                        <div className="relative rounded-2xl overflow-hidden">
                          <Image
                            src={message.mediaUrl}
                            alt="Message image"
                            width={300}
                            height={300}
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <div
                          className={`px-4 py-2 rounded-2xl ${
                            isSent
                              ? 'bg-blue-500 text-white'
                              : 'bg-gray-100 text-gray-900'
                          }`}
                        >
                          {message.content}
                        </div>
                      )}

                      {/* Reaction */}
                      {message.reaction && (
                        <div className="text-lg -mt-2">{message.reaction}</div>
                      )}

                      {/* Message Info */}
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{formatTime(message.createdAt)}</span>
                        {isSent && (
                          <>
                            {message.isRead ? (
                              <CheckCheck className="w-3 h-3 text-blue-500" />
                            ) : (
                              <Check className="w-3 h-3" />
                            )}
                          </>
                        )}
                      </div>

                      {/* Quick Actions */}
                      {hoveredMessageId === message.id && (
                        <div className="flex items-center gap-1 mt-1">
                          <button
                            onClick={() => setShowEmojiPicker(true)}
                            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                          >
                            <Smile className="w-4 h-4 text-gray-500" />
                          </button>
                          {isSent && (
                            <button
                              onClick={() => handleDeleteMessage(message.id)}
                              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                            >
                              <Trash2 className="w-4 h-4 text-gray-500" />
                            </button>
                          )}
                        </div>
                      )}

                      {/* Emoji Picker */}
                      {showEmojiPicker && hoveredMessageId === message.id && (
                        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-full px-2 py-1 shadow-lg">
                          {emojis.map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => {
                                handleReaction(message.id, emoji);
                                setShowEmojiPicker(false);
                              }}
                              className="text-lg hover:scale-125 transition-transform"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Image Preview */}
            {imagePreview && (
              <div className="px-4 py-2 border-t border-gray-200">
                <div className="relative inline-block">
                  <Image
                    src={imagePreview}
                    alt="Preview"
                    width={100}
                    height={100}
                    className="rounded-lg object-cover"
                  />
                  <button
                    onClick={() => {
                      setSelectedImage(null);
                      setImagePreview(null);
                    }}
                    className="absolute -top-2 -right-2 p-1 bg-gray-900 text-white rounded-full hover:bg-gray-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Input Area */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200">
              <div className="flex items-center gap-2">
                <label className="cursor-pointer p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <ImageIcon className="w-6 h-6 text-gray-600" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </label>

                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    handleTyping();
                  }}
                  placeholder="Message..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                <button
                  type="submit"
                  disabled={!newMessage.trim() && !selectedImage}
                  className="p-2 text-blue-500 hover:text-blue-600 disabled:text-gray-400 disabled:cursor-not-allowed font-semibold"
                >
                  Send
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
            <div className="w-24 h-24 border-4 border-gray-900 rounded-full flex items-center justify-center mb-4">
              <Send className="w-12 h-12" />
            </div>
            <h3 className="text-2xl font-light mb-2">Your Messages</h3>
            <p className="text-sm text-center">Send private photos and messages to a friend or group</p>
          </div>
        )}
      </div>

      {/* Conversation Info Sidebar (Instagram Style) */}
      {showConversationInfo && selectedConversation && (
        <div className="w-80 border-l border-gray-200 flex flex-col bg-white">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold">Details</h3>
            <button
              onClick={() => setShowConversationInfo(false)}
              className="p-1 hover:bg-gray-100 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Info */}
          <div className="p-6 flex flex-col items-center border-b border-gray-200">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200 mb-3">
              <Image
                src={getAvatarUrl(selectedConversation.userAvatar)}
                alt={selectedConversation.userName}
                width={80}
                height={80}
                className="object-cover"
                unoptimized
              />
            </div>
            <h4 className="font-semibold text-lg">{selectedConversation.userName}</h4>
            <p className="text-sm text-gray-500">@{selectedConversation.username}</p>
            <button
              onClick={() => window.location.href = `/user-profile/${selectedConversation.userId}`}
              className="mt-3 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-semibold transition-colors"
            >
              View Profile
            </button>
          </div>

          {/* Options */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 space-y-2">
              <button className="w-full p-3 text-left hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-3">
                <Phone className="w-5 h-5" />
                <span>Audio Call</span>
              </button>
              <button className="w-full p-3 text-left hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-3">
                <Video className="w-5 h-5" />
                <span>Video Call</span>
              </button>
            </div>

            <div className="border-t border-gray-200 p-4 space-y-2">
              <button className="w-full p-3 text-left hover:bg-gray-50 rounded-lg transition-colors text-sm">
                Mute Notifications
              </button>
              <button className="w-full p-3 text-left hover:bg-gray-50 rounded-lg transition-colors text-sm text-red-600">
                Block User
              </button>
              <button className="w-full p-3 text-left hover:bg-gray-50 rounded-lg transition-colors text-sm text-red-600">
                Delete Conversation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
