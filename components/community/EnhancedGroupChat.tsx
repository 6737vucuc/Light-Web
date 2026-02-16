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
  Users,
  Ban,
  Phone,
  Video,
  Info
} from 'lucide-react';
import Image from 'next/image';
import UserAvatarMenu from './UserAvatarMenu';
import MessageBubble from './MessageBubble';
import EmojiPicker, { Theme } from 'emoji-picker-react';

export default function EnhancedGroupChat({ group, currentUser, onBack, onPrivateMessage }: any) {
  const toast = useToast();
  const locale = useParams()?.locale as string || 'ar';
  const t = useTranslations('community');
  const tm = useTranslations('messages');
  const isRtl = locale === 'ar';
  
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [checkingMembership, setCheckingMembership] = useState(true);
  const [replyTo, setReplyTo] = useState<any>(null);
  const [typingUsers, setTypingUsers] = useState<any[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [avatarMenu, setAvatarMenu] = useState<any>({ isOpen: false, userId: '', userName: '', avatar: null, position: { x: 0, y: 0 } });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentId = currentUser ? (currentUser.userId || currentUser.id) : null;

  const { onlineMembersCount } = usePresence(
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
      .on('broadcast', { event: ChatEvent.MESSAGE_DELETED }, ({ payload }) => {
        setMessages(prev => prev.map(m => {
          if (String(m.id) === String(payload.messageId)) {
            return { ...m, content: 'MESSAGE_DELETED_BY_SENDER', isDeleted: true };
          }
          return m;
        }));
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
        <Loader2 size={40} className="animate-spin text-indigo-600 mb-4" />
        <p className="text-slate-500 font-black uppercase tracking-widest text-xs">{t('loading')}</p>
      </div>
    );
  }

  if (!isMember) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-slate-50 p-8 text-center">
        <div className="w-24 h-24 bg-white rounded-[2.5rem] shadow-xl flex items-center justify-center mb-8 text-slate-300">
          <Lock size={48} />
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-4">{group.name}</h2>
        <p className="text-slate-500 font-medium max-w-xs mb-8 leading-relaxed">
          {t('mustJoin')}
        </p>
        <button 
          onClick={onBack}
          className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200"
        >
          {t('back')}
        </button>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full bg-[#f8fafc] relative overflow-hidden ${isRtl ? 'rtl' : 'ltr'} font-sans`}>
      {/* Modern Header - Glassmorphism */}
      <div className="bg-white/70 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-slate-200/60 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
            <ArrowLeft size={22} className="text-slate-600" />
          </button>
          <div 
            className="w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-md border-2 border-white"
            style={{ backgroundColor: group.color || '#6366f1' }}
          >
            <Users size={22} />
          </div>
          <div className="flex-1">
            <h3 className="font-black text-slate-900 leading-tight text-base tracking-tight">{group.name}</h3>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                <span className="text-[11px] text-emerald-600 font-black uppercase tracking-wider">
                  {onlineMembersCount} {t('online')}
                </span>
              </div>
              {typingUsers.length > 0 && (
                <span className="text-[11px] text-indigo-600 font-black animate-pulse uppercase tracking-wider">
                  • {typingUsers[0].name} {t('typing')}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"><Phone size={20} /></button>
          <button className="p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"><Video size={20} /></button>
          <button className="p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all">
            <MoreVertical size={20} />
          </button>
        </div>
      </div>

      {/* Messages Area - Modern Background */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1 bg-[#f8fafc] relative custom-scrollbar" style={{ backgroundImage: "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')", backgroundBlendMode: 'overlay' }}>
        <div className="relative z-10">
          {isLoading ? (
            <div className="flex items-center justify-center h-full py-20">
              <Loader2 size={32} className="animate-spin text-indigo-600" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-40">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                <MessageSquare size={32} className="text-slate-400" />
              </div>
              <p className="font-black text-slate-600 uppercase tracking-widest text-xs">No messages yet</p>
            </div>
          ) : (
            messages.map((msg, idx) => (
              <MessageBubble 
                key={msg.id || idx} 
                message={msg} 
                isOwn={String(msg.userId || msg.user_id) === String(currentId)}
                onReply={setReplyTo}
                onAvatarClick={(userId, userName, avatar, e) => {
                  // Ensure we prevent default and stop propagation to avoid conflicts
                  e.preventDefault();
                  e.stopPropagation();
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

      {/* Modern Input Area */}
      <div className="bg-white p-3 flex flex-col gap-2 z-20 border-t border-slate-200/60">
        {replyTo && (
          <div className="mx-2 p-3 bg-slate-50 rounded-2xl border-l-4 border-indigo-500 flex items-center justify-between animate-in slide-in-from-bottom-2">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.1em] mb-0.5">Replying to {replyTo.user?.name || replyTo.userName}</p>
              <p className="text-xs text-slate-500 truncate font-medium">{replyTo.content}</p>
            </div>
            <button onClick={() => setReplyTo(null)} className="p-1.5 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
              <X size={16} />
            </button>
          </div>
        )}

        {showEmojiPicker && (
          <div className="absolute bottom-24 left-6 z-50 shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
            <EmojiPicker 
              onEmojiClick={(emoji) => {
                setNewMessage(prev => prev + emoji.emoji);
                setShowEmojiPicker(false);
              }}
              theme={Theme.LIGHT}
              width={320}
              height={420}
            />
          </div>
        )}

        <div className="flex items-center gap-3 px-2 max-w-6xl mx-auto w-full">
          <div className="flex items-center gap-1">
            <button 
              type="button" 
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
            >
              <Smile size={24} />
            </button>
            
            <button 
              type="button" 
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
            >
              <Paperclip size={24} />
            </button>
          </div>
          
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" />

          <form onSubmit={handleSendMessage} className="flex-1 flex items-center gap-3">
            <div className="flex-1 bg-slate-100 rounded-2xl px-4 py-2.5 flex items-center transition-all focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-100 border border-transparent focus-within:border-indigo-200">
              <textarea
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  handleTyping(true);
                }}
                placeholder={tm('typeMessage')}
                className="w-full bg-transparent border-none focus:ring-0 p-0 text-[15px] text-slate-900 font-medium resize-none max-h-32 min-h-[24px] placeholder-slate-400"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
            </div>
            
            <button
              type="submit"
              disabled={!newMessage.trim() || isSending}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                newMessage.trim() && !isSending
                  ? 'bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-100 hover:scale-105 active:scale-95'
                  : 'bg-slate-100 text-slate-300'
              }`}
            >
              {isSending ? <Loader2 size={22} className="animate-spin" /> : <Send size={22} className={isRtl ? 'rotate-180' : ''} />}
            </button>
          </form>
        </div>
      </div>

      {/* User Avatar Menu Overlay - Ensure it's outside the main flow */}
      {avatarMenu.isOpen && (
        <UserAvatarMenu 
          userId={avatarMenu.userId}
          userName={avatarMenu.userName}
          avatar={avatarMenu.avatar}
          position={avatarMenu.position}
          isOpen={avatarMenu.isOpen}
          onClose={() => setAvatarMenu({ ...avatarMenu, isOpen: false })}
          onSendMessage={onPrivateMessage}
        />
      )}
    </div>
  );
}
