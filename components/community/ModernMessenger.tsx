'use client';

import { useState, useEffect, useRef } from 'react';
import { usePrivateChat } from '@/lib/hooks/usePrivateChat';
import { 
  X, Send, Image as ImageIcon, 
  Smile, Paperclip, CheckCheck, MessageSquare,
  User as UserIcon, MoreHorizontal, Loader2, Trash2, Heart,
  Ban, Play, FileText, Download, Bell
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
  const [notification, setNotification] = useState<string | null>(null);
  
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
            // If the same user sends the same reaction, remove it (WhatsApp style)
            if (m.reaction === payload.reaction && String(payload.userId) === String(currentUserId)) {
              return { ...m, reaction: null };
            }
            return { ...m, reaction: payload.reaction };
          }
          return m;
        }));
      })
      .on('broadcast', { event: 'incoming-notification' }, ({ payload }) => {
        // Real-time notification simulation
        if (String(payload.recipientId) === String(currentUserId)) {
          setNotification(`${payload.senderName}: ${payload.content}`);
          setTimeout(() => setNotification(null), 3000);
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

    // Send real-time notification if recipient is not online in this channel
    if (!recipientOnline && channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'incoming-notification',
        payload: {
          senderId: currentUserId,
          senderName: currentUser.name,
          recipientId: recipientId,
          content: type === 'text' ? content : `Sent a ${type}`,
        }
      });
    }

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
    <div className={`flex flex-col h-full bg-[#f0f2f5] animate-in fade-in duration-500 ${isRtl ? 'rtl' : 'ltr'}`}>
      {/* Real-time Notification Toast */}
      {notification && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[100] bg-white shadow-2xl border border-emerald-500 rounded-2xl px-4 py-3 flex items-center gap-3 animate-in slide-in-from-top-4 duration-300">
          <div className="bg-emerald-100 p-2 rounded-full">
            <Bell className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">New Message</p>
            <p className="text-sm text-gray-800 font-medium truncate max-w-[200px]">{notification}</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="px-6 py-3 bg-[#f0f2f5] border-b border-gray-200 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-300">
              {recipient.avatar ? (
                <Image src={getAvatarUrl(recipient.avatar)} alt={recipient.name} fill className="object-cover" unoptimized />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-400 text-white text-lg font-bold">
                  {recipient.name?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-[#f0f2f5] rounded-full ${recipientOnline ? 'bg-emerald-500' : 'bg-gray-400'}`}></div>
          </div>
          <div>
            <h3 className="font-bold text-gray-900 leading-none">{recipient.name}</h3>
            <div className="mt-1">
              {recipientTyping ? (
                <p className="text-[11px] text-emerald-600 font-medium">{t('typing')}</p>
              ) : recipientOnline ? (
                <p className="text-[11px] text-gray-600">{t('online')}</p>
              ) : (
                <p className="text-[11px] text-gray-500">
                  {recipientLastSeen ? `${t('lastSeen')} ${formatLastSeen(recipientLastSeen)}` : t('offline')}
                </p>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="p-2 text-gray-500 hover:bg-gray-200 rounded-full transition-all"><X size={20} /></button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#e5ddd5] custom-scrollbar" style={{ backgroundImage: "url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')" }}>
        {realtimeMessages.map((msg, idx) => {
          const isMine = String(msg.senderId) === String(currentUserId);
          const isActive = activeMessageId === msg.id;
          const isDeleted = msg.content === 'MESSAGE_DELETED_BY_SENDER' || msg.isDeleted;
          
          return (
            <div key={msg.id || idx} className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-1`}>
              <div className={`max-w-[85%] flex flex-col ${isMine ? 'items-end' : 'items-start'} group relative`}>
                {/* WhatsApp Style Reaction Menu */}
                {isActive && !isDeleted && (
                  <div className={`absolute -top-12 ${isMine ? 'right-0' : 'left-0'} bg-white shadow-xl rounded-full px-2 py-1.5 flex gap-2 z-30 animate-in slide-in-from-bottom-2`}>
                    {reactions.map(emoji => (
                      <button 
                        key={emoji} 
                        onClick={() => handleAddReaction(msg.id, emoji)}
                        className={`text-xl hover:scale-125 transition-transform ${msg.reaction === emoji ? 'bg-gray-100 rounded-full p-0.5' : ''}`}
                      >
                        {emoji}
                      </button>
                    ))}
                    <div className="w-px h-6 bg-gray-200 mx-1 self-center"></div>
                    {isMine && (
                      <button 
                        onClick={() => handleDeleteForEveryone(msg.id)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded-full"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                )}

                <div 
                  onClick={() => !isDeleted && setActiveMessageId(isActive ? null : msg.id)}
                  className={`relative px-3 py-1.5 shadow-sm cursor-pointer transition-all ${
                  isDeleted 
                    ? 'bg-gray-100/80 text-gray-500 italic border border-gray-200 rounded-lg'
                    : isMine 
                      ? 'bg-[#dcf8c6] text-gray-900 rounded-lg rounded-tr-none' 
                      : 'bg-white text-gray-900 rounded-lg rounded-tl-none'
                }`}>
                  {isDeleted ? (
                    <div className="flex items-center gap-2 text-xs">
                      <Ban size={12} />
                      <span>{t('messageDeleted')}</span>
                    </div>
                  ) : (
                    <>
                      {msg.messageType === 'image' && msg.mediaUrl && (
                        <div className="mb-1 rounded-md overflow-hidden max-w-xs">
                          <Image src={msg.mediaUrl} alt="Media" width={300} height={300} className="object-cover" unoptimized />
                        </div>
                      )}
                      {msg.messageType === 'video' && msg.mediaUrl && (
                        <div className="mb-1 rounded-md overflow-hidden max-w-xs relative group">
                          <video src={msg.mediaUrl} className="max-w-full h-auto" />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Play className="text-white fill-white" size={32} />
                          </div>
                        </div>
                      )}
                      {msg.messageType === 'file' && msg.mediaUrl && (
                        <div className="mb-1 p-2 bg-black/5 rounded flex items-center gap-3">
                          <FileText size={24} className="text-blue-500" />
                          <span className="text-xs truncate max-w-[150px]">{msg.content}</span>
                          <a href={msg.mediaUrl} download className="p-1 hover:bg-black/10 rounded"><Download size={16} /></a>
                        </div>
                      )}
                      <p className="text-[14.5px] leading-tight break-words text-black font-normal">{msg.content}</p>
                    </>
                  )}
                  
                  {msg.reaction && !isDeleted && (
                    <div className={`absolute -bottom-2 ${isMine ? 'left-1' : 'right-1'} bg-white shadow-sm rounded-full px-1 py-0.5 text-[10px] border border-gray-100`}>
                      {msg.reaction}
                    </div>
                  )}
                  
                  <div className={`flex items-center gap-1 mt-0.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <span className="text-[10px] text-gray-500">
                      {new Date(msg.createdAt || msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isMine && !isDeleted && <CheckCheck size={13} className="text-blue-500" />}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-2 bg-[#f0f2f5] flex flex-col gap-2">
        {showEmojiPicker && (
          <div className="absolute bottom-20 left-4 z-50 shadow-2xl">
            <EmojiPicker 
              onEmojiClick={(emoji) => {
                setNewMessage(prev => prev + emoji.emoji);
                setShowEmojiPicker(false);
              }}
              theme={Theme.LIGHT}
              width={300}
              height={400}
            />
          </div>
        )}
        
        <div className="flex items-center gap-2 px-2">
          <button 
            type="button" 
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-2 text-gray-500 hover:bg-gray-200 rounded-full transition-colors"
          >
            <Smile size={24} />
          </button>
          
          <button 
            type="button" 
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-500 hover:bg-gray-200 rounded-full transition-colors"
          >
            <Paperclip size={24} />
          </button>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
            accept="image/*,video/*"
          />

          <form onSubmit={handleSendMessage} className="flex-1 flex items-center gap-2">
            <div className="flex-1 bg-white rounded-full px-4 py-2 flex items-center shadow-sm">
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
                className="w-full bg-transparent border-none focus:ring-0 p-0 text-[15px] text-black font-medium resize-none max-h-32 min-h-[24px] placeholder-gray-500"
                rows={1}
              />
            </div>
            
            <button
              type="submit"
              disabled={(!newMessage.trim() && !isUploading) || isSending}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
                (newMessage.trim() || isUploading) && !isSending
                  ? 'bg-[#00a884] text-white shadow-md'
                  : 'bg-gray-300 text-gray-500'
              }`}
            >
              {isSending || isUploading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Send size={20} className={`${isRtl ? 'rotate-180' : ''}`} />
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
