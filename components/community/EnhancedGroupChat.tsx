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
import ModernMessenger from './ModernMessenger';

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
<<<<<<< HEAD
  const [showUserProfile, setShowUserProfile] = useState<any>(null);
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const [avatarMenu, setAvatarMenu] = useState<{ isOpen: boolean; userId: number; userName: string; avatar: string | null; position: { x: number; y: number } }>({
    isOpen: false,
    userId: 0,
    userName: '',
    avatar: null,
    position: { x: 0, y: 0 }
  });
  const [activePrivateChat, setActivePrivateChat] = useState<any>(null);
  
=======
>>>>>>> 98cae3d2ff15d52f43e52465d0dda46a1c404f9b
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);
  const [avatarMenu, setAvatarMenu] = useState<any>({ isOpen: false, userId: '', userName: '', position: { x: 0, y: 0 } });
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    fetchMessages();
    
    // Use a public channel for maximum reliability during testing
    const channelName = `chat-${group.id}`;
    const channel = pusherClient.subscribe(channelName);

    // Listen for new messages
    channel.bind('new-message', (data: any) => {
      console.log('Pusher message received:', data);
      setMessages(prev => {
        // Avoid duplicate messages for the sender
        if (prev.some(m => m.id === data.id)) return prev;
        return [...prev, data];
      });
      setTimeout(scrollToBottom, 50);
    });

    // Listen for typing status
    channel.bind('typing', (data: any) => {
      console.log('Typing event received:', data);
      if (data.userId === currentUser?.id) return;
      
      setTypingUsers(prev => {
        const filtered = prev.filter(u => u.userId !== data.userId);
        const newList = data.isTyping ? [...filtered, { userId: data.userId, name: data.userName }] : filtered;
        if (onTypingChange) onTypingChange(newList);
        return newList;
      });
    });

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

<<<<<<< HEAD
  const initializeRealtime = () => {
    if (channelRef.current) return;

    const channel = supabase.channel(`group-${group.id}`, {
      config: {
        broadcast: { self: false },
      }
    });

    channel
      .on('broadcast', { event: 'new-message' }, ({ payload }) => {
        setMessages((prev) => {
          if (prev.find(m => m.id === payload.id)) return prev;
          const formattedMessage = {
            ...payload,
            user_id: payload.userId || payload.user_id,
            created_at: payload.timestamp || payload.created_at,
            user: payload.user || null
          };
          return [...prev, formattedMessage];
        });
        scrollToBottom();
      })
      .on('broadcast', { event: 'message-deleted' }, ({ payload }) => {
        setMessages((prev) => prev.filter(m => m.id !== payload.messageId));
      })
      .on('broadcast', { event: 'user-typing' }, ({ payload }) => {
        if (payload.userId !== currentUser?.id) {
          if (payload.isTyping) {
            setTypingUsers((prev) => {
              if (prev.find(u => u.userId === payload.userId)) return prev;
              return [...prev, { userId: payload.userId, name: payload.name }];
            });
          } else {
            setTypingUsers((prev) => prev.filter(u => u.userId !== payload.userId));
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
    if (!channelRef.current || !currentUser) return;

    channelRef.current.send({
      type: 'broadcast',
      event: 'user-typing',
      payload: { 
        userId: currentUser.id, 
        name: currentUser.name,
        isTyping 
      }
    });

=======
  const handleTyping = async (isTyping: boolean) => {
    if (!currentUser) return;
    
    // Broadcast typing status via API for maximum reliability
    try {
      fetch(`/api/groups/${group.id}/typing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isTyping }),
      });
    } catch (error) {
      console.error('Error broadcasting typing:', error);
    }
    
>>>>>>> 98cae3d2ff15d52f43e52465d0dda46a1c404f9b
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
    setIsSending(true);

    // Update local UI immediately (Optimistic UI)
    const tempMsg = {
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

    setMessages(prev => [...prev, tempMsg]);
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
        setMessages(prev => prev.map(m => m.tempId === tempId ? { ...data.message, user: tempMsg.user } : m));
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Error sending message');
    } finally {
      setIsSending(false);
      setReplyTo(null);
    }
  };

<<<<<<< HEAD
  const deleteMessage = async (messageId: number) => {
    const confirmed = await toast.confirm({
      title: t('deleteMessage'),
      message: t('deleteMessageConfirm'),
      type: 'danger'
    });
    if (!confirmed) return;
    
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
    const confirmed = await toast.confirm({
      title: t('leaveGroup'),
      message: t('leaveGroupConfirm'),
      type: 'danger'
    });
    if (!confirmed) return;
    
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

  const handleAvatarClick = (e: React.MouseEvent, userId: number, userName: string, avatar: string | null) => {
    e.preventDefault();
    setAvatarMenu({
      isOpen: true,
      userId,
      userName,
      avatar,
      position: { x: e.clientX, y: e.clientY }
    });
  };

=======
>>>>>>> 98cae3d2ff15d52f43e52465d0dda46a1c404f9b
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
<<<<<<< HEAD
        isOpen={avatarMenu.isOpen}
        userId={avatarMenu.userId}
        userName={avatarMenu.userName}
        avatar={avatarMenu.avatar}
        position={avatarMenu.position}
        onClose={() => setAvatarMenu(prev => ({ ...prev, isOpen: false }))}
        onSendMessage={(userData) => {
          setActivePrivateChat(userData);
          setAvatarMenu(prev => ({ ...prev, isOpen: false }));
        }}
      />

      {/* Private Chat Modal */}
      {activePrivateChat && (
        <ModernMessenger 
          recipient={activePrivateChat}
          currentUser={currentUser}
          onClose={() => setActivePrivateChat(null)}
        />
      )}

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
=======
        isOpen={avatarMenu.isOpen} 
        userId={avatarMenu.userId} 
        userName={avatarMenu.userName} 
        position={avatarMenu.position} 
        onClose={() => setAvatarMenu({ ...avatarMenu, isOpen: false })} 
      />
      
      {selectedImage && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
          <Image src={selectedImage} alt="Full" fill className="object-contain" unoptimized />
>>>>>>> 98cae3d2ff15d52f43e52465d0dda46a1c404f9b
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
<<<<<<< HEAD
                    onClick={(e) => handleAvatarClick(e, msg.userId || msg.user_id, userName, userAvatar)}
                    className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 shadow-sm hover:ring-2 hover:ring-purple-400 transition-all"
=======
                    onClick={(e) => setAvatarMenu({ isOpen: true, userId: msg.userId, userName: msg.user?.name, position: { x: e.clientX, y: e.clientY } })} 
                    className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 shadow-sm"
>>>>>>> 98cae3d2ff15d52f43e52465d0dda46a1c404f9b
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
