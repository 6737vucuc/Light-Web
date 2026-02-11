'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useToast } from '@/lib/contexts/ToastContext';
import { pusherClient } from '@/lib/pusher/client';
import { 
  Send, 
  CheckCheck,
  Reply,
  X
} from 'lucide-react';
import Image from 'next/image';
import UserAvatarMenu from './UserAvatarMenu';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);
  const channelRef = useRef<any>(null);
  const [avatarMenu, setAvatarMenu] = useState<any>({ isOpen: false, userId: '', userName: '', position: { x: 0, y: 0 } });
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    fetchMessages();
    
    // Subscribe to Pusher private channel for instant events
    const channelName = `private-chat-${group.id}`;
    const channel = pusherClient.subscribe(channelName);

    // Listen for new messages
    channel.bind('new-message', (data: any) => {
      setMessages(prev => {
        if (prev.some(m => m.id === data.id || (m.tempId && m.tempId === data.tempId))) return prev;
        return [...prev, data];
      });
      setTimeout(scrollToBottom, 50);
    });

    // Listen for typing status (Client-side event)
    channel.bind('client-typing', (data: any) => {
      setTypingUsers(prev => {
        const filtered = prev.filter(u => u.userId !== data.userId);
        const newList = data.isTyping ? [...filtered, { userId: data.userId, name: data.userName }] : filtered;
        if (onTypingChange) onTypingChange(newList);
        return newList;
      });
    });

    channelRef.current = channel;

    return () => {
      pusherClient.unsubscribe(channelName);
    };
  }, [group.id, currentUser?.id]);

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/groups/${group.id}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } finally {
      setIsLoading(false);
      setTimeout(scrollToBottom, 100);
    }
  };

  const handleTyping = (isTyping: boolean) => {
    if (!currentUser || !channelRef.current) return;
    
    // Trigger client-side event for instant typing indicator
    channelRef.current.trigger('client-typing', {
      userId: currentUser.id,
      userName: currentUser.name,
      isTyping
    });
    
    if (isTyping) {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => handleTyping(false), 3000);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || isSending) return;
    const content = newMessage.trim();
    const tempId = Date.now();
    setNewMessage('');
    handleTyping(false);

    const msgObj = {
      id: tempId,
      tempId: tempId,
      content,
      userId: currentUser.id,
      user_id: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      created_at: new Date().toISOString(),
      user: {
        id: currentUser.id,
        name: currentUser.name,
        avatar: currentUser.avatar
      },
      reply_to_id: replyTo?.id,
      reply_to_content: replyTo?.content,
      reply_to_user_name: replyTo?.userName
    };

    // Update local UI immediately (Optimistic UI)
    setMessages(prev => [...prev, msgObj]);
    setTimeout(scrollToBottom, 50);

    try {
      const res = await fetch(`/api/groups/${group.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content, 
          replyToId: replyTo?.id, 
          replyToContent: replyTo?.content, 
          replyToUserName: replyTo?.userName 
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        // Replace temp message with final message from DB
        setMessages(prev => prev.map(m => m.tempId === tempId ? { ...data.message, user: msgObj.user } : m));
      }
      setReplyTo(null);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Error sending message');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (date: string) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleTimeString(locale === 'ar' ? 'ar-EG' : 'en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#efeae2] relative">
      <UserAvatarMenu 
        isOpen={avatarMenu.isOpen} 
        userId={avatarMenu.userId} 
        userName={avatarMenu.userName} 
        position={avatarMenu.position} 
        onClose={() => setAvatarMenu({ ...avatarMenu, isOpen: false })} 
      />
      
      {selectedImage && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
          <Image src={selectedImage} alt="Full" fill className="object-contain" unoptimized />
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="flex justify-center p-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.userId === currentUser?.id || msg.user_id === currentUser?.id;
            return (
              <div key={msg.id} id={`msg-${msg.id}`} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} items-end gap-2 group/msg`}>
                {!isOwn && (
                  <button 
                    onClick={(e) => setAvatarMenu({ isOpen: true, userId: msg.userId, userName: msg.user?.name, position: { x: e.clientX, y: e.clientY } })} 
                    className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 shadow-sm"
                  >
                    <Image 
                      src={msg.user?.avatar ? (msg.user.avatar.startsWith('http') ? msg.user.avatar : `https://neon-image-bucket.s3.us-east-1.amazonaws.com/${msg.user.avatar}`) : '/default-avatar.png'} 
                      alt="avatar" 
                      width={32} 
                      height={32} 
                      className="object-cover" 
                      unoptimized 
                    />
                  </button>
                )}
                <div className={`max-w-[80%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                  {!isOwn && <span className="text-[11px] font-black text-purple-700 ml-2 mb-1">{msg.user?.name}</span>}
                  <div className={`relative px-4 py-2.5 rounded-2xl shadow-md border ${isOwn ? 'bg-[#dcf8c6] border-[#c7e9b0] rounded-tr-none' : 'bg-white border-gray-100 rounded-tl-none'}`}>
                    {msg.reply_to_content && (
                      <div className="mb-2 p-2 bg-black/5 border-l-4 border-purple-500 text-[11px] rounded">
                        <p className="font-bold text-purple-700">{msg.reply_to_user_name}</p>
                        <p className="text-gray-700 truncate">{msg.reply_to_content}</p>
                      </div>
                    )}
                    <p className="text-[15px] font-bold text-gray-900 break-words leading-relaxed">{msg.content}</p>
                    <div className="flex justify-end items-center gap-1 mt-1.5">
                      <span className="text-[10px] font-bold text-gray-500">{formatTime(msg.created_at || msg.timestamp)}</span>
                      {isOwn && <CheckCheck className="w-3.5 h-3.5 text-blue-500" />}
                    </div>
                    <button 
                      onClick={() => setReplyTo({ id: msg.id, content: msg.content, userName: msg.user?.name })} 
                      className={`absolute ${isOwn ? '-left-10' : '-right-10'} top-1/2 -translate-y-1/2 opacity-0 group-hover/msg:opacity-100 transition-all p-1.5 hover:bg-gray-200 rounded-full shadow-sm bg-white`}
                    >
                      <Reply size={16} className="text-purple-600" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="bg-[#f0f2f5] p-3 border-t border-gray-200">
        {replyTo && (
          <div className="flex justify-between items-center bg-white/90 p-2.5 rounded-xl border-l-4 border-purple-500 text-xs mb-2 animate-in slide-in-from-bottom-2 shadow-sm">
            <div className="truncate">
              <p className="font-black text-purple-700">{replyTo.userName}</p>
              <p className="text-gray-600 font-medium truncate">{replyTo.content}</p>
            </div>
            <button onClick={() => setReplyTo(null)} className="p-1.5 hover:bg-gray-200 rounded-full transition-colors">
              <X size={16} className="text-gray-500" />
            </button>
          </div>
        )}
        <div className="flex items-center gap-3">
          <input 
            type="text" 
            value={newMessage} 
            onChange={(e) => { setNewMessage(e.target.value); handleTyping(true); }} 
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()} 
            placeholder={tMessages('typeMessage')} 
            className="flex-1 bg-white px-4 py-3 rounded-2xl text-[15px] font-bold text-gray-900 outline-none shadow-sm border border-gray-100 focus:border-purple-300 transition-colors" 
          />
          <button 
            onClick={sendMessage} 
            disabled={!newMessage.trim() || isSending}
            className={`p-3 rounded-full transition-all ${newMessage.trim() ? 'bg-purple-600 text-white shadow-lg hover:scale-110 active:scale-95' : 'bg-gray-300 text-gray-500'}`}
          >
            <Send size={22}/>
          </button>
        </div>
      </div>
    </div>
  );
}
