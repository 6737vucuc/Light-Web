'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useToast } from '@/lib/contexts/ToastContext';
import { supabase } from '@/lib/supabase/client';
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
  const channelRef = useRef<any>(null);
  const typingTimeoutRef = useRef<any>(null);
  const [avatarMenu, setAvatarMenu] = useState<any>({ isOpen: false, userId: '', userName: '', position: { x: 0, y: 0 } });
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    fetchMessages();
    
    // Use a simpler channel name and configuration for maximum reliability
    const channelName = `chat_${group.id}`;
    const channel = supabase.channel(channelName, {
      config: {
        presence: { key: currentUser?.id || 'anon' },
        broadcast: { self: true, ack: true }
      }
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const count = Object.keys(state).length;
        if (onOnlineChange) onOnlineChange(count);
      })
      .on('broadcast', { event: 'msg' }, ({ payload }) => {
        console.log('Realtime message received:', payload);
        setMessages(prev => {
          if (prev.some(m => m.id === payload.id || (m.tempId && m.tempId === payload.tempId))) return prev;
          return [...prev, payload];
        });
        setTimeout(scrollToBottom, 50);
      })
      .on('broadcast', { event: 'typ' }, ({ payload }) => {
        if (payload.uid === currentUser?.id) return;
        setTypingUsers(prev => {
          const filtered = prev.filter(u => u.userId !== payload.uid);
          const newList = payload.is ? [...filtered, { userId: payload.uid, name: payload.name }] : filtered;
          if (onTypingChange) onTypingChange(newList);
          return newList;
        });
      })
      .subscribe(async (status) => {
        console.log('Channel status:', status);
        if (status === 'SUBSCRIBED' && currentUser) {
          await channel.track({ userId: currentUser.id, name: currentUser.name });
        }
      });

    channelRef.current = channel;
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
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

  const handleTyping = (is: boolean) => {
    if (!channelRef.current || !currentUser) return;
    channelRef.current.send({
      type: 'broadcast',
      event: 'typ',
      payload: { uid: currentUser.id, name: currentUser.name, is }
    });
    
    if (is) {
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

    // Update local UI immediately
    setMessages(prev => [...prev, msgObj]);
    setTimeout(scrollToBottom, 50);

    // Broadcast immediately to others
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'msg',
        payload: msgObj
      });
    }

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
                    className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0"
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
                  {!isOwn && <span className="text-[10px] font-black text-purple-600 ml-2 mb-1">{msg.user?.name}</span>}
                  <div className={`relative px-4 py-2 rounded-2xl shadow-sm ${isOwn ? 'bg-[#dcf8c6] rounded-tr-none' : 'bg-white rounded-tl-none'}`}>
                    {msg.reply_to_content && (
                      <div className="mb-2 p-2 bg-black/5 border-l-4 border-purple-500 text-[11px] rounded">
                        <p className="font-bold text-purple-600">{msg.reply_to_user_name}</p>
                        <p className="truncate">{msg.reply_to_content}</p>
                      </div>
                    )}
                    <p className="text-sm font-medium break-words">{msg.content}</p>
                    <div className="flex justify-end gap-1 mt-1">
                      <span className="text-[9px] text-gray-500">{formatTime(msg.created_at || msg.timestamp)}</span>
                      {isOwn && <CheckCheck className="w-3 h-3 text-blue-500" />}
                    </div>
                    <button 
                      onClick={() => setReplyTo({ id: msg.id, content: msg.content, userName: msg.user?.name })} 
                      className={`absolute ${isOwn ? '-left-8' : '-right-8'} top-1/2 -translate-y-1/2 opacity-0 group-hover/msg:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded-full`}
                    >
                      <Reply size={16} className="text-gray-500" />
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
          <div className="flex justify-between items-center bg-white/80 p-2 rounded-lg border-l-4 border-purple-500 text-xs mb-2 animate-in slide-in-from-bottom-2">
            <div className="truncate">
              <p className="font-bold text-purple-600">{replyTo.userName}</p>
              <p className="text-gray-500 truncate">{replyTo.content}</p>
            </div>
            <button onClick={() => setReplyTo(null)} className="p-1 hover:bg-gray-200 rounded-full">
              <X size={14}/>
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
            className="flex-1 bg-white px-4 py-2.5 rounded-xl text-sm outline-none shadow-sm" 
          />
          <button 
            onClick={sendMessage} 
            disabled={!newMessage.trim() || isSending}
            className={`p-2.5 rounded-full transition-all ${newMessage.trim() ? 'bg-purple-600 text-white shadow-md hover:scale-105' : 'bg-gray-300 text-gray-500'}`}
          >
            <Send size={20}/>
          </button>
        </div>
      </div>
    </div>
  );
}
