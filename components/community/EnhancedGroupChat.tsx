'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useToast } from '@/lib/contexts/ToastContext';
import { supabase } from '@/lib/supabase/client';
import { 
  Send, 
  ArrowLeft, 
  Users, 
  Image as ImageIcon, 
  CheckCheck,
  MoreVertical,
  LogOut,
  User,
  Trash2,
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
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);
  const typingTimeoutRef = useRef<any>(null);
  const [avatarMenu, setAvatarMenu] = useState<any>({ isOpen: false, userId: '', userName: '', position: { x: 0, y: 0 } });
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    fetchMessages();
    
    // Create a unique channel for this group
    const channel = supabase.channel(`realtime_group_${group.id}`, {
      config: { presence: { key: currentUser?.id }, broadcast: { self: true } }
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const ids = Object.keys(state);
        setOnlineUsers(ids);
        if (onOnlineChange) onOnlineChange(ids.length);
      })
      .on('broadcast', { event: 'msg' }, ({ payload }) => {
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
        if (status === 'SUBSCRIBED') {
          await channel.track({ userId: currentUser?.id, name: currentUser?.name, online_at: new Date().toISOString() });
        }
      });

    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [group.id]);

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
    channelRef.current.send({ type: 'broadcast', event: 'typ', payload: { uid: currentUser.id, name: currentUser.name, is } });
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
      id: tempId, tempId, content, userId: currentUser.id, user_id: currentUser.id,
      userName: currentUser.name, userAvatar: currentUser.avatar,
      created_at: new Date().toISOString(),
      user: { id: currentUser.id, name: currentUser.name, avatar: currentUser.avatar },
      reply_to_id: replyTo?.id, reply_to_content: replyTo?.content, reply_to_user_name: replyTo?.userName
    };

    // Immediate Broadcast
    channelRef.current?.send({ type: 'broadcast', event: 'msg', payload: msgObj });

    try {
      const res = await fetch(`/api/groups/${group.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, replyToId: replyTo?.id, replyToContent: replyTo?.content, replyToUserName: replyTo?.userName }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(prev => prev.map(m => m.tempId === tempId ? { ...data.message, user: msgObj.user } : m));
      }
      setReplyTo(null);
    } catch (error) {
      toast.error('Error');
    }
  };

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  const formatTime = (date: string) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleTimeString(locale === 'ar' ? 'ar-EG' : 'en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  return (
    <div className="flex flex-col h-full bg-[#efeae2] relative">
      <UserAvatarMenu isOpen={avatarMenu.isOpen} userId={avatarMenu.userId} userName={avatarMenu.userName} position={avatarMenu.position} onClose={() => setAvatarMenu({ ...avatarMenu, isOpen: false })} />
      {selectedImage && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
          <Image src={selectedImage} alt="Full" fill className="object-contain" unoptimized />
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? <div className="flex justify-center p-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div></div> : 
          messages.map((msg) => {
            const isOwn = msg.userId === currentUser?.id || msg.user_id === currentUser?.id;
            return (
              <div key={msg.id} id={`msg-${msg.id}`} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} items-end gap-2 group/msg`}>
                {!isOwn && <button onClick={(e) => setAvatarMenu({ isOpen: true, userId: msg.userId, userName: msg.user?.name, position: { x: e.clientX, y: e.clientY } })} className="w-8 h-8 rounded-full overflow-hidden">
                  <Image src={msg.user?.avatar || '/default-avatar.png'} alt="avatar" width={32} height={32} className="object-cover" unoptimized />
                </button>}
                <div className={`max-w-[80%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                  {!isOwn && <span className="text-[10px] font-black text-purple-600 ml-2">{msg.user?.name}</span>}
                  <div className={`relative px-4 py-2 rounded-2xl shadow-sm ${isOwn ? 'bg-[#dcf8c6] rounded-tr-none' : 'bg-white rounded-tl-none'}`}>
                    {msg.reply_to_content && <div className="mb-2 p-2 bg-black/5 border-l-4 border-purple-500 text-[11px]">{msg.reply_to_content}</div>}
                    <p className="text-sm font-medium">{msg.content}</p>
                    <div className="flex justify-end gap-1 mt-1">
                      <span className="text-[9px] text-gray-500">{formatTime(msg.created_at)}</span>
                      {isOwn && <CheckCheck className="w-3 h-3 text-blue-500" />}
                    </div>
                    <button onClick={() => setReplyTo({ id: msg.id, content: msg.content, userName: msg.user?.name })} className="absolute -right-8 top-1/2 opacity-0 group-hover/msg:opacity-100"><Reply size={16}/></button>
                  </div>
                </div>
              </div>
            );
          })
        }
        <div ref={messagesEndRef} />
      </div>

      <div className="bg-[#f0f2f5] p-3 flex flex-col gap-2">
        {replyTo && <div className="flex justify-between bg-white/50 p-2 rounded-lg border-l-4 border-purple-500 text-xs"><span>{replyTo.content}</span><button onClick={() => setReplyTo(null)}><X size={14}/></button></div>}
        <div className="flex items-center gap-3">
          <input type="text" value={newMessage} onChange={(e) => { setNewMessage(e.target.value); handleTyping(true); }} onKeyPress={(e) => e.key === 'Enter' && sendMessage()} placeholder={tMessages('typeMessage')} className="flex-1 bg-white px-4 py-2 rounded-xl text-sm outline-none" />
          <button onClick={sendMessage} className="p-2 bg-purple-600 text-white rounded-full"><Send size={20}/></button>
        </div>
      </div>
    </div>
  );
}
