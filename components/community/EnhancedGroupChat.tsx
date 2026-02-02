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
  Eye,
  Ban
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase/client';

interface EnhancedGroupChatProps {
  group: any;
  currentUser: any;
  onBack: () => void;
}

export default function EnhancedGroupChat({ group, currentUser, onBack }: EnhancedGroupChatProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [onlineMembersCount, setOnlineMembersCount] = useState(0);
  const [totalMembers, setTotalMembers] = useState(0);
  const [typingUsers, setTypingUsers] = useState<any[]>([]);
  const [showUserProfile, setShowUserProfile] = useState<any>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadInitialData();
    setupRealtime();
    
    return () => {
      supabase.removeAllChannels();
    };
  }, [group.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      // 1. Load Messages
      const { data: msgs, error: msgsError } = await supabase
        .from('group_messages')
        .select(`
          *,
          user:users(id, name, avatar, username)
        `)
        .eq('group_id', group.id)
        .order('created_at', { ascending: true });

      if (msgs) setMessages(msgs);

      // 2. Load Stats
      const { count: membersCount } = await supabase
        .from('group_members')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', group.id);
      
      setTotalMembers(membersCount || 0);
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setupRealtime = () => {
    // 1. Listen for new messages
    const messageChannel = supabase
      .channel(`group-messages-${group.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'group_messages',
          filter: `group_id=eq.${group.id}`
        },
        async (payload) => {
          // Fetch user info for the new message
          const { data: userData } = await supabase
            .from('users')
            .select('id, name, avatar, username')
            .eq('id', payload.new.user_id)
            .single();
          
          const newMessage = { ...payload.new, user: userData };
          setMessages((prev) => [...prev, newMessage]);
        }
      )
      .subscribe();

    // 2. Presence & Typing
    const presenceChannel = supabase.channel(`group-presence-${group.id}`, {
      config: { presence: { key: currentUser.id.toString() } }
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const onlineCount = Object.keys(state).length;
        setOnlineMembersCount(onlineCount);
        
        // Update typing users from presence state
        const typing: any[] = [];
        Object.values(state).forEach((presences: any) => {
          presences.forEach((p: any) => {
            if (p.isTyping && p.userId !== currentUser.id) {
              typing.push({ userId: p.userId, name: p.name });
            }
          });
        });
        setTypingUsers(typing);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            userId: currentUser.id,
            name: currentUser.name,
            isTyping: false,
            online_at: new Date().toISOString(),
          });
        }
      });

    return presenceChannel;
  };

  const handleTyping = (isTyping: boolean) => {
    const channel = supabase.channel(`group-presence-${group.id}`);
    channel.track({
      userId: currentUser.id,
      name: currentUser.name,
      isTyping: isTyping,
      online_at: new Date().toISOString(),
    });

    if (isTyping) {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => handleTyping(false), 3000);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    setIsSending(true);
    
    try {
      const { error } = await supabase
        .from('group_messages')
        .insert({
          group_id: group.id,
          user_id: currentUser.id,
          content: newMessage.trim(),
          message_type: 'text'
        });

      if (!error) {
        setNewMessage('');
        handleTyping(false);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getAvatarUrl = (avatar?: string | null) => {
    if (!avatar) return '/default-avatar.png';
    if (avatar.startsWith('data:') || avatar.startsWith('http')) return avatar;
    return `https://neon-image-bucket.s3.us-east-1.amazonaws.com/${avatar}`;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-[#efeae2] rounded-2xl shadow-xl overflow-hidden border border-gray-200 relative">
      {/* User Profile Overlay */}
      {showUserProfile && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="relative h-40 bg-gradient-to-br from-purple-600 to-pink-500">
              <button onClick={() => setShowUserProfile(null)} className="absolute top-5 right-5 p-2 bg-white/20 text-white rounded-full">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="px-8 pb-8 text-center -mt-16">
              <div className="inline-block p-1.5 bg-white rounded-full shadow-2xl mb-4">
                <div className="w-28 h-28 rounded-full overflow-hidden">
                  <Image src={getAvatarUrl(showUserProfile.avatar)} alt={showUserProfile.name} width={112} height={112} className="object-cover" unoptimized />
                </div>
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-1">{showUserProfile.name}</h3>
              <p className="text-sm font-medium text-purple-600 mb-6">@{showUserProfile.username || 'user'}</p>
              <div className="grid grid-cols-2 gap-4 mb-8">
                <button className="flex flex-col items-center gap-2 py-4 bg-purple-50 text-purple-700 rounded-2xl">
                  <MessageSquare className="w-6 h-6" />
                  <span className="text-xs font-bold">Message</span>
                </button>
                <button className="flex flex-col items-center gap-2 py-4 bg-pink-50 text-pink-700 rounded-2xl">
                  <Phone className="w-6 h-6" />
                  <span className="text-xs font-bold">Call</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-[#f0f2f5] p-3 flex items-center justify-between border-b border-gray-200 z-20">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-gray-200 rounded-full">
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600"><Users className="w-6 h-6" /></div>
            <div>
              <h2 className="font-bold text-gray-800 leading-tight">{group.name}</h2>
              {typingUsers.length > 0 ? (
                <p className="text-[11px] text-green-600 font-medium animate-pulse">
                  {typingUsers[0].name} is typing...
                </p>
              ) : (
                <p className="text-[11px] text-gray-500">{onlineMembersCount} Online • {totalMembers} Members</p>
              )}
            </div>
          </div>
        </div>
        <button className="p-2 hover:bg-gray-200 rounded-full text-gray-600"><MoreVertical className="w-5 h-5" /></button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 relative z-10">
        {isLoading ? (
          <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div></div>
        ) : (
          messages.map((msg) => {
            const isOwn = msg.user_id === currentUser?.id;
            return (
              <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'} items-end gap-2`}>
                {!isOwn && (
                  <button onClick={() => setShowUserProfile(msg.user)} className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 mb-1">
                    <Image src={getAvatarUrl(msg.user?.avatar)} alt={msg.user?.name || 'User'} width={32} height={32} className="object-cover" unoptimized />
                  </button>
                )}
                <div className={`relative max-w-[75%] p-2.5 rounded-xl shadow-sm ${isOwn ? 'bg-[#dcf8c6] rounded-tr-none' : 'bg-white rounded-tl-none'}`}>
                  {!isOwn && <span className="text-[11px] font-bold text-purple-600 block mb-0.5">{msg.user?.name}</span>}
                  <p className="text-[14px] text-gray-900 leading-snug">{msg.content}</p>
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <span className="text-[9px] text-gray-500">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isOwn && <CheckCheck className="w-3 h-3 text-blue-500" />}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-[#f0f2f5] p-3 flex items-center gap-2 z-20">
        <button className="p-2 text-gray-500 hover:bg-gray-200 rounded-full"><ImageIcon className="w-6 h-6" /></button>
        <input 
          type="text" 
          placeholder="Type a message..." 
          value={newMessage} 
          onChange={(e) => {
            setNewMessage(e.target.value);
            handleTyping(true);
          }} 
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()} 
          className="flex-1 px-5 py-2.5 bg-white rounded-full focus:outline-none text-sm text-gray-900 shadow-sm" 
        />
        <button 
          onClick={sendMessage} 
          disabled={isSending || !newMessage.trim()} 
          className="p-3 bg-[#00a884] text-white rounded-full shadow-lg disabled:opacity-50"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
