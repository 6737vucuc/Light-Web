'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Trash2, Clock } from 'lucide-react';
import Image from 'next/image';
import Pusher from 'pusher-js';

interface Message {
  id: number;
  userId: number;
  content: string;
  createdAt: string;
  user: {
    id: number;
    name: string;
    avatar?: string;
  };
}

interface GroupChatProps {
  currentUser: any;
}

export default function GroupChat({ currentUser }: GroupChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [nextCleanup, setNextCleanup] = useState<Date | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pusherRef = useRef<Pusher | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Calculate next cleanup time (next full hour)
    const now = new Date();
    const next = new Date(now);
    next.setHours(now.getHours() + 1, 0, 0, 0);
    setNextCleanup(next);

    // Fetch messages
    fetchMessages();

    // Initialize Pusher for real-time updates
    if (!pusherRef.current) {
      pusherRef.current = new Pusher(process.env.NEXT_PUBLIC_PUSHER_APP_KEY || '', {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'eu',
      });

      const channel = pusherRef.current.subscribe('group-chat');
      
      channel.bind('new-message', (data: Message) => {
        setMessages((prev) => [...prev, data]);
      });

      channel.bind('messages-cleared', () => {
        setMessages([]);
        // Update next cleanup time
        const now = new Date();
        const next = new Date(now);
        next.setHours(now.getHours() + 1, 0, 0, 0);
        setNextCleanup(next);
      });
    }

    // Check for cleanup every 5 minutes (reduced from 1 minute)
    const cleanupInterval = setInterval(() => {
      const now = new Date();
      if (nextCleanup && now >= nextCleanup) {
        // Trigger cleanup
        fetch('/api/messages/group/cleanup', { method: 'POST' })
          .catch(console.error);
      }
    }, 300000); // Check every 5 minutes

    return () => {
      clearInterval(cleanupInterval);
      if (pusherRef.current) {
        pusherRef.current.unsubscribe('group-chat');
      }
    };
  }, [nextCleanup]);

  const fetchMessages = async () => {
    try {
      const response = await fetch('/api/messages/group');
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const response = await fetch('/api/messages/group', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMessage }),
      });

      if (response.ok) {
        setNewMessage('');
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const getAvatarUrl = (avatar?: string) => {
    if (!avatar) return '/default-avatar.png';
    if (avatar.startsWith('data:')) return avatar;
    if (avatar.startsWith('http')) return avatar;
    return `https://neon-image-bucket.s3.us-east-1.amazonaws.com/${avatar}`;
  };

  const getTimeUntilCleanup = () => {
    if (!nextCleanup) return '';
    const now = new Date();
    const diff = nextCleanup.getTime() - now.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'less than a minute';
    if (minutes === 1) return '1 minute';
    return `${minutes} minutes`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-500 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center">
              <span className="w-3 h-3 bg-green-400 rounded-full mr-2 animate-pulse"></span>
              Group Chat
            </h2>
            <p className="text-purple-100 text-sm mt-1">Everyone can chat here</p>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg px-3 py-2">
            <div className="flex items-center text-white text-sm">
              <Clock className="w-4 h-4 mr-2" />
              <span className="font-medium">Cleanup in {getTimeUntilCleanup()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="h-[500px] overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-900">
            <Trash2 className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg font-medium">No messages yet</p>
            <p className="text-sm">Be the first to start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwnMessage = message.userId === currentUser?.id;
            return (
              <div
                key={message.id}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} animate-fadeIn`}
              >
                <div className={`flex ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'} items-start max-w-[70%]`}>
                  {/* Avatar */}
                  <div className="flex-shrink-0 mx-2">
                    <div className="relative w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-purple-100 to-blue-100">
                      {message.user.avatar ? (
                        <Image
                          src={getAvatarUrl(message.user.avatar)}
                          alt={message.user.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-purple-600 font-bold text-xs">
                          {message.user.name?.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Message Bubble */}
                  <div>
                    <div className={`mb-1 ${isOwnMessage ? 'text-right' : 'text-left'}`}>
                      <span className="text-xs font-medium text-gray-600">
                        {isOwnMessage ? 'You' : message.user.name}
                      </span>
                    </div>
                    <div
                      className={`rounded-2xl px-4 py-2.5 shadow-sm ${
                        isOwnMessage
                          ? 'bg-gradient-to-r from-purple-600 to-blue-500 text-white'
                          : 'bg-white text-gray-800 border border-gray-200'
                      }`}
                    >
                      <p className="text-sm break-words whitespace-pre-wrap">{message.content}</p>
                    </div>
                    <div className={`mt-1 ${isOwnMessage ? 'text-right' : 'text-left'}`}>
                      <span className="text-xs text-gray-900">
                        {new Date(message.createdAt).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
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
      <div className="border-t border-gray-200 p-4 bg-white">
        <form onSubmit={handleSendMessage} className="flex items-center gap-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-50 transition-all text-gray-900"
            maxLength={500}
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="bg-gradient-to-r from-purple-600 to-blue-500 text-white p-3 rounded-full hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
        <p className="text-xs text-gray-900 mt-2 text-center">
          Messages are automatically deleted every hour
        </p>
      </div>
    </div>
  );
}
