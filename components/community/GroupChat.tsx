'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send, Image as ImageIcon, Smile, MoreVertical, Trash2 } from 'lucide-react';
import Image from 'next/image';
import Pusher from 'pusher-js';

interface GroupChatProps {
  group: any;
  currentUser: any;
  onBack: () => void;
}

export default function GroupChat({ group, currentUser, onBack }: GroupChatProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pusherRef = useRef<Pusher | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadMessages();
    joinGroup();

    // Initialize Pusher
    if (typeof window !== 'undefined') {
      pusherRef.current = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY || '', {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us2',
      });

      const channel = pusherRef.current.subscribe(`group-${group.id}`);
      
      channel.bind('new-message', (data: any) => {
        setMessages((prev) => [...prev, data.message]);
        scrollToBottom();
      });

      channel.bind('delete-message', (data: any) => {
        setMessages((prev) => prev.filter(m => m.id !== data.messageId));
      });
    }

    return () => {
      if (pusherRef.current) {
        pusherRef.current.unsubscribe(`group-${group.id}`);
        pusherRef.current.disconnect();
      }
    };
  }, [group.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
    try {
      const response = await fetch(`/api/groups/${group.id}/messages`);
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

  const joinGroup = async () => {
    try {
      await fetch(`/api/groups/${group.id}/join`, { method: 'POST' });
    } catch (error) {
      console.error('Error joining group:', error);
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
    if ((!newMessage.trim() && !selectedImage) || isSending) return;

    setIsSending(true);
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

      const response = await fetch(`/api/groups/${group.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newMessage.trim() || (mediaUrl ? 'Sent an image' : ''),
          messageType: mediaUrl ? 'image' : 'text',
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
    }
  };

  const deleteMessage = async (messageId: number) => {
    if (!confirm('هل تريد حذف هذه الرسالة؟')) return;

    try {
      const response = await fetch(`/api/groups/${group.id}/messages/${messageId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setMessages((prev) => prev.filter(m => m.id !== messageId));
      }
    } catch (error) {
      console.error('Error deleting message:', error);
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
    return messageDate.toLocaleTimeString('ar-SA', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden h-[calc(100vh-200px)] md:h-[600px] flex flex-col">
      {/* Chat Header */}
      <div
        className="p-4 flex items-center gap-3 border-b border-gray-200"
        style={{
          background: `linear-gradient(135deg, ${group.color} 0%, ${group.color}dd 100%)`,
        }}
      >
        <button
          onClick={onBack}
          className="p-2 hover:bg-white/20 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>

        <div className="flex-1">
          <h2 className="text-lg font-bold text-white">{group.name}</h2>
          <p className="text-sm text-white/80">{group.members_count || 0} أعضاء</p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {isLoading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
              <Send className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-center">لا توجد رسائل بعد</p>
            <p className="text-sm text-center mt-1">كن أول من يبدأ المحادثة!</p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwnMessage = message.user_id === currentUser.id;
            
            return (
              <div
                key={message.id}
                className={`flex gap-2 ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                {!isOwnMessage && (
                  <div className="relative w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                    {message.user_avatar ? (
                      <Image
                        src={getAvatarUrl(message.user_avatar)}
                        alt={message.user_name}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-400 to-pink-400 text-white text-xs font-bold">
                        {message.user_name?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                )}

                {/* Message Bubble */}
                <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} max-w-[70%]`}>
                  {!isOwnMessage && (
                    <span className="text-xs text-gray-500 mb-1 px-2">{message.user_name}</span>
                  )}
                  
                  <div className="relative group">
                    <div
                      className={`rounded-2xl px-4 py-2 ${
                        isOwnMessage
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                          : 'bg-white text-gray-900 border border-gray-200'
                      }`}
                    >
                      {message.media_url && message.message_type === 'image' && (
                        <div className="relative w-48 h-48 rounded-lg overflow-hidden mb-2">
                          <Image
                            src={message.media_url}
                            alt="Message image"
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                      )}
                      <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                      <span className={`text-xs mt-1 block ${isOwnMessage ? 'text-white/70' : 'text-gray-500'}`}>
                        {formatTime(message.created_at)}
                      </span>
                    </div>

                    {/* Delete button for own messages */}
                    {isOwnMessage && (
                      <button
                        onClick={() => deleteMessage(message.id)}
                        className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Image Preview */}
      {imagePreview && (
        <div className="px-4 py-2 bg-gray-100 border-t border-gray-200">
          <div className="relative w-20 h-20 rounded-lg overflow-hidden">
            <Image src={imagePreview} alt="Preview" fill className="object-cover" />
            <button
              onClick={() => {
                setSelectedImage(null);
                setImagePreview(null);
              }}
              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-200">
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageSelect}
            accept="image/*"
            className="hidden"
          />
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ImageIcon className="w-5 h-5" />
          </button>

          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="اكتب رسالة..."
            className="flex-1 px-4 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            disabled={isSending}
          />

          <button
            onClick={sendMessage}
            disabled={(!newMessage.trim() && !selectedImage) || isSending}
            className="p-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSending ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
