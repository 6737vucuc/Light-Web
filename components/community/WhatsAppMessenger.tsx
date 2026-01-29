'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Image as ImageIcon, ArrowLeft, MoreVertical, Phone, Search, Smile, Paperclip, Mic, X, Check, CheckCheck, Trash2, User as UserIcon } from 'lucide-react';
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
}

export default function WhatsAppMessenger({ currentUser, initialUserId, fullPage = false }: WhatsAppMessengerProps) {
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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<number | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  
  // Call States
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'incoming' | 'connected' | 'ended'>('idle');
  const [callOtherUser, setCallOtherUser] = useState({ name: '', avatar: '' as string | null });
  const [peerId, setPeerId] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const headerMenuRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const peerRef = useRef<Peer | null>(null);
  const currentCallRef = useRef<any>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize PeerJS
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const myId = `light-${currentUser.id}-${Math.floor(Math.random() * 10000)}`;
    const peer = new Peer(myId, { host: '0.peerjs.com', port: 443, secure: true });
    peer.on('open', (id) => { setPeerId(id); peerRef.current = peer; });
    peer.on('call', (call) => { currentCallRef.current = call; });
    return () => { if (peer) peer.destroy(); };
  }, [currentUser.id]);

  // Real-time Subscriptions with Supabase
  useEffect(() => {
    loadConversations();
    
    // Subscribe to messages
    const messageSub = supabase
      .channel('public:direct_messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' }, (payload) => {
        const newMsg = payload.new;
        if ((newMsg.sender_id === currentUser.id || newMsg.receiver_id === currentUser.id) &&
            (selectedConversation && (newMsg.sender_id === selectedConversation.other_user_id || newMsg.receiver_id === selectedConversation.other_user_id))) {
          setMessages(prev => [...prev, newMsg]);
          scrollToBottom();
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'direct_messages' }, (payload) => {
        const updatedMsg = payload.new;
        setMessages(prev => prev.map(m => m.id === updatedMsg.id ? updatedMsg : m));
      })
      .subscribe();

    // Subscribe to calls
    const callSub = supabase
      .channel('public:calls')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'calls' }, (payload) => {
        const newCall = payload.new;
        if (newCall.receiver_id === currentUser.id && newCall.status === 'ringing') {
          setCallStatus('incoming');
          currentCallRef.current = { peerId: newCall.caller_peer_id, callId: newCall.id };
          // Fetch caller info if needed or use basic info
          setCallOtherUser({ name: t('incomingCall'), avatar: null });
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'calls' }, (payload) => {
        const updatedCall = payload.new;
        if (updatedCall.status === 'rejected' || updatedCall.status === 'ended') {
          cleanupCall();
          setCallStatus('ended');
          setTimeout(() => setCallStatus('idle'), 2000);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(messageSub);
      supabase.removeChannel(callSub);
    };
  }, [currentUser.id, selectedConversation]);

  const cleanupCall = () => {
    if (currentCallRef.current?.close) currentCallRef.current.close();
    if (localStreamRef.current) localStreamRef.current.getTracks().forEach(track => track.stop());
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    localStreamRef.current = null;
  };

  const loadConversations = async () => {
    try {
      const response = await fetch('/api/messages/conversations');
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      }
    } catch (error) { console.error(error); } finally { setIsLoading(false); }
  };

  const loadMessages = async (otherUserId: number) => {
    try {
      const { data, error } = await supabase
        .from('direct_messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUser.id})`)
        .order('created_at', { ascending: true });
      if (data) setMessages(data);
    } catch (error) { console.error(error); }
  };

  useEffect(() => {
    if (selectedConversation) loadMessages(selectedConversation.other_user_id);
  }, [selectedConversation]);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  const sendMessage = async () => {
    const content = newMessage.trim();
    if (!content || !selectedConversation || isSending) return;
    setIsSending(true);
    try {
      const { error } = await supabase.from('direct_messages').insert({
        sender_id: currentUser.id,
        receiver_id: selectedConversation.other_user_id,
        content: content,
        message_type: 'text'
      });
      if (!error) setNewMessage('');
    } catch (error) { toast.error(t('error')); } finally { setIsSending(false); }
  };

  const deleteForEveryone = async (messageId: number) => {
    const confirmed = await toast.confirm({
      title: t('deleteMessage'),
      message: t('deleteMessageConfirm'),
      confirmText: t('deleteForEveryone'),
      cancelText: t('cancel'),
      type: 'danger'
    });
    if (confirmed) {
      const { error } = await supabase
        .from('direct_messages')
        .update({ is_deleted: true, content: t('messageDeleted'), deleted_at: new Date() })
        .eq('id', messageId)
        .eq('sender_id', currentUser.id);
      if (!error) {
        toast.success(t('deleteSuccess'));
        setSelectedMessageId(null);
      }
    }
  };

  const startCall = async () => {
    if (!selectedConversation || !peerId) return toast.error(t('callFailed'));
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      setCallStatus('calling');
      setCallOtherUser({ name: selectedConversation.other_user_name, avatar: selectedConversation.other_user_avatar });
      await supabase.from('calls').insert({
        caller_id: currentUser.id,
        receiver_id: selectedConversation.other_user_id,
        caller_peer_id: peerId,
        status: 'ringing'
      });
    } catch (err) { toast.error(t('callFailed')); setCallStatus('idle'); }
  };

  const acceptCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      setCallStatus('connected');
      const targetPeerId = currentCallRef.current?.peerId;
      if (peerRef.current && targetPeerId) {
        const call = peerRef.current.call(targetPeerId, stream);
        currentCallRef.current = call;
        setupCallEvents(call);
      }
    } catch (err) { rejectCall(); }
  };

  const rejectCall = async () => {
    if (currentCallRef.current?.callId) {
      await supabase.from('calls').update({ status: 'rejected' }).eq('id', currentCallRef.current.callId);
    }
    cleanupCall();
    setCallStatus('idle');
  };

  const endCall = async () => {
    if (currentCallRef.current?.callId) {
      await supabase.from('calls').update({ status: 'ended' }).eq('id', currentCallRef.current.callId);
    }
    cleanupCall();
    setCallStatus('ended');
    setTimeout(() => setCallStatus('idle'), 2000);
  };

  const setupCallEvents = (call: any) => {
    call.on('stream', (remoteStream: MediaStream) => {
      if (!remoteAudioRef.current) { remoteAudioRef.current = document.createElement('audio'); remoteAudioRef.current.autoplay = true; }
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.play().catch(() => {});
    });
    call.on('close', () => { cleanupCall(); setCallStatus('ended'); setTimeout(() => setCallStatus('idle'), 2000); });
  };

  const formatTime = (date: string) => new Date(date).toLocaleTimeString(locale === 'ar' ? 'ar-SA' : 'en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  return (
    <div className="flex h-full bg-[#f0f2f5] overflow-hidden relative" dir={isRtl ? 'rtl' : 'ltr'}>
      <CallOverlay callStatus={callStatus} otherUser={callOtherUser} onAccept={acceptCall} onReject={rejectCall} onEnd={endCall} />
      <div className={`${selectedConversation ? 'hidden md:flex' : 'flex'} w-full md:w-[350px] lg:w-[400px] flex-col bg-white border-x border-gray-200 h-full`}>
        <div className="bg-[#f0f2f5] px-4 py-[10px] flex items-center justify-between border-b border-gray-200 min-h-[59px]">
          <button onClick={() => router.push(`/${locale}/community`)} className="p-2 hover:bg-gray-200 rounded-full md:hidden"><ArrowLeft className="w-6 h-6 text-gray-600" /></button>
          <h2 className="text-xl font-semibold text-gray-900">{t('title')}</h2>
          <button className="p-2 hover:bg-gray-200 rounded-full transition-colors"><MoreVertical className="w-5 h-5 text-gray-600" /></button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.map((conv) => (
            <button key={conv.id} onClick={() => setSelectedConversation(conv)} className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-[#f5f6f6] border-b border-gray-100 ${selectedConversation?.id === conv.id ? 'bg-[#f5f6f6]' : ''}`}>
              <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200"><Image src={conv.other_user_avatar || '/default-avatar.png'} alt={conv.other_user_name} width={48} height={48} className="object-cover" unoptimized /></div>
              <div className={`flex-1 min-w-0 ${isRtl ? 'text-right' : 'text-left'}`}>
                <div className="flex items-center justify-between mb-1"><span className="text-[11px] text-gray-500">{formatTime(conv.last_message_at || conv.created_at)}</span><h3 className="font-semibold text-gray-900 truncate">{conv.other_user_name}</h3></div>
                <p className="text-sm text-gray-600 truncate">{conv.last_message || t('noMessages')}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
      <div className={`${!selectedConversation ? 'hidden md:flex' : 'flex'} flex-1 flex-col bg-[#efeae2] h-full relative overflow-hidden`}>
        {selectedConversation ? (
          <>
            <div className="bg-[#f0f2f5] px-4 py-2 flex items-center gap-3 border-b border-gray-200 z-30 min-h-[59px]">
              <button onClick={() => setSelectedConversation(null)} className="p-2 hover:bg-gray-200 rounded-full md:hidden"><ArrowLeft className="w-6 h-6 text-gray-600" /></button>
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200"><Image src={selectedConversation.other_user_avatar || '/default-avatar.png'} alt={selectedConversation.other_user_name} width={40} height={40} className="object-cover" unoptimized /></div>
              <div className={`flex-1 min-w-0 ${isRtl ? 'text-right' : 'text-left'}`}><h3 className="font-semibold text-gray-900 truncate">{selectedConversation.other_user_name}</h3><p className="text-xs text-green-600 font-medium">{t('online')}</p></div>
              <div className="flex items-center gap-4 text-gray-600"><button onClick={startCall} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><Phone className="w-5 h-5" /></button></div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2 relative z-10">
              {messages.map((msg) => {
                const isOwn = msg.sender_id === currentUser.id;
                const isDeleted = msg.is_deleted;
                return (
                  <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    <div onClick={() => isOwn && !isDeleted && setSelectedMessageId(selectedMessageId === msg.id ? null : msg.id)} className={`relative max-w-[70%] px-3 py-1.5 rounded-lg shadow-sm cursor-pointer ${isOwn ? 'bg-[#dcf8c6] rounded-tr-none' : 'bg-white rounded-tl-none'}`}>
                      <p className={`text-[15px] leading-relaxed text-gray-800 ${isDeleted ? 'italic text-gray-500' : ''}`}>{isDeleted ? t('messageDeleted') : msg.content}</p>
                      <div className="flex items-center gap-1 mt-1 self-end"><span className="text-[10px] text-gray-500 uppercase">{formatTime(msg.created_at)}</span>{isOwn && (msg.is_read ? <CheckCheck className="w-3 h-3 text-blue-500" /> : <Check className="w-3 h-3 text-gray-400" />)}</div>
                      {selectedMessageId === msg.id && isOwn && !isDeleted && (
                        <div className={`absolute ${isRtl ? 'right-0' : 'left-0'} top-full mt-1 z-50 bg-white rounded shadow-xl border border-gray-100 py-1 min-w-[140px]`}>
                          <button onClick={(e) => { e.stopPropagation(); deleteForEveryone(msg.id); }} className={`w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 ${isRtl ? 'justify-end text-right' : 'justify-start text-left'}`}><Trash2 className="w-4 h-4" /> {t('deleteForEveryone')}</button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
            <div className="bg-[#f0f2f5] p-2 flex items-center gap-2 z-30">
              <input type="text" placeholder={t('typeMessage')} value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMessage()} className="flex-1 px-4 py-2.5 bg-white rounded-lg focus:outline-none text-gray-900" />
              <button onClick={sendMessage} disabled={isSending} className="p-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-full disabled:opacity-50"><Send className={`w-5 h-5 ${isRtl ? 'rotate-180' : ''}`} /></button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 bg-[#f8f9fa]"><Send className="w-10 h-10 text-gray-400 mb-4" /><h2 className="text-xl font-medium mb-2">{t('chat')}</h2><p className="text-sm">{t('noConversations')}</p></div>
        )}
      </div>
    </div>
  );
}
