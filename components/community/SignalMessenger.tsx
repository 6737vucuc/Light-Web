import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send, ArrowLeft, MoreVertical, Phone, Video,
  Search, Smile, Paperclip, Mic, Check, CheckCheck,
  MessageSquare, Loader2, Shield, Lock, Ghost,
  Camera, RefreshCw, UserX, Wifi, WifiOff, Volume2, VolumeX
} from 'lucide-react';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
import { useToast } from '@/lib/contexts/ToastContext';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabase/client';

// PeerJS will be imported dynamically to avoid SSR issues
let Peer: any;

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
  
  // Try to get translations safely
  const t = useTranslations('messages');
  const toast = useToast();

  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [otherUserOnline, setOtherUserOnline] = useState(false);
  const [otherUserLastSeen, setOtherUserLastSeen] = useState<string | null>(null);
  
  // Connection States
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'incoming' | 'connected' | 'ended'>('idle');
  const [peerId, setPeerId] = useState<string | null>(null);
  const [isPeerReady, setIsPeerReady] = useState(false);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const peerRef = useRef<any>(null);
  const channelRef = useRef<any>(null);
  const messageIds = useRef<Set<string>>(new Set());

  // Load Messages from Supabase
  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('direct_messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${conversationId}),and(sender_id.eq.${conversationId},receiver_id.eq.${currentUser.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (data) {
        setMessages(data);
        data.forEach(msg => messageIds.current.add(msg.id));
        scrollToBottom();
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  }, [currentUser.id]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.other_user_id);
    }
  }, [selectedConversation, loadMessages]);

  // Initialize PeerJS
  const initializePeerConnection = useCallback(async () => {
    if (typeof window === 'undefined' || !currentUser?.id) return null;
    try {
      if (!Peer) {
        const module = await import('peerjs');
        Peer = module.default;
      }
      if (peerRef.current && !peerRef.current.destroyed) peerRef.current.destroy();

      const peerIdToUse = `signal-${currentUser.id}`;
      const peer = new Peer(peerIdToUse, {
        host: '0.peerjs.com',
        port: 443,
        path: '/',
        secure: true,
        debug: 1
      });

      peer.on('open', (id: string) => {
        setPeerId(id);
        peerRef.current = peer;
        setIsPeerReady(true);
      });

      peer.on('error', () => setIsPeerReady(false));
      peer.on('disconnected', () => setIsPeerReady(false));
      return peer;
    } catch (error) {
      setIsPeerReady(false);
      return null;
    }
  }, [currentUser?.id]);

  useEffect(() => {
    initializePeerConnection();
    return () => { if (peerRef.current) peerRef.current.destroy(); };
  }, [initializePeerConnection]);

  // Load Conversations
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const res = await fetch('/api/direct-messages');
        if (res.ok) {
          const data = await res.json();
          setConversations(data.conversations || []);
          setIsLoading(false);
        }
      } catch (error) { setIsLoading(false); }
    };
    fetchConversations();
  }, []);

  // Real-time
  useEffect(() => {
    if (!selectedConversation || !currentUser?.id) return;

    const channel = supabase.channel(`chat-${selectedConversation.other_user_id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'direct_messages',
        filter: `sender_id=eq.${selectedConversation.other_user_id}` 
      }, payload => {
        if (!messageIds.current.has(payload.new.id)) {
          messageIds.current.add(payload.new.id);
          setMessages(prev => [...prev, payload.new]);
          scrollToBottom();
        }
      })
      .subscribe(status => {
        setIsSupabaseConnected(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, [selectedConversation, currentUser.id]);

  const scrollToBottom = () => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    setIsSending(true);

    try {
      const { data, error } = await supabase
        .from('direct_messages')
        .insert({
          sender_id: currentUser.id,
          receiver_id: selectedConversation.other_user_id,
          content: messageContent,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        messageIds.current.add(data.id);
        setMessages(prev => [...prev, data]);
        scrollToBottom();
      }
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const getAvatarUrl = (avatar?: string | null) => {
    if (!avatar) return '/default-avatar.png';
    if (avatar.startsWith('data:') || avatar.startsWith('http')) return avatar;
    return `https://neon-image-bucket.s3.us-east-1.amazonaws.com/${avatar}`;
  };

  return (
    <div className="flex h-full bg-white overflow-hidden font-sans text-[#1b1b1b]">
      {/* Sidebar */}
      <div className={`w-full md:w-[350px] flex-shrink-0 border-r border-gray-100 flex flex-col ${selectedConversation && 'hidden md:flex'}`}>
        <div className="p-4 border-b border-gray-50 flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight text-blue-600">Signal</h1>
        </div>

        <div className="px-4 py-2">
          <div className={`flex items-center gap-2 text-[12px] px-3 py-1.5 rounded-full ${isSupabaseConnected ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
            <div className={`w-2 h-2 rounded-full ${isSupabaseConnected ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`} />
            {isSupabaseConnected ? t('callReady') : t('connecting')}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.map((conv) => (
            <button key={conv.other_user_id} onClick={() => setSelectedConversation(conv)} className={`w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors ${selectedConversation?.other_user_id === conv.other_user_id ? 'bg-blue-50' : ''}`}>
              <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-gray-100">
                <Image src={getAvatarUrl(conv.avatar)} alt={conv.name} width={48} height={48} className="object-cover" unoptimized />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <h3 className="font-bold text-[15px] truncate">{conv.name}</h3>
                <p className="text-sm text-gray-500 truncate">{conv.last_message || 'Start chatting'}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat */}
      <div className={`flex-1 flex flex-col bg-white ${!selectedConversation && 'hidden md:flex'}`}>
        {selectedConversation ? (
          <>
            <div className="h-16 border-b border-gray-100 flex items-center justify-between px-4 flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <button onClick={() => setSelectedConversation(null)} className="md:hidden p-2 hover:bg-gray-100 rounded-full"><ArrowLeft size={20} /></button>
                <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100">
                  <Image src={getAvatarUrl(selectedConversation.avatar)} alt={selectedConversation.name} width={40} height={40} className="object-cover" unoptimized />
                </div>
                <div>
                  <h2 className="font-bold text-[15px] truncate">{selectedConversation.name}</h2>
                  <p className="text-[10px] text-green-600 font-medium">{t('online')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button disabled={!isPeerReady} className="p-2 text-gray-400 hover:text-blue-600 disabled:opacity-30"><Phone size={20} /></button>
                <button disabled={!isPeerReady} className="p-2 text-gray-400 hover:text-blue-600 disabled:opacity-30"><Video size={20} /></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#fcfcfc]">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender_id === currentUser.id ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] px-4 py-2 rounded-2xl text-[15px] ${msg.sender_id === currentUser.id ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-gray-100 text-gray-800 rounded-bl-none'}`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={sendMessage} className="p-4 border-t border-gray-100 flex items-center gap-2">
              <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder={t('typeMessage')} className="flex-1 bg-gray-100 border-none rounded-full px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none text-[15px]" />
              <button type="submit" disabled={!newMessage.trim() || isSending} className="p-2 bg-blue-600 text-white rounded-full disabled:opacity-50 hover:bg-blue-700 transition-colors"><Send size={20} /></button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-300">
            <MessageSquare size={64} className="opacity-20 mb-4" />
            <p>Select a contact to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
}
