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

interface Message {
  id: number;
  content: string;
  media_url?: string;
  created_at: string;
  userId: string;
  user_id?: string;
  userName?: string;
  userAvatar?: string;
  reply_to_id?: number;
  reply_to_content?: string;
  reply_to_user_name?: string;
  user?: {
    id: string;
    name: string;
    avatar: string;
  };
}

export default function EnhancedGroupChat({ group, currentUser, onBack, onTypingChange, onOnlineChange }: any) {
  const router = useRouter();
  const params = useParams();
  const toast = useToast();
  const locale = params?.locale as string || 'ar';
  const t = useTranslations('community');
  const tMessages = useTranslations('messages');
  const tCommon = useTranslations('common');
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [replyTo, setReplyTo] = useState<any>(null);
  const [typingUsers, setTypingUsers] = useState<any[]>([]);
  const [onlineMembersCount, setOnlineMembersCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [totalMembers, setTotalMembers] = useState(group.membersCount || 0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);
  const typingTimeoutRef = useRef<any>(null);
  const [avatarMenu, setAvatarMenu] = useState<{
    isOpen: boolean;
    userId: string;
    userName: string;
    position: { x: number; y: number };
  }>({
    isOpen: false,
    userId: '',
    userName: '',
    position: { x: 0, y: 0 }
  });
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    fetchMessages();
    initializeRealtime();
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [group.id]);

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/groups/${group.id}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setIsLoading(false);
      setTimeout(scrollToBottom, 100);
    }
  };

  const initializeRealtime = () => {
    if (channelRef.current) return;

    const channelId = `group_${group.id}`;
    const channel = supabase.channel(channelId, {
      config: {
        presence: { key: currentUser?.id || `anon_${Math.random().toString(36).substring(2, 7)}` },
        broadcast: { self: true, ack: false }, // self: true is critical for immediate local feedback
      }
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState();
        const ids: string[] = [];
        Object.values(newState).forEach((presences: any) => {
          presences.forEach((p: any) => {
            if (p.userId && !ids.includes(p.userId)) {
              ids.push(p.userId);
            }
          });
        });
        setOnlineUsers(ids);
        setOnlineMembersCount(ids.length);
        if (onOnlineChange) onOnlineChange(ids.length);
      })
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'group_messages',
        filter: `group_id=eq.${group.id}` 
      }, async (payload) => {
        const newMsg = payload.new;
        
        // Check if message already exists (from broadcast)
        setMessages((prev: any[]) => {
          if (prev.some((m: any) => m.id === newMsg.id)) return prev;
          
          // Fetch user data for the new message
          supabase
            .from('users')
            .select('id, name, avatar')
            .eq('id', newMsg.user_id)
            .single()
            .then(({ data: userData }) => {
              setMessages(current => current.map(m => 
                m.id === newMsg.id ? { ...m, user: userData } : m
              ));
            });

          return [...prev, {
            ...newMsg,
            userId: newMsg.user_id,
            timestamp: newMsg.created_at || new Date().toISOString(),
          }];
        });
        setTimeout(scrollToBottom, 100);
      })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.userId !== currentUser?.id) {
          if (payload.isTyping) {
            setTypingUsers((prev: any[]) => {
              if (prev.find((u: any) => u.userId === payload.userId)) return prev;
              const newList = [...prev, { userId: payload.userId, name: payload.userName }];
              if (onTypingChange) onTypingChange(newList);
              return newList;
            });
          } else {
            setTypingUsers((prev: any[]) => {
              const newList = prev.filter((u: any) => u.userId !== payload.userId);
              if (onTypingChange) onTypingChange(newList);
              return newList;
            });
          }
        }
      })
      .on('broadcast', { event: 'new-message' }, ({ payload }) => {
        console.log('Broadcast message received:', payload);
        setMessages((prev: any[]) => {
          // Check if message already exists by ID or temporary ID
          if (prev.some((m: any) => m.id === payload.message.id || (m.tempId && m.tempId === payload.message.tempId))) {
            return prev;
          }
          return [...prev, payload.message];
        });
        setTimeout(scrollToBottom, 100);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            userId: currentUser?.id || 'anonymous',
            userName: currentUser?.name || 'Guest',
            online_at: new Date().toISOString(),
          });
        }
      });

    channelRef.current = channel;
  };

  const handleTyping = (isTyping: boolean) => {
    if (channelRef.current && currentUser) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          userId: currentUser.id,
          userName: currentUser.name,
          isTyping
        }
      });
    }
    
    if (isTyping) {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => handleTyping(false), 3000);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    setIsSending(true);
    const content = newMessage.trim();
    const tempId = Date.now();
    setNewMessage('');
    handleTyping(false);

    // Create a temporary message object for immediate UI update
    const tempMsg = {
      id: tempId,
      tempId: tempId,
      content,
      userId: currentUser.id,
      user_id: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar,
      created_at: new Date().toISOString(),
      timestamp: new Date().toISOString(),
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
    setMessages(prev => [...prev, tempMsg]);
    setTimeout(scrollToBottom, 50);

    // Broadcast immediately to others
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'new-message',
        payload: { message: tempMsg, userId: currentUser.id }
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
        const finalMsg = data.message;
        // Replace temp message with final message from DB
        setMessages(prev => prev.map(m => m.tempId === tempId ? { ...finalMsg, user: tempMsg.user } : m));
      }
      
      setReplyTo(null);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Error sending message');
    } finally {
      setIsSending(false);
    }
  };

  const deleteMessage = async (messageId: number) => {
    if (!confirm(t('deleteMessageConfirm'))) return;
    try {
      const res = await fetch(`/api/groups/${group.id}/messages/${messageId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setMessages(prev => prev.filter(m => m.id !== messageId));
      }
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  const handleLeaveGroup = async () => {
    if (!confirm(t('leaveGroupConfirm'))) return;
    try {
      const res = await fetch(`/api/groups/${group.id}/leave`, {
        method: 'POST',
      });
      if (res.ok) onBack();
    } catch (error) {
      console.error('Error leaving group:', error);
    }
  };

  const handleAvatarClick = (e: React.MouseEvent, userId: string, userName: string) => {
    e.preventDefault();
    setAvatarMenu({
      isOpen: true,
      userId,
      userName,
      position: { x: e.clientX, y: e.clientY }
    });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (date: string) => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString(locale === 'ar' ? 'ar-EG' : 'en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getAvatarUrl = (avatar: string | null) => {
    if (!avatar) return '/default-avatar.png';
    if (avatar.startsWith('http')) return avatar;
    return avatar;
  };

  return (
    <div className="flex flex-col h-full md:h-[calc(100vh-8rem)] bg-[#efeae2] md:rounded-2xl shadow-xl overflow-hidden border border-gray-200 relative">
      <UserAvatarMenu 
        isOpen={avatarMenu.isOpen}
        userId={avatarMenu.userId}
        userName={avatarMenu.userName}
        position={avatarMenu.position}
        onClose={() => setAvatarMenu(prev => ({ ...prev, isOpen: false }))}
      />

      {selectedImage && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setSelectedImage(null)}>
          <button className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"><X className="w-8 h-8" /></button>
          <div className="relative max-w-5xl max-h-[90vh] w-full h-full flex items-center justify-center">
            <Image src={selectedImage} alt="Full size" fill className="object-contain" unoptimized />
          </div>
        </div>
      )}

      {/* Header removed to avoid duplication with page.tsx */}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 relative z-10">
        {isLoading ? (
          <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div></div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.userId === currentUser?.id || msg.user_id === currentUser?.id;
            const userName = msg.user?.name || msg.userName || 'User';
            const userAvatar = msg.user?.avatar || msg.userAvatar || null;
            return (
              <div key={msg.id} id={`msg-${msg.id}`} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} items-end gap-2 group/msg transition-all duration-500 rounded-2xl`}>
                {!isOwn && (
                  <div className="relative flex-shrink-0">
                    <button onClick={(e) => handleAvatarClick(e, msg.userId || msg.user_id, userName)} className="w-8 h-8 rounded-full overflow-hidden shadow-sm hover:ring-2 hover:ring-purple-400 transition-all">
                      <Image src={getAvatarUrl(userAvatar)} alt={userName} width={32} height={32} className="object-cover" unoptimized />
                    </button>
                    {onlineUsers.includes(msg.userId || msg.user_id) && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full shadow-sm"></div>}
                  </div>
                )}
                <div className={`max-w-[80%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                  {!isOwn && <span className="text-[10px] font-black text-purple-600 ml-2 mb-0.5">{userName}</span>}
                  <div className={`relative px-4 py-2.5 rounded-2xl shadow-sm ${isOwn ? 'bg-[#dcf8c6] text-gray-800 rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none'}`}>
                    {msg.reply_to_content && (
                      <div className="mb-2 p-2 bg-black/5 rounded-lg border-l-4 border-purple-500 text-[11px] cursor-pointer hover:bg-black/10 transition-colors" onClick={() => {
                        const element = document.getElementById(`msg-${msg.reply_to_id}`);
                        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        element?.classList.add('ring-2', 'ring-purple-400', 'ring-offset-2');
                        setTimeout(() => element?.classList.remove('ring-2', 'ring-purple-400', 'ring-offset-2'), 2000);
                      }}>
                        <p className="font-black text-purple-600 mb-0.5">{msg.reply_to_user_name}</p>
                        <p className="text-gray-600 truncate">{msg.reply_to_content}</p>
                      </div>
                    )}
                    {msg.media_url && (
                      <div className="mb-2 rounded-xl overflow-hidden cursor-zoom-in hover:opacity-95 transition-opacity" onClick={() => setSelectedImage(msg.media_url)}>
                        <Image src={msg.media_url} alt="Attachment" width={300} height={200} className="w-full h-auto object-cover max-h-60" unoptimized />
                      </div>
                    )}
                    <p className="text-sm font-medium whitespace-pre-wrap break-words">{msg.content}</p>
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <span className="text-[9px] text-gray-500 font-bold">{formatTime(msg.created_at || msg.timestamp)}</span>
                      {isOwn && <CheckCheck className="w-3 h-3 text-blue-500" />}
                    </div>
                    <div className={`absolute ${isOwn ? '-left-12' : '-right-12'} top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover/msg:opacity-100 transition-all`}>
                      <button onClick={() => setReplyTo({ id: msg.id, content: msg.content, userName })} className="p-2 text-gray-400 hover:text-purple-500" title="Reply"><Reply className="w-4 h-4" /></button>
                      {isOwn && <button onClick={() => deleteMessage(msg.id)} className="p-2 text-gray-400 hover:text-red-500" title="Delete"><Trash2 className="w-4 h-4" /></button>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-[#f0f2f5] p-3 flex flex-col gap-2 z-20">
        {replyTo && (
          <div className="flex items-center justify-between bg-white/50 p-2 rounded-xl border-l-4 border-purple-500 animate-in slide-in-from-bottom-2">
            <div className="min-w-0"><p className="text-[10px] font-black text-purple-600">{replyTo.userName}</p><p className="text-xs text-gray-600 truncate">{replyTo.content}</p></div>
            <button onClick={() => setReplyTo(null)} className="p-1 hover:bg-gray-200 rounded-full"><X className="w-4 h-4 text-gray-400" /></button>
          </div>
        )}
        <div className="flex items-center gap-3">
          <button className="p-2 text-gray-500 hover:bg-gray-200 rounded-full transition-colors"><ImageIcon className="w-6 h-6" /></button>
          <div className="flex-1 relative">
            <input type="text" value={newMessage} onChange={(e) => { setNewMessage(e.target.value); handleTyping(true); }} onKeyPress={(e) => e.key === 'Enter' && sendMessage()} placeholder={tMessages('typeMessage')} className="w-full bg-white px-5 py-3 rounded-2xl text-sm focus:outline-none shadow-sm font-black text-gray-900 placeholder:text-gray-400" />
          </div>
          <button onClick={sendMessage} disabled={!newMessage.trim() || isSending} className={`p-3 rounded-full transition-all shadow-md ${newMessage.trim() && !isSending ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}><Send className="w-5 h-5" /></button>
        </div>
      </div>
    </div>
  );
}
