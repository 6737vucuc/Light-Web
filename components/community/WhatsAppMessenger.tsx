'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Image as ImageIcon, ArrowLeft, MoreVertical, Phone, Search, Smile, Paperclip, Mic, X, Check, CheckCheck, Trash2, User as UserIcon, MessageCircle } from 'lucide-react';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import Peer from 'peerjs';
import CallOverlay from './CallOverlay';
import { useToast } from '@/lib/contexts/ToastContext';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabase/client';

interface WhatsAppMessengerProps {
  currentUser: any;
  initialUserId?: number;
  fullPage?: boolean;
  onBack?: () => void;
}

export default function WhatsAppMessenger({ currentUser, initialUserId, fullPage = false, onBack }: WhatsAppMessengerProps) {
  const router = useRouter();
  const params = useParams();
  const locale = params?.locale as string || 'ar';
  const isRtl = locale === 'ar';
  const t = useTranslations('messages');
  const tCommon = useTranslations('common');
  const toast = useToast();
  
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [otherUserOnline, setOtherUserOnline] = useState(false);
  const [otherUserLastSeen, setOtherUserLastSeen] = useState<string | null>(null);
  
  // Call States (Unchanged)
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'incoming' | 'connected' | 'ended'>('idle');
  const [callOtherUser, setCallOtherUser] = useState({ name: '', avatar: '' as string | null });
  const [peerId, setPeerId] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const peerRef = useRef<Peer | null>(null);
  const currentCallRef = useRef<any>(null);

  // Load Conversations
  const loadConversations = async () => {
    try {
      const res = await fetch('/api/direct-messages');
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
        setIsLoading(false);
      }
    } catch (error) { console.error(error); }
  };

  // Initialize Online Status & Realtime
  useEffect(() => {
    if (!currentUser?.id) return;

    loadConversations();

    // 1. Supabase Presence (Online Status)
    const channel = supabase.channel(`online-users`, {
      config: { presence: { key: currentUser.id.toString() } }
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        if (selectedConversation) {
          const isOnline = !!state[selectedConversation.other_user_id.toString()];
          setOtherUserOnline(isOnline);
        }
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        if (selectedConversation && key === selectedConversation.other_user_id.toString()) {
          setOtherUserOnline(true);
        }
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        if (selectedConversation && key === selectedConversation.other_user_id.toString()) {
          setOtherUserOnline(false);
          setOtherUserLastSeen(new Date().toISOString());
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString(), user_id: currentUser.id });
        }
      });

    // 2. Realtime Messages
    const messageChannel = supabase
      .channel('public:direct_messages')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'direct_messages',
        filter: `receiver_id=eq.${currentUser.id}`
      }, (payload) => {
        const newMsg = payload.new;
        if (selectedConversation && newMsg.sender_id === selectedConversation.other_user_id) {
          setMessages(prev => [...prev.filter(m => m.id !== newMsg.id), newMsg]);
          setTimeout(scrollToBottom, 100);
          // Mark as read
          fetch(`/api/messages/read?messageId=${newMsg.id}`, { method: 'POST' });
        }
        loadConversations();
      })
      .subscribe();

    // 3. Realtime Typing (Using Broadcast)
    const typingChannel = supabase.channel(`typing:${currentUser.id}`);
    typingChannel
      .on('broadcast', { event: 'typing' }, (payload) => {
        if (selectedConversation && payload.payload.senderId === selectedConversation.other_user_id) {
          setOtherUserTyping(payload.payload.isTyping);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(messageChannel);
      supabase.removeChannel(typingChannel);
    };
  }, [currentUser?.id, selectedConversation]);

  // PeerJS Call Logic (Kept as requested)
  useEffect(() => {
    if (typeof window === 'undefined' || !currentUser?.id) return;
    const myId = `light-user-${currentUser.id}-${Date.now()}`;
    const peer = new Peer(myId, { host: '0.peerjs.com', port: 443, secure: true });
    peer.on('open', (id) => { 
      setPeerId(id); 
      peerRef.current = peer;
      supabase.from('users').update({ current_peer_id: id }).eq('id', currentUser.id);
    });
    peer.on('call', (call) => {
      currentCallRef.current = call;
      setCallStatus('incoming');
    });
    return () => { peer.destroy(); };
  }, [currentUser?.id]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.other_user_id);
      setOtherUserOnline(selectedConversation.is_online);
      setOtherUserLastSeen(selectedConversation.last_seen);
    }
  }, [selectedConversation]);

  const fetchMessages = async (otherUserId: number) => {
    try {
      const res = await fetch(`/api/messages?userId=${otherUserId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        setTimeout(scrollToBottom, 100);
      }
    } catch (error) { console.error(error); }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() || isSending || !selectedConversation) return;

    setIsSending(true);
    const content = newMessage.trim();
    setNewMessage('');

    try {
      const res = await fetch('/api/direct-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId: selectedConversation.other_user_id, content }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, data.message]);
        setTimeout(scrollToBottom, 100);
        loadConversations();
      }
    } catch (error) { toast.error('Failed to send'); } finally { setIsSending(false); }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    if (!isTyping) {
      setIsTyping(true);
      broadcastTyping(true);
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      broadcastTyping(false);
    }, 2000);
  };

  const broadcastTyping = (typing: boolean) => {
    if (!selectedConversation) return;
    supabase.channel(`typing:${selectedConversation.other_user_id}`).send({
      type: 'broadcast',
      event: 'typing',
      payload: { senderId: currentUser.id, isTyping: typing }
    });
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString(locale === 'ar' ? 'ar-SA' : 'en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const getAvatarUrl = (avatar?: string | null) => {
    if (!avatar) return '/default-avatar.png';
    if (avatar.startsWith('data:') || avatar.startsWith('http')) return avatar;
    return `https://neon-image-bucket.s3.us-east-1.amazonaws.com/${avatar}`;
  };

  return (
    <div className="flex h-full bg-[#f0f2f5] overflow-hidden relative" dir={isRtl ? 'rtl' : 'ltr'}>
      <CallOverlay callStatus={callStatus} otherUser={callOtherUser} onAccept={() => {}} onReject={() => {}} onEnd={() => {}} />
      
      {/* Sidebar */}
      <div className={`${selectedConversation ? 'hidden md:flex' : 'flex'} w-full md:w-[350px] lg:w-[400px] flex-col bg-white border-x border-gray-200 h-full`}>
        <div className="bg-[#f0f2f5] px-4 py-3 flex items-center justify-between border-b border-gray-200">
          <button onClick={() => router.push(`/${locale}/community`)} className="p-2 hover:bg-gray-200 rounded-full md:hidden">
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <h2 className="text-xl font-black text-gray-900">{t('title')}</h2>
          <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center shadow-lg">
             <UserIcon className="w-6 h-6 text-white" />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {conversations.map((conv) => (
            <button key={conv.other_user_id} onClick={() => setSelectedConversation(conv)} className={`w-full px-4 py-4 flex items-center gap-4 hover:bg-[#f5f6f6] border-b border-gray-100 transition-colors ${selectedConversation?.other_user_id === conv.other_user_id ? 'bg-[#f5f6f6]' : ''}`}>
              <div className="relative">
                <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-200 shadow-sm">
                  <Image src={getAvatarUrl(conv.avatar)} alt={conv.name} width={56} height={56} className="object-cover" unoptimized />
                </div>
                {conv.is_online && <div className="absolute bottom-1 right-1 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex justify-between items-baseline">
                  <h3 className="font-black text-gray-900 truncate">{conv.name}</h3>
                  <span className="text-[10px] font-bold text-gray-500">{conv.last_message_time ? formatTime(conv.last_message_time) : ''}</span>
                </div>
                <p className="text-sm text-gray-600 truncate font-bold">{conv.last_message || t('noMessages')}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
      
      {/* Chat Area */}
      <div className={`${!selectedConversation ? 'hidden md:flex' : 'flex'} flex-1 flex-col bg-[#efeae2] h-full relative`}>
        {selectedConversation ? (
          <>
            <div className="bg-[#f0f2f5] px-4 py-3 flex items-center gap-4 border-b border-gray-200 z-30 shadow-sm">
              <button onClick={() => setSelectedConversation(null)} className="md:hidden p-2 hover:bg-gray-200 rounded-full">
                <ArrowLeft className="w-6 h-6 text-gray-600" />
              </button>
              <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 shadow-sm">
                <Image src={getAvatarUrl(selectedConversation.avatar)} alt={selectedConversation.name} width={48} height={48} className="object-cover" unoptimized />
              </div>
              <div className="flex-1 text-left">
                <h3 className="font-black text-gray-900 text-lg">{selectedConversation.name}</h3>
                <p className={`text-xs font-black ${otherUserOnline ? 'text-green-600' : 'text-gray-500'}`}>
                  {otherUserTyping ? (locale === 'ar' ? 'جاري الكتابة...' : 'typing...') : (otherUserOnline ? t('online') : (otherUserLastSeen ? `${t('lastSeen')} ${formatTime(otherUserLastSeen)}` : ''))}
                </p>
              </div>
              <Phone className="w-6 h-6 text-gray-600 cursor-pointer hover:text-purple-600 transition-colors" />
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4 relative z-10 bg-[url('/chat-bg.png')] bg-repeat">
              {messages.map((msg) => {
                const isOwn = msg.sender_id === currentUser.id;
                return (
                  <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    <div className={`relative max-w-[80%] px-4 py-2 rounded-2xl shadow-md ${isOwn ? 'bg-[#dcf8c6] rounded-tr-none' : 'bg-white rounded-tl-none'}`}>
                      <p className="text-[16px] text-gray-900 font-black leading-relaxed">{msg.content}</p>
                      <div className="flex items-center justify-end gap-1 mt-1">
                        <span className="text-[9px] text-gray-500 font-black">{formatTime(msg.created_at)}</span>
                        {isOwn && (msg.is_read ? <CheckCheck className="w-3 h-3 text-blue-500" /> : <Check className="w-3 h-3 text-gray-400" />)}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
            
            <div className="bg-[#f0f2f5] p-4 flex items-center gap-3 z-30">
              <Smile className="w-7 h-7 text-gray-600 cursor-pointer" />
              <Paperclip className="w-7 h-7 text-gray-600 cursor-pointer" />
              <form onSubmit={handleSendMessage} className="flex-1">
                <input type="text" value={newMessage} onChange={handleTyping} placeholder={t('typeMessage')} className="w-full px-6 py-3 rounded-full bg-white text-gray-900 font-black focus:outline-none shadow-inner" />
              </form>
              <button onClick={handleSendMessage} className="p-4 bg-green-500 text-white rounded-full hover:bg-green-600 shadow-lg transform active:scale-95 transition-all">
                <Send className="w-6 h-6" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-10 text-center">
            <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mb-8 shadow-xl">
              <MessageCircle className="w-16 h-16 text-purple-600" />
            </div>
            <h2 className="text-3xl font-black text-gray-900 mb-4">WhatsApp Real-time</h2>
            <p className="max-w-md font-bold text-lg text-gray-600">Select a contact to start a secure, real-time conversation. Powered by Supabase.</p>
          </div>
        )}
      </div>
    </div>
  );
}
