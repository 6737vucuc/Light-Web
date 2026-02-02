'use client';

import { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Send,
  Image as ImageIcon,
  Smile,
  MoreVertical,
  Trash2,
  MessageCircle,
  X,
  Users,
  Check,
  CheckCheck,
  Reply,
  MoreHorizontal,
  User,
  Phone,
  MessageSquare
} from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import Pusher from 'pusher-js';
import { useToast } from '@/lib/contexts/ToastContext';
import { supabase } from '@/lib/supabase/client';

interface EnhancedGroupChatProps {
  group: any;
  currentUser: any;
  onBack: () => void;
}

export default function EnhancedGroupChat({ group, currentUser, onBack }: EnhancedGroupChatProps) {
  const router = useRouter();
  const params = useParams();
  const locale = params?.locale as string || 'ar';
  const t = useTranslations('messages');
  const toast = useToast();
  
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Stats
  const [totalMembers, setTotalMembers] = useState<number>(0);
  const [onlineMembersCount, setOnlineMembersCount] = useState<number>(0);

  // UI state
  const [selectedMessageId, setSelectedMessageId] = useState<number | null>(null);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [typingUsers, setTypingUsers] = useState<any[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pusherRef = useRef<Pusher | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadMessages();
    loadGroupStats();
    initializePusher();

    const statsInterval = setInterval(loadGroupStats, 30000);
    return () => {
      if (pusherRef.current) {
        pusherRef.current.unsubscribe(`group-${group.id}`);
      }
      clearInterval(statsInterval);
    };
  }, [group.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

  const loadGroupStats = async () => {
    try {
      const response = await fetch(`/api/groups/${group.id}/stats`);
      if (response.ok) {
        const data = await response.json();
        setTotalMembers(data.totalMembers || 0);
        setOnlineMembersCount(data.onlineMembers || 0);
      }
    } catch (error) {
      console.error('Error loading group stats:', error);
    }
  };

  const initializePusher = () => {
    if (pusherRef.current) return;

    const pusherKey = process.env.NEXT_PUBLIC_PUSHER_APP_KEY || process.env.NEXT_PUBLIC_PUSHER_KEY;
    const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

    if (!pusherKey || !pusherCluster) return;

    pusherRef.current = new Pusher(pusherKey, {
      cluster: pusherCluster,
    });

    const channel = pusherRef.current.subscribe(`group-${group.id}`);

    channel.bind('new-message', (data: any) => {
      setMessages((prev) => {
        if (prev.find(m => m.id === data.id)) return prev;
        return [...prev, data];
      });
    });

    channel.bind('message-deleted', (data: any) => {
      setMessages((prev) => prev.filter((m) => m.id !== data.messageId));
    });

    channel.bind('user-typing', (data: any) => {
      if (data.userId !== currentUser?.id) {
        setTypingUsers((prev) => {
          if (prev.find(u => u.userId === data.userId)) return prev;
          return [...prev, { userId: data.userId, name: data.name }];
        });
        setTimeout(() => {
          setTypingUsers((prev) => prev.filter(u => u.userId !== data.userId));
        }, 3000);
      }
    });
  };

  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      fetch(`/api/groups/${group.id}/typing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isTyping: true }),
      }).catch(console.error);
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      fetch(`/api/groups/${group.id}/typing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isTyping: false }),
      }).catch(console.error);
    }, 2000);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() && !selectedImage) return;
    setIsSending(true);
    
    try {
      const formData = new FormData();
      if (newMessage.trim()) formData.append('content', newMessage);
      if (selectedImage) formData.append('image', selectedImage);
      if (replyingTo) formData.append('replyToId', replyingTo.id.toString());

      const response = await fetch(`/api/groups/${group.id}/messages`, {
        method: 'POST',
        body: selectedImage ? formData : JSON.stringify({
          content: newMessage,
          replyToId: replyingTo?.id
        }),
        headers: selectedImage ? {} : { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        setNewMessage('');
        setSelectedImage(null);
        setImagePreview(null);
        setReplyingTo(null);
        loadMessages();
      } else {
        toast.error('Failed to send message');
      }
    } catch (error) {
      toast.error('Connection error');
    } finally {
      setIsSending(false);
    }
  };

  const deleteMessage = async (messageId: number) => {
    try {
      const response = await fetch(`/api/groups/${group.id}/messages/${messageId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setMessages(prev => prev.filter(m => m.id !== messageId));
        setSelectedMessageId(null);
      }
    } catch (error) {
      toast.error('Failed to delete message');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
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

  const startPrivateChat = (userId: number) => {
    router.push(`/${locale}/community/chat?userId=${userId}`);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-[#efeae2] rounded-2xl shadow-xl overflow-hidden border border-gray-200 relative">
      {/* User Profile Overlay */}
      {showUserProfile && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in duration-200">
            <div className="relative h-32 bg-gradient-to-r from-purple-600 to-pink-600">
              <button 
                onClick={() => setShowUserProfile(null)}
                className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 pb-8 text-center -mt-12">
              <div className="inline-block p-1 bg-white rounded-full shadow-lg mb-4">
                <div className="w-24 h-24 rounded-full overflow-hidden">
                  <Image 
                    src={getAvatarUrl(showUserProfile.avatar)} 
                    alt={showUserProfile.name} 
                    width={96} height={96} 
                    className="object-cover"
                    unoptimized
                  />
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">{showUserProfile.name}</h3>
              <p className="text-sm text-gray-500 mb-6">@{showUserProfile.username || 'user'}</p>
              
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => startPrivateChat(showUserProfile.id)}
                  className="flex items-center justify-center gap-2 py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-colors"
                >
                  <MessageSquare className="w-4 h-4" /> Message
                </button>
                <button 
                  onClick={() => startPrivateChat(showUserProfile.id)}
                  className="flex items-center justify-center gap-2 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
                >
                  <Phone className="w-4 h-4" /> Call
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-[#f0f2f5] p-3 flex items-center justify-between border-b border-gray-200 z-20">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-gray-800 leading-tight">{group.name}</h2>
              <p className="text-[11px] text-gray-500">
                {onlineMembersCount} Online • {totalMembers} Members
              </p>
            </div>
          </div>
        </div>
        <button className="p-2 hover:bg-gray-200 rounded-full text-gray-600">
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 relative z-10">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <MessageCircle className="w-12 h-12 opacity-20 mb-2" />
            <p className="text-sm">No messages yet</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.user_id === currentUser?.id;
            return (
              <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} items-end gap-2`}>
                {!isOwn && (
                  <button 
                    onClick={() => setShowUserProfile({ ...msg.user, id: msg.user_id })}
                    className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 mb-1 hover:ring-2 hover:ring-purple-400 transition-all"
                  >
                    <Image 
                      src={getAvatarUrl(msg.user?.avatar)} 
                      alt={msg.user?.name || 'User'} 
                      width={32} height={32} 
                      className="object-cover"
                      unoptimized
                    />
                  </button>
                )}
                <div 
                  onClick={() => setSelectedMessageId(selectedMessageId === msg.id ? null : msg.id)}
                  className={`relative max-w-[75%] p-2 rounded-lg shadow-sm cursor-pointer ${
                    isOwn ? 'bg-[#dcf8c6] rounded-tr-none' : 'bg-white rounded-tl-none'
                  }`}
                >
                  {!isOwn && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); setShowUserProfile({ ...msg.user, id: msg.user_id }); }}
                      className="text-[11px] font-bold text-purple-600 mb-0.5 hover:underline"
                    >
                      {msg.user?.name}
                    </button>
                  )}
                  
                  {msg.reply_to && (
                    <div className="mb-1 p-1.5 bg-black/5 border-l-4 border-purple-500 rounded text-[11px]">
                      <p className="font-bold text-purple-700">{msg.reply_to.sender_name}</p>
                      <p className="text-gray-600 truncate">{msg.reply_to.content}</p>
                    </div>
                  )}

                  {msg.media_url && (
                    <div className="mb-1 rounded overflow-hidden">
                      <img src={msg.media_url} alt="Shared" className="max-w-full h-auto max-h-60 object-contain" />
                    </div>
                  )}
                  
                  <p className="text-[14px] text-gray-800 leading-snug">{msg.content}</p>
                  
                  <div className="flex items-center justify-end gap-1 mt-0.5">
                    <span className="text-[9px] text-gray-500">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isOwn && <CheckCheck className="w-3 h-3 text-blue-500" />}
                  </div>

                  {/* Message Actions Popup */}
                  {selectedMessageId === msg.id && (
                    <div className={`absolute ${isOwn ? 'right-0' : 'left-0'} top-full mt-1 z-50 bg-white rounded-lg shadow-xl border border-gray-100 py-1 min-w-[120px]`}>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setReplyingTo(msg); setSelectedMessageId(null); }}
                        className="w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Reply className="w-3 h-3" /> Reply
                      </button>
                      {isOwn && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); deleteMessage(msg.id); }}
                          className="w-full px-3 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
                        >
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Bar */}
      {replyingTo && (
        <div className="bg-white border-t border-gray-200 px-4 py-2 flex items-center gap-2 z-20">
          <div className="flex-1 p-2 bg-gray-100 rounded border-l-4 border-purple-500">
            <p className="text-[10px] font-bold text-purple-600">Replying to {replyingTo.user?.name}</p>
            <p className="text-xs text-gray-600 truncate">{replyingTo.content}</p>
          </div>
          <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-gray-200 rounded">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      )}

      {/* Input */}
      <div className="bg-[#f0f2f5] p-2 flex items-center gap-2 z-20">
        {imagePreview && (
          <div className="absolute bottom-16 left-4 z-30">
            <div className="relative">
              <img src={imagePreview} alt="Preview" className="w-16 h-16 object-cover rounded-lg border-2 border-white shadow-lg" />
              <button onClick={() => {setSelectedImage(null); setImagePreview(null);}} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1">
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
        <button onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-500 hover:bg-gray-200 rounded-full">
          <ImageIcon className="w-6 h-6" />
        </button>
        <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" />
        <input 
          type="text" 
          placeholder="Type a message..." 
          value={newMessage}
          onChange={(e) => {setNewMessage(e.target.value); handleTyping();}}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          className="flex-1 px-4 py-2 bg-white rounded-lg focus:outline-none text-sm"
        />
        <button 
          onClick={sendMessage}
          disabled={isSending || (!newMessage.trim() && !selectedImage)}
          className="p-2.5 bg-purple-600 text-white rounded-full disabled:opacity-50"
        >
          {isSending ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Send className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}
