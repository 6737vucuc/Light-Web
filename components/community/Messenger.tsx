'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Send, Image as ImageIcon, Phone, Video, Info } from 'lucide-react';
import Image from 'next/image';
import Pusher from 'pusher-js';

interface MessengerProps {
  currentUser: any;
  recipient: any;
  onClose: () => void;
}

export default function Messenger({ currentUser, recipient, onClose }: MessengerProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pusherRef = useRef<Pusher | null>(null);

  useEffect(() => {
    loadConversation();
    
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
  }, [recipient.id]);

  useEffect(() => {
    if (recipient && pusherRef.current && currentUser) {
      // Use the same channel format as the API: private-chat-{id1}-{id2}
      const [id1, id2] = [currentUser.id, recipient.id].sort((a, b) => a - b);
      const channelName = `private-chat-${id1}-${id2}`;
      const channel = pusherRef.current.subscribe(channelName);
      
      channel.bind('new-message', (data: any) => {
        setMessages((prev) => [...prev, data.message]);
        scrollToBottom();
      });

      return () => {
        channel.unbind_all();
        channel.unsubscribe();
      };
    }
  }, [recipient, currentUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversation = async () => {
    try {
      const response = await fetch(`/api/messages/conversation/${recipient.id}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
        setConversationId(data.conversationId);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    setIsSending(true);
    try {
      const response = await fetch('/api/messages/private', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          receiverId: recipient.id,
          content: newMessage.trim(),
          messageType: 'text',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Add message immediately to UI
        if (data.data) {
          const newMsg = {
            id: data.data.id,
            senderId: currentUser.id,
            receiverId: recipient.id,
            content: newMessage.trim(),
            messageType: 'text',
            createdAt: new Date().toISOString(),
            isRead: false,
            isDelivered: false,
          };
          setMessages((prev) => [...prev, newMsg]);
        }
        setNewMessage('');
        scrollToBottom();
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
              {recipient?.avatar || recipient?.other_user_avatar ? (
                <Image
                  src={getAvatarUrl(recipient.avatar || recipient.other_user_avatar)}
                  alt={recipient.name || recipient.other_user_name}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-400 to-pink-400 text-white font-bold">
                  {recipient?.name?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <p className="font-semibold">{recipient?.name}</p>
              <p className="text-xs text-gray-500">Active now</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <Phone className="w-5 h-5 text-blue-500" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <Video className="w-5 h-5 text-blue-500" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <Info className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
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
              <p className="text-lg font-semibold mb-2">No messages yet</p>
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
                        {recipient?.avatar ? (
                          <Image
                            src={getAvatarUrl(recipient.avatar)}
                            alt={recipient.name}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-400 to-pink-400 text-white text-xs font-bold">
                            {recipient?.name?.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                    )}
                    <div>
                      <div
                        className={`px-4 py-2 rounded-2xl ${
                          isMine
                            ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                      </div>
                      <p className={`text-xs text-gray-400 mt-1 ${isMine ? 'text-right' : 'text-left'}`}>
                        {formatTime(message.createdAt)}
                      </p>
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
          <div className="flex items-center gap-3">
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <ImageIcon className="w-5 h-5 text-blue-500" />
            </button>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !isSending && sendMessage()}
              placeholder="Message..."
              className="flex-1 px-4 py-2 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim() || isSending}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
            >
              <Send className="w-5 h-5 text-blue-500" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
