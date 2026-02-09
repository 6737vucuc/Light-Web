'use client';

import { useState, useEffect, useRef } from 'react';
import { Phone, Video, MoreVertical, ArrowLeft, Check, CheckCheck } from 'lucide-react';
import Image from 'next/image';
import MessageInput from './MessageInput';
import {
  subscribeToMessages,
  subscribeToTyping,
  unsubscribeFromChannel,
  updateTypingIndicator,
} from '@/lib/supabase/realtime';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface Message {
  id: number;
  conversationId: number;
  senderId: number;
  content: string | null;
  messageType: string;
  mediaUrl: string | null;
  isEncrypted: boolean;
  isEdited: boolean;
  isDeleted: boolean;
  replyToId: number | null;
  createdAt: string;
  updatedAt: string;
  senderName: string;
  senderAvatar: string | null;
}

interface Participant {
  id: number;
  name: string;
  avatar: string | null;
  isOnline: boolean;
  lastSeen: string | null;
}

interface ChatWindowProps {
  conversationId: number;
  currentUserId: number;
  participants: Participant[];
  conversationType: string;
  conversationName?: string | null;
  onBack?: () => void;
}

export default function ChatWindow({
  conversationId,
  currentUserId,
  participants,
  conversationType,
  conversationName,
  onBack,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState<Set<number>>(new Set());
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const typingChannelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchMessages();
    markAsRead();
    setupRealtimeSubscriptions();

    return () => {
      // Cleanup subscriptions
      if (channelRef.current) {
        unsubscribeFromChannel(channelRef.current);
      }
      if (typingChannelRef.current) {
        unsubscribeFromChannel(typingChannelRef.current);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async () => {
    try {
      await fetch(`/api/conversations/${conversationId}/read`, {
        method: 'POST',
      });
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const setupRealtimeSubscriptions = () => {
    // Subscribe to new messages
    channelRef.current = subscribeToMessages(
      conversationId,
      (newMessage) => {
        setMessages((prev) => [...prev, newMessage as any]);
        if (newMessage.sender_id !== currentUserId) {
          markAsRead();
        }
      },
      (updatedMessage) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === updatedMessage.id ? (updatedMessage as any) : msg
          )
        );
      },
      (messageId) => {
        setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
      }
    );

    // Subscribe to typing indicators
    typingChannelRef.current = subscribeToTyping(conversationId, (indicator) => {
      if (indicator.user_id !== currentUserId) {
        setTypingUsers((prev) => {
          const newSet = new Set(prev);
          if (indicator.is_typing) {
            newSet.add(indicator.user_id);
          } else {
            newSet.delete(indicator.user_id);
          }
          return newSet;
        });
      }
    });
  };

  const handleSendMessage = async (messageData: {
    content: string;
    messageType: string;
    mediaUrl?: string;
  }) => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageData),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      // Stop typing indicator
      handleTypingStop();
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  };

  const handleTypingStart = () => {
    if (!isTyping) {
      setIsTyping(true);
      updateTypingIndicator(conversationId, currentUserId, true);
    }

    // Reset timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      handleTypingStop();
    }, 3000);
  };

  const handleTypingStop = () => {
    setIsTyping(false);
    updateTypingIndicator(conversationId, currentUserId, false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getAvatarUrl = (avatar?: string | null) => {
    if (!avatar) return '/default-avatar.png';
    if (avatar.startsWith('data:')) return avatar;
    if (avatar.startsWith('http')) return avatar;
    return `https://neon-image-bucket.s3.us-east-1.amazonaws.com/${avatar}`;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const otherParticipant = participants.find((p) => p.id !== currentUserId);
  const displayName =
    conversationType === 'group' ? conversationName : otherParticipant?.name;
  const displayAvatar =
    conversationType === 'group' ? null : otherParticipant?.avatar;
  const isOnline = conversationType === 'direct' && otherParticipant?.isOnline;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-blue-600">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white md:hidden"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="relative flex-shrink-0">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-white/20">
              {displayAvatar ? (
                <Image
                  src={getAvatarUrl(displayAvatar)}
                  alt={displayName || 'User'}
                  width={40}
                  height={40}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-lg font-bold">
                  {displayName?.charAt(0).toUpperCase() || '?'}
                </div>
              )}
            </div>
            {isOnline && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white truncate">
              {displayName || 'Unknown'}
            </h3>
            <p className="text-xs text-purple-100">
              {isOnline ? 'Online' : 'Offline'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white hidden md:block">
            <Phone className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white hidden md:block">
            <Video className="w-5 h-5" />
          </button>
          <button className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 text-center">
              No messages yet. Start the conversation!
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg, index) => {
              const isOwnMessage = msg.senderId === currentUserId;
              const showAvatar =
                !isOwnMessage &&
                (index === messages.length - 1 ||
                  messages[index + 1].senderId !== msg.senderId);

              return (
                <div
                  key={msg.id}
                  className={`flex gap-2 ${
                    isOwnMessage ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {!isOwnMessage && (
                    <div className="w-8 flex-shrink-0">
                      {showAvatar && (
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200">
                          {msg.senderAvatar ? (
                            <Image
                              src={getAvatarUrl(msg.senderAvatar)}
                              alt={msg.senderName}
                              width={32}
                              height={32}
                              className="w-full h-full object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-400 to-pink-400 text-white text-xs font-bold">
                              {msg.senderName.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  <div
                    className={`max-w-[70%] ${
                      isOwnMessage ? 'bg-purple-600 text-white' : 'bg-white'
                    } rounded-2xl px-4 py-2 shadow-sm`}
                  >
                    {!isOwnMessage && (
                      <p className="text-xs font-semibold text-purple-600 mb-1">
                        {msg.senderName}
                      </p>
                    )}
                    {msg.mediaUrl && msg.messageType === 'image' && (
                      <img
                        src={msg.mediaUrl}
                        alt="Shared image"
                        className="rounded-lg mb-2 max-w-full"
                      />
                    )}
                    {msg.content && (
                      <p className={`text-sm ${isOwnMessage ? 'text-white' : 'text-gray-800'}`}>
                        {msg.content}
                      </p>
                    )}
                    <div
                      className={`flex items-center gap-1 mt-1 ${
                        isOwnMessage ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <span
                        className={`text-xs ${
                          isOwnMessage ? 'text-purple-200' : 'text-gray-500'
                        }`}
                      >
                        {formatTime(msg.createdAt)}
                      </span>
                      {isOwnMessage && (
                        <CheckCheck className="w-4 h-4 text-purple-200" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}

        {/* Typing Indicator */}
        {typingUsers.size > 0 && (
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></span>
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></span>
            </div>
            <span>Someone is typing...</span>
          </div>
        )}
      </div>

      {/* Message Input */}
      <MessageInput
        conversationId={conversationId}
        onSendMessage={handleSendMessage}
      />
    </div>
  );
}
