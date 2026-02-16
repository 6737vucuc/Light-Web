'use client';

import { useState, useEffect, useRef } from 'react';
import { usePrivateChat } from '@/lib/hooks/usePrivateChat';
import { 
  X, Send, Image as ImageIcon, 
  Smile, Paperclip, CheckCheck, MessageSquare,
  User as UserIcon, MoreHorizontal, Loader2, Trash2, Heart,
  Ban, Play, FileText, Download, Bell, Phone, Video, Search, Info
} from 'lucide-react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase/client';
import { ChatEvent, RealtimeChatService } from '@/lib/realtime/chat';
import { useTranslations, useLocale } from 'next-intl';
import EmojiPicker, { Theme } from 'emoji-picker-react';

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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [notification, setNotification] = useState<{sender: string, content: string} | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const channelRef = useRef<any>(null);
  
  const currentUserId = currentUser ? (currentUser.userId || currentUser.id) : null;
  const recipientId = recipient ? (recipient.userId || recipient.id) : null;
  
  const { messages: realtimeMessages, setMessages, recipientTyping, sendTyping: sendTypingStatus } = usePrivateChat(recipientId, currentUserId);

  useEffect(() => {
    if (recipientId) {
      loadMessages();
      markMessagesAsRead();
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
    channelRef.current = channel;

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
        setMessages(prev => prev.map(m => {
          if (String(m.id) === String(payload.messageId)) {
            return { ...m, content: 'MESSAGE_DELETED_BY_SENDER', isDeleted: true };
          }
          return m;
        }));
      })
      .on('broadcast', { event: 'message-reaction' }, ({ payload }) => {
        setMessages(prev => prev.map(m => {
          if (String(m.id) === String(payload.messageId)) {
            if (m.reaction === payload.reaction && String(payload.userId) === String(currentUserId)) {
              return { ...m, reaction: null };
            }
            return { ...m, reaction: payload.reaction };
          }
          return m;
        }));
      })
      .on('broadcast', { event: ChatEvent.MESSAGE_READ }, ({ payload }) => {
        if (String(payload.readerId) === String(recipientId)) {
          setMessages(prev => prev.map(m => ({ ...m, isRead: true })));
        }
      })
      .on('broadcast', { event: ChatEvent.NEW_MESSAGE }, ({ payload }) => {
        if (String(payload.senderId) !== String(currentUserId) && String(payload.senderId) !== String(recipientId)) {
          setNotification({ sender: payload.senderName, content: payload.content });
          setTimeout(() => setNotification(null), 4000);
        }
        if (String(payload.senderId) === String(recipientId)) {
          markMessagesAsRead();
        }
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
      if (isVisible) markMessagesAsRead();
      
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

  const markMessagesAsRead = async () => {
    try {
      await fetch('/api/chat/messages/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId }),
      });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e?: React.FormEvent, contentOverride?: string, type: string = 'text', mediaUrl?: string) => {
    if (e) e.preventDefault();
    const content = contentOverride || newMessage.trim();
    if (!content && !mediaUrl) return;
    if (isSending || !currentUserId || !recipientId) return;

    setIsSending(true);
    const tempId = `temp-${Date.now()}`;
    
    const tempMsg = {
      id: tempId,
      tempId: tempId,
      senderId: currentUserId,
      content: content,
      mediaUrl: mediaUrl,
      messageType: type,
      createdAt: new Date().toISOString(),
      timestamp: new Date().toISOString(),
      isRead: false
    };
    setMessages(prev => [...prev, tempMsg]);
    
    if (!contentOverride) setNewMessage('');
    sendTypingStatus(false);

    try {
      const res = await fetch('/api/chat/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId: recipientId,
          content: content,
          messageType: type,
          mediaUrl: mediaUrl,
          tempId: tempId
        }),
      });

      if (!res.ok) {
        setMessages(prev => prev.filter(m => m.id !== tempId));
        if (!contentOverride) setNewMessage(content);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => prev.filter(m => m.id !== tempId));
      if (!contentOverride) setNewMessage(content);
    } finally {
      setIsSending(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        const type = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'file';
        handleSendMessage(undefined, file.name, type, data.url);
      }
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
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
        setMessages(prev => prev.map(m => {
          if (String(m.id) === String(messageId)) {
            return { ...m, content: 'MESSAGE_DELETED_BY_SENDER', isDeleted: true };
          }
          return m;
        }));
        setActiveMessageId(null);
      }
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const handleAddReaction = async (messageId: number | string, reaction: string) => {
    if (String(messageId).startsWith('temp-')) return;
    
    const currentMsg = realtimeMessages.find(m => String(m.id) === String(messageId));
    const isRemoving = currentMsg?.reaction === reaction;

    try {
      const channelName = RealtimeChatService.getPrivateChannelName(currentUserId, recipientId);
      await supabase.channel(channelName).send({
        type: 'broadcast',
        event: 'message-reaction',
        payload: { messageId, reaction: isRemoving ? null : reaction, userId: currentUserId }
      });
      
      setMessages(prev => prev.map(m => {
        if (String(m.id) === String(messageId)) {
          return { ...m, reaction: isRemoving ? null : reaction };
        }
        return m;
      }));
      setActiveMessageId(null);
    } catch (error) {
      console.error('Error handling reaction:', error);
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

  const reactions = ['❤️', '👍', '😂', '😮', '😢', '🙏'];

  return (
    <div className={`flex flex-col h-full bg-[#f8fafc] animate-in fade-in duration-500 ${isRtl ? 'rtl' : 'ltr'} font-sans`}>
      {/* Modern Notification Toast */}
      {notification && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[100] bg-white/80 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-white/20 rounded-2xl px-5 py-4 flex items-center gap-4 animate-in slide-in-from-top-6 duration-500 w-[92%] max-w-md">
          <div className="bg-gradient-to-br from-emerald-400 to-teal-500 p-2.5 rounded-xl flex-shrink-0 shadow-lg shadow-emerald-100">
            <Bell className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.1em] mb-0.5">New Message</p>
            <p className="text-sm text-slate-900 font-black truncate">{notification.sender}</p>
            <p className="text-xs text-slate-500 truncate font-medium">{notification.content}</p>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-full transition-colors"><X size={18} /></button>
        </div>
      )}

      {/* Modern Header - Glassmorphism */}
      <div className="px-6 py-4 bg-white/70 backdrop-blur-md border-b border-slate-200/60 flex items-center justify-between relative z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="relative group cursor-pointer">
            <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-white shadow-md group-hover:scale-105 transition-transform duration-300">
              {recipient.avatar ? (
                <Image src={getAvatarUrl(recipient.avatar)} alt={recipient.name} fill className="object-cover" unoptimized />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-400 to-slate-600 text-white text-xl font-black">
                  {recipient.name?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className={`absolute -bottom-1 -right-1 w-4 h-4 border-2 border-white rounded-full shadow-sm transition-colors duration-500 ${recipientOnline ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
          </div>
          <div>
            <h3 className="font-black text-slate-900 text-base tracking-tight leading-none mb-1.5">{recipient.name}</h3>
            <div className="flex items-center">
              {recipientTyping ? (
                <div className="flex items-center gap-1.5">
                  <span className="flex gap-0.5">
                    <span className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce"></span>
                    <span className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1 h-1 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  </span>
                  <p className="text-[11px] text-emerald-600 font-black uppercase tracking-wider">{t('typing')}</p>
                </div>
              ) : recipientOnline ? (
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                  <p className="text-[11px] text-emerald-600 font-black uppercase tracking-wider">{t('online')}</p>
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                  {recipientLastSeen ? `${t('lastSeen')} ${formatLastSeen(recipientLastSeen)}` : t('offline')}
                </p>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <button onClick={onClose} className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><X size={22} /></button>
        </div>
      </div>

      {/* Messages Area - Modern Background */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#f8fafc] custom-scrollbar relative">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
        
        {realtimeMessages.map((msg, idx) => {
          const isMine = String(msg.senderId) === String(currentUserId);
          const isActive = activeMessageId === msg.id;
          const isDeleted = msg.content === 'MESSAGE_DELETED_BY_SENDER' || msg.isDeleted;
          
          return (
            <div key={msg.id || idx} className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-2 animate-in fade-in slide-in-from-bottom-2 duration-300`}>
              <div className={`max-w-[82%] flex flex-col ${isMine ? 'items-end' : 'items-start'} group relative`}>
                {/* Modern Reaction Menu */}
                {isActive && !isDeleted && (
                  <div className={`absolute -top-14 ${isMine ? 'right-0' : 'left-0'} bg-white/90 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.1)] border border-slate-100 rounded-2xl px-3 py-2 flex gap-3 z-30 animate-in zoom-in-95 duration-200`}>
                    {reactions.map(emoji => (
                      <button 
                        key={emoji} 
                        onClick={() => handleAddReaction(msg.id, emoji)}
                        className={`text-xl hover:scale-125 transition-transform duration-200 ${msg.reaction === emoji ? 'bg-slate-100 rounded-xl p-1' : ''}`}
                      >
                        {emoji}
                      </button>
                    ))}
                    <div className="w-px h-6 bg-slate-200 mx-1 self-center"></div>
                    {isMine && (
                      <button 
                        onClick={() => handleDeleteForEveryone(msg.id)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                )}

                <div 
                  onClick={() => !isDeleted && setActiveMessageId(isActive ? null : msg.id)}
                  className={`relative px-4 py-3 shadow-sm cursor-pointer transition-all duration-300 hover:shadow-md ${
                  isDeleted 
                    ? 'bg-slate-100 text-slate-400 italic border border-slate-200 rounded-2xl'
                    : isMine 
                      ? 'bg-gradient-to-br from-indigo-600 to-blue-600 text-white rounded-2xl rounded-tr-none' 
                      : 'bg-white text-slate-900 rounded-2xl rounded-tl-none border border-slate-100'
                }`}>
                  {isDeleted ? (
                    <div className="flex items-center gap-2 text-xs font-medium">
                      <Ban size={14} />
                      <span>{t('messageDeleted')}</span>
                    </div>
                  ) : (
                    <>
                      {msg.messageType === 'image' && msg.mediaUrl && (
                        <div className="mb-2 rounded-xl overflow-hidden border border-white/20 shadow-sm">
                          <Image src={msg.mediaUrl} alt="Media" width={320} height={320} className="object-cover hover:scale-105 transition-transform duration-500" unoptimized />
                        </div>
                      )}
                      {msg.messageType === 'video' && msg.mediaUrl && (
                        <div className="mb-2 rounded-xl overflow-hidden relative group border border-white/20 shadow-sm">
                          <video src={msg.mediaUrl} className="max-w-full h-auto" />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30">
                              <Play className="text-white fill-white ml-1" size={24} />
                            </div>
                          </div>
                        </div>
                      )}
                      {msg.messageType === 'file' && msg.mediaUrl && (
                        <div className={`mb-2 p-3 rounded-xl flex items-center gap-4 ${isMine ? 'bg-white/10' : 'bg-slate-50'}`}>
                          <div className={`p-2 rounded-lg ${isMine ? 'bg-white/20' : 'bg-blue-100 text-blue-600'}`}>
                            <FileText size={20} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-black truncate">{msg.content}</p>
                            <p className="text-[10px] opacity-60 uppercase font-bold">Document</p>
                          </div>
                          <a href={msg.mediaUrl} download className={`p-1.5 rounded-lg transition-colors ${isMine ? 'hover:bg-white/20' : 'hover:bg-slate-200'}`}><Download size={18} /></a>
                        </div>
                      )}
                      <p className={`text-[15px] leading-relaxed break-words font-medium ${isMine ? 'text-white' : 'text-slate-800'}`}>{msg.content}</p>
                    </>
                  )}
                  
                  {msg.reaction && !isDeleted && (
                    <div className={`absolute -bottom-2.5 ${isMine ? 'left-2' : 'right-2'} bg-white shadow-md rounded-full px-1.5 py-0.5 text-[11px] border border-slate-100 animate-in zoom-in-50`}>
                      {msg.reaction}
                    </div>
                  )}
                  
                  <div className={`flex items-center gap-1.5 mt-1.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${isMine ? 'text-white/70' : 'text-slate-400'}`}>
                      {new Date(msg.createdAt || msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isMine && !isDeleted && (
                      <div className="flex items-center">
                        <CheckCheck size={14} className={msg.isRead ? "text-sky-300" : "text-white/40"} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Modern Input Area */}
      <div className="p-4 bg-white border-t border-slate-200/60 z-20">
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
        
        <div className="flex items-center gap-3 max-w-6xl mx-auto">
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
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
            accept="image/*,video/*"
          />

          <form onSubmit={handleSendMessage} className="flex-1 flex items-center gap-3">
            <div className="flex-1 bg-slate-100 rounded-2xl px-4 py-2.5 flex items-center transition-all focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-100 border border-transparent focus-within:border-indigo-200">
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
                className="w-full bg-transparent border-none focus:ring-0 p-0 text-[15px] text-slate-900 font-medium resize-none max-h-32 min-h-[24px] placeholder-slate-400"
                rows={1}
              />
            </div>
            
            <button
              type="submit"
              disabled={(!newMessage.trim() && !isUploading) || isSending}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                (newMessage.trim() || isUploading) && !isSending
                  ? 'bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-200 hover:scale-105 active:scale-95'
                  : 'bg-slate-100 text-slate-300'
              }`}
            >
              {isSending || isUploading ? (
                <Loader2 size={22} className="animate-spin" />
              ) : (
                <Send size={22} className={`${isRtl ? 'rotate-180' : ''} ml-0.5`} />
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
