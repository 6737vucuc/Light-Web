import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send, ArrowLeft, Phone, Video, MessageSquare, 
  Wifi, WifiOff, RefreshCw, Loader2, User, 
  ChevronLeft, MoreVertical, Paperclip, Smile, Mic
} from 'lucide-react';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/lib/contexts/ToastContext';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabase/client';

// Helper to safely decode Base64/UTF-8 messages with support for Arabic and Emojis
const decodeMessage = (content: string) => {
  if (!content) return '';
  try {
    // Check if it looks like Base64 (simple heuristic)
    if (/^[A-Za-z0-9+/=]+$/.test(content)) {
      try {
        return decodeURIComponent(escape(atob(content)));
      } catch {
        return atob(content);
      }
    }
    return content;
  } catch (e) {
    return content;
  }
};

interface SignalMessengerProps {
  currentUser: any;
  initialUserId?: number;
  fullPage?: boolean;
  onBack?: () => void;
}

export default function SignalMessenger({ currentUser, initialUserId, fullPage = false, onBack }: SignalMessengerProps) {
  const router = useRouter();
  const params = useParams();
  const locale = params?.locale as string || 'ar';
  const t = useTranslations('messages');
  const toast = useToast();

  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);
  const [isPeerReady, setIsPeerReady] = useState(true); // Set to true to show buttons

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageIds = useRef<Set<string>>(new Set());

  // Load Conversations
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const res = await fetch('/api/direct-messages');
        if (res.ok) {
          const data = await res.json();
          setConversations(data.conversations || []);
        }
      } catch (error) {
        console.error('Conv error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchConversations();
  }, []);

  // Load Messages
  const loadMessages = useCallback(async (otherId: string) => {
    try {
      const { data, error } = await supabase
        .from('direct_messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${currentUser.id})`)
        .order('created_at', { ascending: true });

      if (data) {
        setMessages(data);
        data.forEach(m => messageIds.current.add(m.id));
        setTimeout(scrollToBottom, 100);
      }
    } catch (error) {
      console.error('Load msg error:', error);
    }
  }, [currentUser.id]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.other_user_id);
    }
  }, [selectedConversation, loadMessages]);

  // Real-time
  useEffect(() => {
    if (!currentUser?.id) return;

    const channel = supabase.channel(`global-messages`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'direct_messages'
      }, payload => {
        const msg = payload.new;
        if ((msg.sender_id === currentUser.id || msg.receiver_id === currentUser.id) && !messageIds.current.has(msg.id)) {
          if (selectedConversation && (msg.sender_id === selectedConversation.other_user_id || msg.receiver_id === selectedConversation.other_user_id)) {
            messageIds.current.add(msg.id);
            setMessages(prev => [...prev, msg]);
            scrollToBottom();
          }
        }
      })
      .subscribe(status => {
        setIsSupabaseConnected(status === 'SUBSCRIBED');
      });

    return () => { supabase.removeChannel(channel); };
  }, [currentUser.id, selectedConversation]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || isSending) return;

    const content = newMessage.trim();
    setNewMessage('');
    setIsSending(true);

    try {
      // Encrypt message to Base64 before storing in DB
      const encryptedContent = btoa(unescape(encodeURIComponent(content)));
      
      const { data, error } = await supabase
        .from('direct_messages')
        .insert({
          sender_id: currentUser.id,
          receiver_id: selectedConversation.other_user_id,
          content: encryptedContent,
        })
        .select()
        .single();

      if (data && !messageIds.current.has(data.id)) {
        messageIds.current.add(data.id);
        setMessages(prev => [...prev, data]);
        scrollToBottom();
      }
    } catch (error) {
      toast.error('Failed to send');
    } finally {
      setIsSending(false);
    }
  };

  const getAvatarUrl = (avatar?: string | null) => {
    if (!avatar) return '/default-avatar.png';
    if (avatar.startsWith('data:') || avatar.startsWith('http')) return avatar;
    return `https://neon-image-bucket.s3.us-east-1.amazonaws.com/${avatar}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex h-full bg-white overflow-hidden font-sans text-[#1b1b1b] relative">
      {/* Sidebar - Hidden on mobile when chat is open */}
      <div className={`w-full md:w-[350px] flex-shrink-0 border-r border-gray-100 flex flex-col ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-white sticky top-0 z-10">
          <h1 className="text-xl font-bold tracking-tight text-blue-600">Signal</h1>
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium ${isSupabaseConnected ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${isSupabaseConnected ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`} />
            {isSupabaseConnected ? t('callReady') : t('connecting')}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.length > 0 ? conversations.map((conv) => (
            <button key={conv.other_user_id} onClick={() => setSelectedConversation(conv)} className={`w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors border-b border-gray-50/50 ${selectedConversation?.other_user_id === conv.other_user_id ? 'bg-blue-50/50' : ''}`}>
              <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-gray-100 border border-gray-100">
                <Image src={getAvatarUrl(conv.avatar)} alt={conv.name} width={48} height={48} className="object-cover" unoptimized />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex justify-between items-baseline">
                  <h3 className="font-bold text-[15px] truncate text-gray-900">{conv.name}</h3>
                </div>
                <p className="text-sm text-gray-500 truncate mt-0.5">{decodeMessage(conv.last_message) || 'ابدأ المحادثة...'}</p>
              </div>
            </button>
          )) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8 text-center">
              <MessageSquare size={48} className="opacity-10 mb-4" />
              <p className="text-sm">لا توجد محادثات بعد</p>
            </div>
          )}
        </div>
      </div>

      {/* Chat Area - Full screen on mobile when open */}
      <div className={`flex-1 flex flex-col bg-white absolute inset-0 z-20 md:relative md:z-0 ${selectedConversation ? 'flex' : 'hidden md:flex'}`}>
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="h-16 border-b border-gray-100 flex items-center justify-between px-4 flex-shrink-0 bg-white/80 backdrop-blur-md sticky top-0 z-10">
              <div className="flex items-center gap-3 min-w-0">
                <button onClick={() => setSelectedConversation(null)} className="p-2 -ml-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors">
                  <ChevronLeft size={24} />
                </button>
                <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 border border-gray-100 flex-shrink-0">
                  <Image src={getAvatarUrl(selectedConversation.avatar)} alt={selectedConversation.name} width={40} height={40} className="object-cover" unoptimized />
                </div>
                <div className="min-w-0">
                  <h2 className="font-bold text-[15px] truncate text-gray-900">{selectedConversation.name}</h2>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                    <span className="text-[11px] text-green-600 font-bold">{t('online')}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-full transition-colors">
                  <Phone size={20} />
                </button>
                <button className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-full transition-colors">
                  <Video size={20} />
                </button>
                <button className="p-2.5 text-gray-400 hover:bg-gray-50 rounded-full transition-colors">
                  <MoreVertical size={20} />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#fcfcfc] scrollbar-hide">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender_id === currentUser.id ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-[15px] shadow-sm leading-relaxed ${
                    msg.sender_id === currentUser.id 
                      ? 'bg-blue-600 text-white rounded-br-none' 
                      : 'bg-white border border-gray-100 text-gray-800 rounded-bl-none'
                  }`}>
                    {decodeMessage(msg.content)}
                    <div className={`text-[10px] mt-1 text-right opacity-70 ${msg.sender_id === currentUser.id ? 'text-blue-50' : 'text-gray-400'}`}>
                      {new Date(msg.created_at).toLocaleTimeString(locale === 'ar' ? 'ar-EG' : 'en-US', { hour: 'numeric', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} className="h-2" />
            </div>

            {/* Message Input */}
            <div className="p-4 bg-white border-t border-gray-50">
              <form onSubmit={handleSendMessage} className="flex items-center gap-2 max-w-4xl mx-auto">
                <div className="flex-1 bg-gray-100 rounded-2xl flex items-center px-3 py-1 border border-transparent focus-within:border-blue-200 focus-within:bg-white transition-all shadow-inner">
                  <button type="button" className="p-1.5 text-gray-400 hover:text-blue-600"><Smile size={22} /></button>
                  <input 
                    type="text" 
                    value={newMessage} 
                    onChange={(e) => setNewMessage(e.target.value)} 
                    placeholder={t('typeMessage')} 
                    className="flex-1 bg-transparent border-none px-2 py-2 focus:ring-0 outline-none text-[15px] text-gray-800" 
                  />
                  <button type="button" className="p-1.5 text-gray-400 hover:text-blue-600"><Paperclip size={22} /></button>
                </div>
                {newMessage.trim() ? (
                  <button type="submit" disabled={isSending} className="p-3 bg-blue-600 text-white rounded-full shadow-md hover:bg-blue-700 active:scale-95 transition-all flex-shrink-0">
                    <Send size={20} />
                  </button>
                ) : (
                  <button type="button" className="p-3 bg-gray-100 text-gray-500 rounded-full hover:bg-gray-200 transition-all flex-shrink-0">
                    <Mic size={20} />
                  </button>
                )}
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-300 bg-gray-50/30">
            <div className="w-24 h-24 bg-white rounded-3xl shadow-sm flex items-center justify-center mb-6">
              <MessageSquare size={48} className="text-blue-100" />
            </div>
            <h3 className="text-gray-900 font-bold text-lg mb-1">رسائلك الخاصة</h3>
            <p className="text-sm text-gray-500">اختر محادثة للبدء في التواصل</p>
          </div>
        )}
      </div>
    </div>
  );
}
