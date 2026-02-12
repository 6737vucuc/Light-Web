'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useToast } from '@/lib/contexts/ToastContext';
import { supabase } from '@/lib/supabase/client';
import { ChatEvent, RealtimeChatService } from '@/lib/realtime/chat';
import { 
  Send, 
  CheckCheck,
  Reply,
  X,
  Image as ImageIcon,
  Smile,
  MoreVertical,
  Paperclip,
  User as UserIcon
} from 'lucide-react';
import Image from 'next/image';
import UserAvatarMenu from './UserAvatarMenu';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import EmojiPicker, { Theme } from 'emoji-picker-react';

export default function EnhancedGroupChat({ group, currentUser, onBack, onTypingChange, onOnlineChange }: any) {
  const toast = useToast();
  const locale = useParams()?.locale as string || 'ar';
  const tMessages = useTranslations('messages');
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [replyTo, setReplyTo] = useState<any>(null);
  const [typingUsers, setTypingUsers] = useState<any[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);
  const [avatarMenu, setAvatarMenu] = useState<any>({ isOpen: false, userId: '', userName: '', position: { x: 0, y: 0 } });

  useEffect(() => {
    fetchMessages();
    
    const channelName = RealtimeChatService.getGroupChannelName(group.id);
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: true },
      },
    });

    channel
      .on('broadcast', { event: ChatEvent.NEW_MESSAGE }, ({ payload }) => {
        setMessages(prev => {
          if (prev.some(m => m.id === payload.id)) return prev;
          return [...prev, payload];
        });
        setTimeout(scrollToBottom, 50);
      })
      .on('broadcast', { event: ChatEvent.TYPING }, ({ payload }) => {
        if (payload.userId === currentUser?.id) return;
        
        setTypingUsers(prev => {
          const filtered = prev.filter(u => u.userId !== payload.userId);
          const newList = payload.isTyping ? [...filtered, { userId: payload.userId, name: payload.userName }] : filtered;
          if (onTypingChange) onTypingChange(newList);
          return newList;
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [group.id, currentUser?.id]);

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/groups/${group.id}/messages`);
      if (res.ok) {
        const data = await res.json();
        // Reverse to show latest at bottom if API returns latest first
        const fetchedMessages = data.messages || [];
        setMessages(fetchedMessages.reverse());
      }
    } finally {
      setIsLoading(false);
      setTimeout(scrollToBottom, 100);
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

    try {
      const res = await fetch(`/api/groups/${group.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          replyToId: replyTo?.id
        }),
      });

      if (!res.ok) {
        setNewMessage(content);
        toast.error('Failed to send message');
      } else {
        setReplyTo(null);
        handleTyping(false);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(content);
    } finally {
      setIsSending(false);
    }
  };

  const handleTyping = (isTyping: boolean) => {
    if (!currentUser) return;
    
    const channelName = RealtimeChatService.getGroupChannelName(group.id);
    const channel = supabase.channel(channelName);
    
    channel.send({
      type: 'broadcast',
      event: ChatEvent.TYPING,
      payload: { 
        userId: currentUser.id, 
        userName: currentUser.name, 
        isTyping 
      },
    });
    
    if (isTyping) {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => handleTyping(false), 3000);
    }
  };

  const getAvatarUrl = (avatar?: string) => {
    if (!avatar) return '/default-avatar.png';
    if (avatar.startsWith('data:') || avatar.startsWith('http')) return avatar;
    return `https://neon-image-bucket.s3.us-east-1.amazonaws.com/${avatar}`;
  };

  return (
    <div className="flex flex-col h-full bg-[#f8f9fa] relative overflow-hidden">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full opacity-40">
            <div className="w-20 h-20 bg-gray-200 rounded-3xl flex items-center justify-center mb-4">
              <UserIcon size={40} className="text-gray-400" />
            </div>
            <p className="font-bold text-gray-500">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <MessageBubble
              key={msg.id || idx}
              message={msg}
              isMine={msg.userId === currentUser?.id}
              onReply={() => setReplyTo(msg)}
              senderName={msg.user?.name}
              senderAvatar={msg.user?.avatar}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-100">
        {replyTo && (
          <div className="mb-3 p-3 bg-purple-50 rounded-xl flex items-center justify-between animate-in slide-in-from-bottom-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-purple-600">Replying to {replyTo.user?.name}</p>
              <p className="text-sm text-gray-600 truncate">{replyTo.content}</p>
            </div>
            <button onClick={() => setReplyTo(null)} className="p-1 hover:bg-purple-100 rounded-full text-purple-400">
              <X size={18} />
            </button>
          </div>
        )}
        
        {typingUsers.length > 0 && (
          <div className="mb-3">
            <TypingIndicator typingUsers={typingUsers} />
          </div>
        )}

        <form onSubmit={handleSendMessage} className="flex items-end gap-2">
          <div className="flex-1 bg-gray-50 rounded-2xl border border-gray-200 focus-within:border-purple-400 focus-within:ring-1 focus-within:ring-purple-400 transition-all flex flex-col">
            <textarea
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                handleTyping(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Type a message..."
              className="w-full bg-transparent border-none focus:ring-0 p-3 text-sm md:text-base resize-none max-h-32 min-h-[44px]"
              rows={1}
            />
            <div className="flex items-center justify-between px-2 pb-2">
              <div className="flex items-center gap-1">
                <button type="button" className="p-2 text-gray-400 hover:text-purple-600 transition-colors">
                  <Smile size={20} />
                </button>
                <button type="button" className="p-2 text-gray-400 hover:text-purple-600 transition-colors">
                  <Paperclip size={20} />
                </button>
                <button type="button" className="p-2 text-gray-400 hover:text-purple-600 transition-colors">
                  <ImageIcon size={20} />
                </button>
              </div>
            </div>
          </div>
          <button
            type="submit"
            disabled={!newMessage.trim() || isSending}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
              newMessage.trim() && !isSending
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-200 scale-100'
                : 'bg-gray-100 text-gray-400 scale-95'
            }`}
          >
            {isSending ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send size={20} className={newMessage.trim() ? 'translate-x-0.5' : ''} />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
