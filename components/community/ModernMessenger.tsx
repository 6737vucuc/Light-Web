'use client';

import { useState, useEffect, useRef } from 'react';
import { usePrivateChat } from '@/lib/hooks/usePrivateChat';
import { 
  X, Send, Image as ImageIcon, 
  Smile, Paperclip, CheckCheck, MessageSquare,
  User as UserIcon, MoreHorizontal, Loader2, Trash2, Heart
} from 'lucide-react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase/client';
import { ChatEvent, RealtimeChatService } from '@/lib/realtime/chat';
import { useTranslations, useLocale } from 'next-intl';

interface ModernMessengerProps {
  recipient: any;
  currentUser: any;
  onClose: () => void;
}

export default function ModernMessenger({ recipient, currentUser, onClose }: ModernMessengerProps) {
  const t = useTranslations('messages');
  const locale = useLocale();
  const isRtl = locale === 'ar';
  
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [recipientOnline, setRecipientOnline] = useState(false);
  const [recipientLastSeen, setRecipientLastSeen] = useState<Date | null>(null);
  const [activeMessageId, setActiveMessageId] = useState<number | string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);
  
  const currentUserId = currentUser ? (currentUser.userId || currentUser.id) : null;
  const recipientId = recipient ? (recipient.userId || recipient.id) : null;
  
  const { messages: realtimeMessages, setMessages, recipientTyping, sendTyping: sendTypingStatus } = usePrivateChat(recipientId, currentUserId);

  useEffect(() => {
    if (recipientId) {
      loadMessages();
    }
  }, [recipientId]);

  useEffect(() => {
    if (realtimeMessages.length > 0) {
      setTimeout(scrollToBottom, 50);
    }
  }, [realtimeMessages]);

  useEffect(() => {
    if (!currentUserId || !recipientId) return;

    const channelName = RealtimeChatService.getPrivateChannelName(currentUserId, recipientId);
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: true },
      },
    });

    channel
      .on('broadcast', { event: ChatEvent.ONLINE_STATUS }, ({ payload }) => {
        if (String(payload.userId) === String(recipientId)) {
          setRecipientOnline(payload.isOnline);
          if (!payload.isOnline) {
            setRecipientLastSeen(payload.lastSeen ? new Date(payload.lastSeen) : new Date());
          }
        }
      })
      .on('broadcast', { event: ChatEvent.MESSAGE_DELETED }, ({ payload }) => {
        setMessages(prev => prev.filter(m => String(m.id) !== String(payload.messageId)));
      })
      .on('broadcast', { event: 'message-reaction' }, ({ payload }) => {
        setMessages(prev => prev.map(m => {
          if (String(m.id) === String(payload.messageId)) {
            return { ...m, reaction: payload.reaction };
          }
          return m;
        }));
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channel.send({
            type: 'broadcast',
            event: ChatEvent.ONLINE_STATUS,
            payload: {
              userId: currentUserId,
              isOnline: true,
            },
          });
        }
      });

    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === 'visible';
      channel.send({
        type: 'broadcast',
        event: ChatEvent.ONLINE_STATUS,
        payload: {
          userId: currentUserId,
          isOnline: isVisible,
          lastSeen: isVisible ? null : new Date().toISOString(),
        },
      });
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      channel.send({
        type: 'broadcast',
        event: ChatEvent.ONLINE_STATUS,
        payload: {
          userId: currentUserId,
          isOnline: false,
          lastSeen: new Date().toISOString(),
        },
      });
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
    if (!newMessage.trim() || isSending || !currentUserId || !recipientId) return;

    setIsSending(true);
    const content = newMessage.trim();
    const tempId = `temp-${Date.now()}`;
    
    const tempMsg = {
      id: tempId,
      tempId: tempId,
      senderId: currentUserId,
      content: content,
      createdAt: new Date().toISOString(),
      timestamp: new Date().toISOString(),
      isRead: false
    };
    setMessages(prev => [...prev, tempMsg]);
    
    setNewMessage('');
    sendTypingStatus(false);

    try {
      const res = await fetch('/api/chat/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId: recipientId,
          content: content,
          messageType: 'text',
          tempId: tempId
        }),
      });

      if (!res.ok) {
        setMessages(prev => prev.filter(m => m.id !== tempId));
        setNewMessage(content);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setNewMessage(content);
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteForEveryone = async (messageId: number | string) => {
    if (String(messageId).startsWith('temp-')) return;
    
    try {
      const res = await fetch(`/api/chat/messages/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, recipientId })
      });
      
      if (res.ok) {
        setMessages(prev => prev.filter(m => String(m.id) !== String(messageId)));
        setActiveMessageId(null);
      }
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const handleAddReaction = async (messageId: number | string, reaction: string) => {
    if (String(messageId).startsWith('temp-')) return;
    
    try {
      const channelName = RealtimeChatService.getPrivateChannelName(currentUserId, recipientId);
      await supabase.channel(channelName).send({
        type: 'broadcast',
        event: 'message-reaction',
        payload: { messageId, reaction, userId: currentUserId }
      });
      
      setMessages(prev => prev.map(m => {
        if (String(m.id) === String(messageId)) {
          return { ...m, reaction };
        }
        return m;
      }));
      setActiveMessageId(null);
    } catch (error) {
      console.error('Error adding reaction:', error);
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

    if (minutes < 1) return t('justNow');
    if (minutes < 60) return t('minutesAgo', { n: minutes });
    if (hours < 24) return t('hoursAgo', { n: hours });
    return t('daysAgo', { n: days });
  };

  return (
    <div className={`flex flex-col h-full bg-[#f8f9fa] animate-in fade-in duration-500 ${isRtl ? 'rtl' : 'ltr'}`}>
      <div className="px-6 py-4 bg-white border-b border-gray-100 flex items-center justify-between shadow-sm relative z-10">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-purple-50 shadow-md">
              {recipient.avatar ? (
                <Image src={getAvatarUrl(recipient.avatar)} alt={recipient.name} fill className="object-cover" unoptimized />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-indigo-500 text-white text-xl font-black">
                  {recipient.name?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className={`absolute -bottom-1 -right-1 w-4 h-4 border-2 border-white rounded-full ${recipientOnline ? 'bg-emerald-500' : 'bg-gray-400'}`}></div>
          </div>
          <div>
            <h3 className="font-black text-gray-900 leading-none mb-1">{recipient.name}</h3>
            <div className="flex items-center gap-1.5">
              {recipientTyping ? (
                <p className="text-[10px] text-purple-600 font-black animate-pulse uppercase tracking-widest">{t('typing')}</p>
              ) : recipientOnline ? (
                <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest flex items-center gap-1">
                  <span className="w-1 h-1 bg-emerald-500 rounded-full"></span> {t('online')}
                </p>
              ) : (
                <p className="text-[10px] text-gray-500 font-medium">
                  {recipientLastSeen ? `${t('lastSeen')} ${formatLastSeen(recipientLastSeen)}` : t('offline')}
                </p>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><X size={20} /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        {realtimeMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-30">
            <div className="w-20 h-20 bg-gray-200 rounded-[2rem] flex items-center justify-center mb-4">
              <MessageSquare size={40} className="text-gray-400" />
            </div>
            <p className="font-black text-gray-500">{t('startConversation', { name: recipient.name })}</p>
          </div>
        ) : (
          realtimeMessages.map((msg, idx) => {
            const isMine = String(msg.senderId) === String(currentUserId);
            const isActive = activeMessageId === msg.id;
            
            return (
              <div key={msg.id || idx} className={`flex ${isMine ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                <div className={`max-w-[80%] flex flex-col ${isMine ? 'items-end' : 'items-start'} group relative`}>
                  <div 
                    onClick={() => setActiveMessageId(isActive ? null : msg.id)}
                    className={`relative px-4 py-3 shadow-sm cursor-pointer transition-all hover:brightness-95 ${
                    isMine 
                      ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-[1.5rem] rounded-tr-none' 
                      : 'bg-white text-gray-800 border border-gray-100 rounded-[1.5rem] rounded-tl-none'
                  }`}>
                    <p className="text-sm md:text-base leading-relaxed break-words">{msg.content}</p>
                    {msg.reaction && (
                      <div className={`absolute -bottom-2 ${isMine ? 'left-0' : 'right-0'} bg-white shadow-md rounded-full px-1.5 py-0.5 text-xs border border-gray-100`}>
                        {msg.reaction}
                      </div>
                    )}
                    <div className={`flex items-center gap-1.5 mt-1.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <span className="text-[9px] font-bold opacity-60">
                        {new Date(msg.createdAt || msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {isMine && <CheckCheck size={12} className="opacity-60" />}
                    </div>
                  </div>

                  {isActive && (
                    <div className={`absolute top-0 ${isMine ? '-left-12' : '-right-12'} flex flex-col gap-2 z-20 animate-in zoom-in duration-200`}>
                      {isMine ? (
                        <button 
                          onClick={() => handleDeleteForEveryone(msg.id)}
                          className="p-2 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors"
                          title={t('deleteForEveryone')}
                        >
                          <Trash2 size={16} />
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleAddReaction(msg.id, '❤️')}
                          className="p-2 bg-pink-500 text-white rounded-full shadow-lg hover:bg-pink-600 transition-colors"
                          title={t('reaction')}
                        >
                          <Heart size={16} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        {recipientTyping && (
          <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
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

      <div className="p-6 bg-white border-t border-gray-100">
        <form onSubmit={handleSendMessage} className="flex items-end gap-3">
          <div className="flex-1 bg-gray-50 rounded-[1.5rem] border border-gray-200 focus-within:border-purple-400 focus-within:ring-1 focus-within:ring-purple-400 transition-all flex flex-col overflow-hidden">
            <textarea
              value={newMessage}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder={t('typeMessage')}
              className="w-full bg-transparent border-none focus:ring-0 p-4 text-sm md:text-base resize-none max-h-32 min-h-[56px]"
              rows={1}
            />
            <div className="flex items-center justify-between px-3 pb-3">
              <div className="flex items-center gap-1">
                <button type="button" className="p-2 text-gray-400 hover:text-purple-600 transition-colors"><Smile size={20} /></button>
                <button type="button" className="p-2 text-gray-400 hover:text-purple-600 transition-colors"><Paperclip size={20} /></button>
                <button type="button" className="p-2 text-gray-400 hover:text-purple-600 transition-colors"><ImageIcon size={20} /></button>
              </div>
              <button type="button" className="p-2 text-gray-400 hover:text-purple-600 transition-colors"><MoreHorizontal size={20} /></button>
            </div>
          </div>
          <button
            type="submit"
            disabled={!newMessage.trim() || isSending}
            className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
              newMessage.trim() && !isSending
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-200 scale-100 active:scale-90'
                : 'bg-gray-100 text-gray-400 scale-95'
            }`}
          >
            {isSending ? (
              <Loader2 size={24} className="animate-spin" />
            ) : (
              <Send size={24} className={`${newMessage.trim() ? (isRtl ? '-translate-x-0.5' : 'translate-x-0.5') : ''} ${isRtl ? 'rotate-180' : ''}`} />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
