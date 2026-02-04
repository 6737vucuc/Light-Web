'use client';

import { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Send,
  Image as ImageIcon,
  MoreVertical,
  Trash2,
  Users,
  X,
  CheckCheck,
  MessageSquare,
  Phone,
  LogOut,
  Info
} from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import Pusher from 'pusher-js';
import UserAvatarMenu from './UserAvatarMenu';

interface EnhancedGroupChatProps {
  group: any;
  currentUser: any;
  onBack: () => void;
}

export default function EnhancedGroupChat({ group, currentUser, onBack }: EnhancedGroupChatProps) {
  const router = useRouter();
  const params = useParams();
  const locale = params?.locale as string || 'ar';
  const t = useTranslations('community');
  const tCommon = useTranslations('common');
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [onlineMembersCount, setOnlineMembersCount] = useState(0);
  const [totalMembers, setTotalMembers] = useState(group.membersCount || 0);
  const [typingUsers, setTypingUsers] = useState<any[]>([]);
  const [showUserProfile, setShowUserProfile] = useState<any>(null);
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const [avatarMenu, setAvatarMenu] = useState<{ isOpen: boolean; userId: number; userName: string; position: { x: number; y: number } }>({
    isOpen: false,
    userId: 0,
    userName: '',
    position: { x: 0, y: 0 }
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pusherRef = useRef<Pusher | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadInitialData();
    initializePusher();
    
    return () => {
      if (pusherRef.current) {
        pusherRef.current.unsubscribe(`group-${group.id}`);
      }
    };
  }, [group.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowGroupMenu(false);
      }
    };
    if (showGroupMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showGroupMenu]);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/groups/${group.id}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }

      const statsRes = await fetch(`/api/groups/${group.id}/stats`);
      if (statsRes.ok) {
        const stats = await statsRes.json();
        setTotalMembers(stats.totalMembers || 0);
        setOnlineMembersCount(stats.onlineMembers || 0);
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const initializePusher = () => {
    if (pusherRef.current) return;

    const pusherKey = process.env.NEXT_PUBLIC_PUSHER_APP_KEY || process.env.NEXT_PUBLIC_PUSHER_KEY;
    const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us2';

    if (!pusherKey) return;

    pusherRef.current = new Pusher(pusherKey, { cluster: pusherCluster });
    const channel = pusherRef.current.subscribe(`group-${group.id}`);

    channel.bind('new-message', (data: any) => {
      setMessages((prev) => {
        if (prev.find(m => m.id === data.id)) return prev;
        const formattedMessage = {
          ...data,
          user_id: data.userId || data.user_id,
          created_at: data.timestamp || data.created_at,
          user: data.user || null
        };
        return [...prev, formattedMessage];
      });
      scrollToBottom();
    });

    channel.bind('message-deleted', (data: any) => {
      setMessages((prev) => prev.filter(m => m.id !== data.messageId));
    });

    channel.bind('user-typing', (data: any) => {
      if (data.userId !== currentUser?.id) {
        if (data.isTyping) {
          setTypingUsers((prev) => {
            if (prev.find(u => u.userId === data.userId)) return prev;
            return [...prev, { userId: data.userId, name: data.name }];
          });
        } else {
          setTypingUsers((prev) => prev.filter(u => u.userId !== data.userId));
        }
      }
    });

    channel.bind('member-update', (data: any) => {
      if (data.membersCount !== undefined) {
        setTotalMembers(data.membersCount);
      }
    });

    channel.bind('presence-update', () => {
      fetch(`/api/groups/${group.id}/stats`)
        .then(res => res.json())
        .then(stats => {
          setTotalMembers(stats.totalMembers || 0);
          setOnlineMembersCount(stats.onlineMembers || 0);
        });
    });
  };

  const handleTyping = (isTyping: boolean) => {
    fetch(`/api/groups/${group.id}/typing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isTyping }),
    }).catch(console.error);

    if (isTyping) {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => handleTyping(false), 3000);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    setIsSending(true);
    
    try {
      const res = await fetch(`/api/groups/${group.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMessage.trim() }),
      });

      if (res.ok) {
        setNewMessage('');
        handleTyping(false);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const deleteMessage = async (messageId: number) => {
    if (!confirm(t('deleteMessageConfirm'))) return;
    
    try {
      const res = await fetch(`/api/groups/${group.id}/messages/${messageId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deleteForEveryone: true }),
      });

      if (res.ok) {
        setMessages((prev) => prev.filter(m => m.id !== messageId));
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
        headers: { 'Content-Type': 'application/json' },
      });

      if (res.ok) {
        onBack();
      }
    } catch (error) {
      console.error('Error leaving group:', error);
    }
  };

  const handleAvatarClick = (e: React.MouseEvent, userId: number, userName: string) => {
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

  const getAvatarUrl = (avatar?: string | null) => {
    if (!avatar) return '/default-avatar.png';
    if (avatar.startsWith('data:') || avatar.startsWith('http')) return avatar;
    return `https://neon-image-bucket.s3.us-east-1.amazonaws.com/${avatar}`;
  };

  const formatTime = (date: any) => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString(locale === 'ar' ? 'ar-SA' : 'en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    });
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
                  <span className="text-green-600">●</span> {onlineMembersCount} {t('online')} • {totalMembers} {t('members')}
                </p>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-1">
          <button 
            onClick={handleLeaveGroup}
            className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-all md:hidden"
            title={t('leaveGroup')}
          >
            <LogOut className="w-5 h-5" />
          </button>
          <div className="relative">
            <button 
              onClick={() => setShowGroupMenu(!showGroupMenu)}
              className="p-2.5 hover:bg-gray-200 rounded-xl text-gray-600 transition-all"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            
            {showGroupMenu && (
              <div ref={menuRef} className="absolute top-full right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-30 animate-in fade-in zoom-in-95 duration-200">
                <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-gray-700 transition-colors">
                  <Info className="w-5 h-5 text-purple-500" />
                  <span className="text-sm font-black">{t('groupInfo')}</span>
                </button>
                <div className="h-px bg-gray-50 my-1 mx-2" />
                <button 
                  onClick={handleLeaveGroup}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 text-red-600 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="text-sm font-black">{t('leaveGroup')}</span>
                </button>
              </div>
            )}
          </div>
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
                        {formatTime(msg.created_at)}
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
            placeholder={t('typeMessage')}
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
