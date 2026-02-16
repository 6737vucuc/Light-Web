'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useToast } from '@/lib/contexts/ToastContext';
import { supabase } from '@/lib/supabase/client';
import { ChatEvent, RealtimeChatService } from '@/lib/realtime/chat';
import { usePresence } from '@/lib/hooks/usePresence';
import { 
  Send, 
  CheckCheck,
  Reply,
  X,
  Image as ImageIcon,
  Smile,
  MoreVertical,
  Paperclip,
  User as UserIcon,
  ArrowLeft,
  Lock,
  Loader2,
  Users
} from 'lucide-react';
import Image from 'next/image';
import UserAvatarMenu from './UserAvatarMenu';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';

export default function EnhancedGroupChat({ group, currentUser, onBack, onPrivateMessage }: any) {
  const toast = useToast();
  const locale = useParams()?.locale as string || 'ar';
  const t = useTranslations('community');
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [checkingMembership, setCheckingMembership] = useState(true);
  const [replyTo, setReplyTo] = useState<any>(null);
  const [typingUsers, setTypingUsers] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);
  const [avatarMenu, setAvatarMenu] = useState<any>({ isOpen: false, userId: '', userName: '', avatar: null, position: { x: 0, y: 0 } });

  const currentId = currentUser ? (currentUser.userId || currentUser.id) : null;

  // Use presence hook for online users
  const { onlineMembers, onlineMembersCount } = usePresence(
    group.id,
    currentId,
    currentUser?.name,
    currentUser?.avatar
  );

  useEffect(() => {
    const init = async () => {
      if (!group.id || !currentId) return;
      const member = await checkMembership();
      if (member) {
        fetchMessages();
      } else {
        setIsLoading(false);
      }
    };
    init();
  }, [group.id, currentId]);

  useEffect(() => {
    if (!isMember || !group.id) return;

    const channelName = RealtimeChatService.getGroupChannelName(group.id);
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: true },
      },
    });

    channel
      .on('broadcast', { event: ChatEvent.NEW_MESSAGE }, ({ payload }) => {
        setMessages(prev => {
          if (prev.some(m => String(m.id) === String(payload.id))) return prev;
          return [...prev, payload];
        });
        setTimeout(scrollToBottom, 50);
      })
      .on('broadcast', { event: ChatEvent.TYPING }, ({ payload }) => {
        const payloadUserId = payload.userId || payload.user_id;
        if (String(payloadUserId) === String(currentId)) return;
        
        setTypingUsers(prev => {
          const filtered = prev.filter(u => String(u.userId || u.user_id) !== String(payloadUserId));
          if (payload.isTyping) {
            return [...filtered, { userId: payloadUserId, name: payload.userName || payload.name }];
          }
          return filtered;
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [group.id, currentId, isMember]);

  const checkMembership = async () => {
    if (!currentUser) {
      setCheckingMembership(false);
      return false;
    }
    try {
      const res = await fetch(`/api/groups/${group.id}/membership`);
      if (res.ok) {
        const data = await res.json();
        setIsMember(data.isMember);
        return data.isMember;
      }
      return false;
    } catch (error) {
      console.error('Check membership error:', error);
      return false;
    } finally {
      setCheckingMembership(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/groups/${group.id}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        setTimeout(scrollToBottom, 100);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() || isSending || !currentUser || !isMember) return;

    const content = newMessage.trim();
    setNewMessage('');
    setIsSending(true);
    handleTyping(false);

    try {
      const res = await fetch(`/api/groups/${group.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          replyToId: replyTo?.id
        }),
      });

      if (!res.ok) throw new Error('Failed to send');
      setReplyTo(null);
    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(content);
      toast.show('Failed to send message', 'error');
    } finally {
      setIsSending(false);
    }
  };

  const handleTyping = (isTyping: boolean) => {
    if (!currentUser || !isMember) return;
    
    const channelName = RealtimeChatService.getGroupChannelName(group.id);
    const channel = supabase.channel(channelName);
    
    const currentId = currentUser?.id || currentUser?.userId;
    channel.send({
      type: 'broadcast',
      event: ChatEvent.TYPING,
      payload: { 
        userId: currentId, 
        userName: currentUser.name, 
        isTyping 
      },
    });
    
    if (isTyping) {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => handleTyping(false), 3000);
    }
  };

  if (checkingMembership) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-white">
        <Loader2 size={40} className="animate-spin text-purple-600 mb-4" />
        <p className="text-gray-500 font-black uppercase tracking-widest text-xs">{t('loading')}</p>
      </div>
    );
  }

  if (!isMember) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-50 p-8 text-center">
        <div className="w-24 h-24 bg-white rounded-[2.5rem] shadow-xl flex items-center justify-center mb-8 text-gray-300">
          <Lock size={48} />
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-4">{group.name}</h2>
        <p className="text-gray-500 font-medium max-w-xs mb-8 leading-relaxed">
          {t('mustJoin')}
        </p>
        <button 
          onClick={onBack}
          className="px-8 py-4 bg-gray-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-purple-600 transition-all shadow-xl shadow-gray-200"
        >
          {t('back')}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#f0f2f5] relative overflow-hidden">
      {/* WhatsApp Style Header */}
      <div className="bg-[#f0f2f5] px-4 py-3 flex items-center justify-between border-b border-gray-200 z-20">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-gray-200 rounded-full transition-colors md:hidden">
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-md"
            style={{ backgroundColor: group.color || '#8B5CF6' }}
          >
            <UserIcon size={20} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 leading-tight">{group.name}</h3>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Users size={12} className="text-green-600" />
                <span className="text-[10px] text-green-600 font-bold uppercase tracking-wider">{onlineMembersCount} {t('online')}</span>
              </div>
              {typingUsers.length > 0 && (
                <span className="text-[10px] text-purple-600 font-bold animate-pulse">
                  {typingUsers[0].name} {t('typing')}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-2.5 text-gray-500 hover:bg-gray-200 rounded-full transition-colors">
            <MoreVertical size={20} />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar bg-[#e5ddd5] relative">
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
        
        <div className="relative z-10">
          {isLoading ? (
            <div className="flex items-center justify-center h-full py-20">
              <Loader2 size={32} className="animate-spin text-purple-600" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-40">
              <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-4 shadow-sm">
                <UserIcon size={40} className="text-gray-400" />
              </div>
              <p className="font-bold text-gray-600">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <MessageBubble 
                key={msg.id || idx} 
                message={msg} 
                isOwn={String(msg.userId || msg.user_id) === String(currentId)}
                onReply={setReplyTo}
                onAvatarClick={(userId, userName, avatar, e) => {
                  setAvatarMenu({
                    isOpen: true,
                    userId,
                    userName,
                    avatar,
                    position: { x: e.clientX, y: e.clientY }
                  });
                }}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* User Avatar Menu */}
      <UserAvatarMenu 
        {...avatarMenu} 
        onClose={() => setAvatarMenu({ ...avatarMenu, isOpen: false })}
        onSendMessage={onPrivateMessage}
      />

      {/* Input Area */}
      <div className="bg-[#f0f2f5] p-3 md:p-4 border-t border-gray-200 z-20">
        {replyTo && (
          <div className="mb-3 p-3 bg-white/80 backdrop-blur-sm rounded-2xl border-l-4 border-purple-500 flex items-center justify-between animate-in slide-in-from-bottom-2">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest mb-0.5">Replying to {replyTo.user?.name || replyTo.userName}</p>
              <p className="text-xs text-gray-500 truncate font-medium">{replyTo.content}</p>
            </div>
            <button onClick={() => setReplyTo(null)} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400">
              <X size={16} />
            </button>
          </div>
        )}

        <form onSubmit={handleSendMessage} className="flex items-end gap-2 max-w-6xl mx-auto">
          <div className="flex-1 bg-white rounded-[1.5rem] shadow-sm border border-gray-100 flex flex-col overflow-hidden transition-all focus-within:shadow-md focus-within:border-purple-200">
            <textarea
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                handleTyping(true);
              }}
              placeholder={t('sendMessage')}
              className="w-full p-3 md:p-4 bg-transparent resize-none border-none focus:ring-0 text-sm md:text-base text-gray-800 font-medium max-h-32"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            <div className="flex items-center justify-between px-3 py-2 bg-gray-50/50 border-t border-gray-50">
              <div className="flex items-center gap-1">
                <button type="button" className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all">
                  <Smile size={20} />
                </button>
                <button type="button" className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all">
                  <ImageIcon size={20} />
                </button>
                <button type="button" className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all">
                  <Paperclip size={20} />
                </button>
              </div>
              <button
                type="submit"
                disabled={!newMessage.trim() || isSending}
                className={`p-2.5 rounded-xl transition-all shadow-lg shadow-purple-100 ${
                  newMessage.trim() && !isSending 
                    ? 'bg-purple-600 text-white hover:bg-purple-700 hover:scale-105 active:scale-95' 
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isSending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Avatar Menu Overlay */}
      {avatarMenu.isOpen && (
        <UserAvatarMenu 
          userId={avatarMenu.userId}
          userName={avatarMenu.userName}
          avatar={avatarMenu.avatar}
          position={avatarMenu.position}
          onClose={() => setAvatarMenu({ ...avatarMenu, isOpen: false })}
        />
      )}
    </div>
  );
}
