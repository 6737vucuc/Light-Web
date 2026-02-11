'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useToast } from '@/hooks/use-toast';
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
  Trash2
} from 'lucide-react';
import Image from 'next/image';
import { UserAvatarMenu } from './UserAvatarMenu';

interface Message {
  id: number;
  content: string;
  media_url?: string;
  created_at: string;
  userId: string;
  user_id?: string;
  userName?: string;
  userAvatar?: string;
  user?: {
    id: string;
    name: string;
    avatar: string;
  };
}

export default function EnhancedGroupChat({ group, currentUser, onBack }: any) {
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
  const [typingUsers, setTypingUsers] = useState<any[]>([]);
  const [onlineMembersCount, setOnlineMembersCount] = useState(0);
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

    const channel = supabase.channel(`group-chat-${group.id}`, {
      config: {
        broadcast: { self: false },
      }
    });

    channel
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'group_messages',
        filter: `group_id=eq.${group.id}` 
      }, async (payload) => {
        console.log('New group message via Postgres:', payload.new);
        const newMsg = payload.new;
        
        const { data: userData } = await supabase
          .from('users')
          .select('id, name, avatar')
          .eq('id', newMsg.user_id)
          .single();

        setMessages((prev: any[]) => {
          if (prev.some((m: any) => m.id === newMsg.id)) return prev;
          return [...prev, {
            ...newMsg,
            userId: newMsg.user_id,
            timestamp: newMsg.created_at,
            user: userData
          }];
        });
        setTimeout(scrollToBottom, 100);
      })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        console.log('Typing event received:', payload);
        if (payload.userId !== currentUser?.id) {
          if (payload.isTyping) {
            setTypingUsers((prev: any[]) => {
              if (prev.find((u: any) => u.userId === payload.userId)) return prev;
              return [...prev, { userId: payload.userId, name: payload.userName }];
            });
          } else {
            setTypingUsers((prev: any[]) => prev.filter((u: any) => u.userId !== payload.userId));
          }
        }
      })
      .on('broadcast', { event: 'member-update' }, ({ payload }) => {
        if (payload.membersCount !== undefined) {
          setTotalMembers(payload.membersCount);
        }
      })
      .on('broadcast', { event: 'presence-update' }, () => {
        fetch(`/api/groups/${group.id}/stats`)
          .then(res => res.json())
          .then(stats => {
            setTotalMembers(stats.totalMembers || 0);
            setOnlineMembersCount(stats.onlineMembers || 0);
          });
      })
      .subscribe();

    channelRef.current = channel;
  };

  const handleTyping = (isTyping: boolean) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          userId: currentUser?.id,
          userName: currentUser?.name,
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
    setNewMessage('');
    handleTyping(false);

    try {
      const res = await fetch(`/api/groups/${group.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      if (!res.ok) {
        toast.error('Failed to send message');
      }
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
        if (channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'message-deleted',
            payload: { messageId }
          });
        }
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

      if (res.ok) {
        onBack();
      }
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
    return new Date(date).toLocaleTimeString(locale === 'ar' ? 'ar-SA' : 'en-US', {
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
      {/* Avatar Menu */}
      <UserAvatarMenu 
        isOpen={avatarMenu.isOpen}
        userId={avatarMenu.userId}
        userName={avatarMenu.userName}
        position={avatarMenu.position}
        onClose={() => setAvatarMenu(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Header */}
      <div className="bg-[#f0f2f5] p-3 flex items-center justify-between border-b border-gray-200 z-20 shadow-sm">
        <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
          <button onClick={onBack} className="p-2 hover:bg-gray-200 rounded-full transition-colors flex-shrink-0">
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white shadow-md flex-shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h2 className="font-black text-gray-900 leading-tight truncate">{group.name}</h2>
              {typingUsers.length > 0 ? (
                <p className="text-[11px] text-green-600 font-black animate-pulse truncate">
                  {typingUsers[0].name} {tCommon('loading')}
                </p>
              ) : (
                <p className="text-[11px] text-gray-500 font-black truncate">
                  <span className="text-green-600">●</span> {onlineMembersCount} {tMessages('online')} • {totalMembers} {t('members')}
                </p>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <button 
            onClick={handleLeaveGroup}
            className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
            title={t('leaveGroup')}
          >
            <LogOut className="w-5 h-5" />
          </button>
          <button className="p-2 text-gray-500 hover:bg-gray-200 rounded-full transition-colors">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 relative z-10">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.userId === currentUser?.id || msg.user_id === currentUser?.id;
            const userName = msg.user?.name || msg.userName || 'User';
            const userAvatar = msg.user?.avatar || msg.userAvatar || null;
            
            return (
              <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} items-end gap-2 group/msg`}>
                {!isOwn && (
                  <button 
                    onClick={(e) => handleAvatarClick(e, msg.userId || msg.user_id, userName)}
                    className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 shadow-sm hover:ring-2 hover:ring-purple-400 transition-all"
                  >
                    <Image src={getAvatarUrl(userAvatar)} alt={userName} width={32} height={32} className="object-cover" unoptimized />
                  </button>
                )}
                
                <div className={`max-w-[80%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                  {!isOwn && <span className="text-[10px] font-black text-purple-600 ml-2 mb-0.5">{userName}</span>}
                  <div className={`relative px-4 py-2.5 rounded-2xl shadow-sm ${
                    isOwn 
                      ? 'bg-[#dcf8c6] text-gray-800 rounded-tr-none' 
                      : 'bg-white text-gray-800 rounded-tl-none'
                  }`}>
                    <p className="text-sm font-medium whitespace-pre-wrap break-words">{msg.content}</p>
                    <div className="flex items-center justify-end gap-1 mt-1">
                      <span className="text-[9px] text-gray-500 font-bold">
                        {formatTime(msg.created_at || msg.timestamp)}
                      </span>
                      {isOwn && <CheckCheck className="w-3 h-3 text-blue-500" />}
                    </div>
                    
                    {isOwn && (
                      <button 
                        onClick={() => deleteMessage(msg.id)}
                        className="absolute -left-10 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-red-500 opacity-0 group-hover/msg:opacity-100 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-[#f0f2f5] p-3 flex items-center gap-3 z-20">
        <button className="p-2 text-gray-500 hover:bg-gray-200 rounded-full transition-colors">
          <ImageIcon className="w-6 h-6" />
        </button>
        <div className="flex-1 relative">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping(true);
            }}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder={tMessages('typeMessage')}
            className="w-full bg-white px-5 py-3 rounded-2xl text-sm focus:outline-none shadow-sm font-black text-gray-900 placeholder:text-gray-400"
          />
        </div>
        <button
          onClick={sendMessage}
          disabled={!newMessage.trim() || isSending}
          className={`p-3 rounded-full transition-all shadow-md ${
            newMessage.trim() && !isSending 
              ? 'bg-purple-600 text-white hover:bg-purple-700' 
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
