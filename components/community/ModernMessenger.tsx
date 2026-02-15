'use client';

import { useState, useEffect, useRef } from 'react';
import { usePrivateChat } from '@/lib/hooks/usePrivateChat';
import { 
  X, Send, Image as ImageIcon, 
  Smile, Paperclip, CheckCheck, MessageSquare,
  User as UserIcon, MoreHorizontal, Loader2
} from 'lucide-react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase/client';
import { ChatEvent, RealtimeChatService } from '@/lib/realtime/chat';
import EmojiPicker, { Theme } from 'emoji-picker-react';

interface ModernMessengerProps {
  recipient: any;
  currentUser: any;
  onClose: () => void;
}

export default function ModernMessenger({ recipient, currentUser, onClose }: ModernMessengerProps) {
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [recipientOnline, setRecipientOnline] = useState(false);
  const [recipientLastSeen, setRecipientLastSeen] = useState<Date | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);
  
  const currentUserId = currentUser?.id || currentUser?.userId;
  const recipientId = recipient?.id || recipient?.userId;
  
  const { messages: realtimeMessages, setMessages, recipientTyping, sendTyping: sendTypingStatus } = usePrivateChat(recipientId, currentUserId);

  useEffect(() => {
    loadMessages();
  }, [recipientId]);

  useEffect(() => {
    if (realtimeMessages.length > 0) {
      setTimeout(scrollToBottom, 50);
    }
  }, [realtimeMessages]);

  // Setup Realtime Presence for accurate online status
  useEffect(() => {
    if (!currentUserId || !recipientId) return;

    const channelName = RealtimeChatService.getPrivateChannelName(currentUserId, recipientId);
    const channel = supabase.channel(channelName, {
      config: {
        presence: { key: String(currentUserId) },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const isRecipientOnline = Object.keys(state).includes(String(recipientId));
        setRecipientOnline(isRecipientOnline);
        if (!isRecipientOnline) {
          setRecipientLastSeen(new Date());
        }
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        if (key === String(recipientId)) {
          setRecipientOnline(true);
        }
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        if (key === String(recipientId)) {
          setRecipientOnline(false);
          setRecipientLastSeen(new Date());
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            userId: currentUserId,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, recipientId]);

  const loadMessages = async () => {
    try {
      const res = await fetch(`/api/chat/messages/${recipientId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    const content = newMessage.trim();
    setNewMessage('');
    sendTypingStatus(false);

    try {
      const res = await fetch('/api/chat/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId: recipientId,
          content: content,
          messageType: 'text'
        }),
      });

      if (!res.ok) {
        setNewMessage(content);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(content);
    } finally {
      setIsSending(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
    
    if (!isTyping) {
      setIsTyping(true);
      sendTypingStatus(true);
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      sendTypingStatus(false);
    }, 3000);
  };

  const getAvatarUrl = (avatar?: string | null) => {
    if (!avatar) return '/default-avatar.png';
    if (avatar.startsWith('data:') || avatar.startsWith('http')) return avatar;
    return `https://neon-image-bucket.s3.us-east-1.amazonaws.com/${avatar}`;
  };

  const formatLastSeen = (date: Date | null) => {
    if (!date) return '';
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="flex flex-col h-full bg-[#f0f2f5] relative overflow-hidden">
      {/* WhatsApp Style Header */}
      <div className="bg-[#f0f2f5] px-4 py-3 flex items-center justify-between border-b border-gray-200 z-20">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full overflow-hidden shadow-md">
              {recipient.avatar ? (
                <Image src={getAvatarUrl(recipient.avatar)} alt={recipient.name} fill className="object-cover" unoptimized />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-indigo-500 text-white text-lg font-black">
                  {recipient.name?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-[#f0f2f5] rounded-full ${recipientOnline ? 'bg-green-500' : 'bg-gray-400'}`}></div>
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 leading-tight">{recipient.name}</h3>
            <div className="flex items-center gap-1.5">
              {recipientTyping ? (
                <span className="text-[10px] text-purple-600 font-bold animate-pulse uppercase tracking-wider">يكتب الآن...</span>
              ) : recipientOnline ? (
                <span className="text-[10px] text-green-600 font-bold uppercase tracking-wider flex items-center gap-1">متصل الآن</span>
              ) : (
                <span className="text-[10px] text-gray-500 font-medium">
                  {recipientLastSeen ? `آخر ظهور ${formatLastSeen(recipientLastSeen)}` : 'غير متصل'}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onClose} className="p-2.5 text-gray-500 hover:bg-gray-200 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Messages Area - Styled like Group Chat */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar bg-[#e5ddd5] relative">
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
        
        <div className="relative z-10">
          {realtimeMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-40">
              <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-4 shadow-sm">
                <MessageSquare size={40} className="text-gray-400" />
              </div>
              <p className="font-bold text-gray-600 text-center">ابدأ محادثة جميلة مع {recipient.name}</p>
            </div>
          ) : (
            realtimeMessages.map((msg, idx) => {
              const isMine = msg.senderId === currentUserId;
              return (
                <div key={msg.id || idx} className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                  <div className={`max-w-[85%] md:max-w-[70%] flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                    <div className={`relative px-4 py-3 shadow-sm transition-all duration-300 ${
                      isMine 
                        ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-[1.5rem] rounded-tr-none' 
                        : 'bg-white text-gray-800 border border-gray-100 rounded-[1.5rem] rounded-tl-none'
                    }`}>
                      <p className="text-sm md:text-base leading-relaxed break-words whitespace-pre-wrap">{msg.content}</p>
                      <div className={`flex items-center gap-1.5 mt-1.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <span className="text-[9px] font-bold opacity-60">
                          {new Date(msg.createdAt || msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isMine && <CheckCheck size={12} className="opacity-60" />}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          {recipientTyping && (
            <div className="flex justify-start mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="bg-white text-gray-800 border border-gray-100 rounded-[1.5rem] rounded-tl-none px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area - Styled like Group Chat */}
      <div className="bg-[#f0f2f5] p-3 md:p-4 border-t border-gray-200 z-20">
        <form onSubmit={handleSendMessage} className="flex items-end gap-3 max-w-4xl mx-auto">
          <div className="flex-1 bg-white rounded-2xl border border-gray-200 focus-within:border-purple-400 transition-all flex items-end px-3 py-2">
            <button type="button" className="p-2 text-gray-400 hover:text-purple-600 transition-colors"><Smile size={22} /></button>
            <textarea
              value={newMessage}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="اكتب رسالتك هنا..."
              className="flex-1 bg-transparent border-none focus:ring-0 p-2 text-sm md:text-base resize-none max-h-32 min-h-[40px] text-gray-800"
              rows={1}
            />
            <button type="button" className="p-2 text-gray-400 hover:text-purple-600 transition-colors"><Paperclip size={22} /></button>
          </div>
          <button
            type="submit"
            disabled={!newMessage.trim() || isSending}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
              newMessage.trim() && !isSending
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-200 scale-100 active:scale-90'
                : 'bg-gray-100 text-gray-400 scale-95'
            }`}
          >
            {isSending ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Send size={20} className={newMessage.trim() ? 'translate-x-0.5' : ''} />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
