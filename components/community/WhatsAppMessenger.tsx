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
  const [replyingTo, setReplyingTo] = useState<any>(null);
  
  // Call States
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'incoming' | 'connected' | 'ended'>('idle');
  const [callOtherUser, setCallOtherUser] = useState({ name: '', avatar: '' as string | null });
  const [peerId, setPeerId] = useState<string | null>(null);
  const [currentCallId, setCurrentCallId] = useState<number | null>(null);
  
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
    if (typeof window === 'undefined' || !currentUser?.id) return;
    
    const myId = `light-user-${currentUser.id}-${Date.now()}`;
    
    try {
      const peer = new Peer(myId, { 
        host: '0.peerjs.com', 
        port: 443, 
        secure: true,
        debug: 1
      });
      
      peer.on('open', (id) => { 
        console.log('PeerJS connected with ID:', id);
        setPeerId(id); 
        peerRef.current = peer; 
      });
      
      peer.on('call', async (call) => { 
        console.log('Incoming call from:', call.peer);
        currentCallRef.current = call;
        
        // Get caller info from peer ID
        const callerIdMatch = call.peer.match(/light-user-(\d+)/);
        if (callerIdMatch) {
          const callerId = parseInt(callerIdMatch[1]);
          // Fetch caller info
          const { data: callerData } = await supabase
            .from('users')
            .select('name, avatar')
            .eq('id', callerId)
            .single();
          
          if (callerData) {
            setCallOtherUser({ name: callerData.name, avatar: callerData.avatar });
          }
        }
        
        setCallStatus('incoming');
      });
      
      peer.on('error', (err) => {
        console.error('PeerJS error:', err);
      });
      
      return () => { 
        if (peer) peer.destroy(); 
      };
    } catch (error) {
      console.error('PeerJS initialization error:', error);
    }
  }, [currentUser?.id]);

  // Real-time Subscriptions with Supabase
  useEffect(() => {
    loadConversations();
    
    // Subscribe to messages
    const messageSub = supabase
      .channel('direct_messages_channel')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'direct_messages' 
      }, (payload) => {
        const newMsg = payload.new;
        if ((newMsg.sender_id === currentUser.id || newMsg.receiver_id === currentUser.id) &&
            (selectedConversation && (newMsg.sender_id === selectedConversation.other_user_id || newMsg.receiver_id === selectedConversation.other_user_id))) {
          setMessages(prev => [...prev, newMsg]);
          scrollToBottom();
        }
        // Refresh conversations list
        loadConversations();
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'direct_messages' 
      }, (payload) => {
        const updatedMsg = payload.new;
        setMessages(prev => prev.map(m => m.id === updatedMsg.id ? updatedMsg : m));
      })
      .subscribe();

    // Subscribe to calls
    const callSub = supabase
      .channel('calls_channel')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'calls',
        filter: `receiver_id=eq.${currentUser.id}`
      }, async (payload) => {
        const newCall = payload.new;
        if (newCall.status === 'ringing') {
          console.log('Incoming call:', newCall);
          setCurrentCallId(newCall.id);
          setCallStatus('incoming');
          
          // Fetch caller info
          const { data: callerData } = await supabase
            .from('users')
            .select('name, avatar')
            .eq('id', newCall.caller_id)
            .single();
          
          if (callerData) {
            setCallOtherUser({ name: callerData.name, avatar: callerData.avatar });
          }
          
          currentCallRef.current = { 
            peerId: newCall.caller_peer_id, 
            callId: newCall.id 
          };
        }
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'calls' 
      }, (payload) => {
        const updatedCall = payload.new;
        if (updatedCall.id === currentCallId) {
          if (updatedCall.status === 'rejected' || updatedCall.status === 'ended') {
            cleanupCall();
            setCallStatus('ended');
            setTimeout(() => setCallStatus('idle'), 2000);
          } else if (updatedCall.status === 'connected') {
            setCallStatus('connected');
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(messageSub);
      supabase.removeChannel(callSub);
    };
  }, [currentUser?.id, selectedConversation, currentCallId]);

  const cleanupCall = () => {
    if (currentCallRef.current?.close) currentCallRef.current.close();
    if (localStreamRef.current) localStreamRef.current.getTracks().forEach(track => track.stop());
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    localStreamRef.current = null;
    setCurrentCallId(null);
  };

  const loadConversations = async () => {
    try {
      const response = await fetch('/api/direct-messages');
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      }
    } catch (error) { 
      console.error('Error loading conversations:', error); 
    } finally { 
      setIsLoading(false); 
    }
  };

  const loadMessages = async (otherUserId: number) => {
    try {
      const response = await fetch(`/api/direct-messages/${otherUserId}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
        scrollToBottom();
      }
    } catch (error) { 
      console.error('Error loading messages:', error); 
    }
  };

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.other_user_id);
    }
  }, [selectedConversation]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const sendMessage = async () => {
    const content = newMessage.trim();
    if (!content || !selectedConversation || isSending) return;
    
    setIsSending(true);
    try {
      const response = await fetch('/api/direct-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId: selectedConversation.other_user_id,
          content: content,
          messageType: 'text',
          replyToId: replyingTo?.id
        })
      });
      
      if (response.ok) {
        setNewMessage('');
        setReplyingTo(null);
        loadMessages(selectedConversation.other_user_id);
      } else {
        toast.error(t('error'));
      }
    } catch (error) { 
      toast.error(t('error')); 
    } finally { 
      setIsSending(false); 
    }
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
      try {
        const response = await fetch(`/api/direct-messages/${selectedConversation.other_user_id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messageId })
        });
        
        if (response.ok) {
          setMessages(prev => prev.map(m => 
            m.id === messageId 
              ? { ...m, is_deleted: true, content: t('messageDeleted') }
              : m
          ));
          setSelectedMessageId(null);
        }
      } catch (error) {
        toast.error(t('error'));
      }
    }
  };

  const startCall = async () => {
    if (!selectedConversation || !peerId) {
      toast.error(t('callFailed'));
      return;
    }
    
    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      
      setCallStatus('calling');
      setCallOtherUser({ 
        name: selectedConversation.name || selectedConversation.other_user_name, 
        avatar: selectedConversation.avatar || selectedConversation.other_user_avatar 
      });
      
      // Create call record via API
      const response = await fetch('/api/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId: selectedConversation.other_user_id,
          callerPeerId: peerId,
          callType: 'audio'
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setCurrentCallId(data.call.id);
        
        // Wait for receiver to answer, then make PeerJS call
        // The actual PeerJS call will be made when receiver accepts
      } else {
        throw new Error('Failed to initiate call');
      }
    } catch (err) { 
      console.error('Call error:', err);
      toast.error(t('callFailed')); 
      setCallStatus('idle');
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
    }
  };

  const acceptCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      
      // Update call status via API
      if (currentCallId) {
        await fetch(`/api/calls/${currentCallId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            status: 'connected',
            receiverPeerId: peerId
          })
        });
      }
      
      setCallStatus('connected');
      
      // Make PeerJS call to caller
      const targetPeerId = currentCallRef.current?.peerId;
      if (peerRef.current && targetPeerId) {
        const call = peerRef.current.call(targetPeerId, stream);
        currentCallRef.current = { ...currentCallRef.current, call };
        setupCallEvents(call);
      }
    } catch (err) { 
      console.error('Accept call error:', err);
      rejectCall(); 
    }
  };

  const rejectCall = async () => {
    if (currentCallId) {
      await fetch(`/api/calls/${currentCallId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected' })
      });
    }
    cleanupCall();
    setCallStatus('idle');
  };

  const endCall = async () => {
    if (currentCallId) {
      await fetch(`/api/calls/${currentCallId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ended' })
      });
    }
    cleanupCall();
    setCallStatus('ended');
    setTimeout(() => setCallStatus('idle'), 2000);
  };

  const setupCallEvents = (call: any) => {
    call.on('stream', (remoteStream: MediaStream) => {
      console.log('Received remote stream');
      if (!remoteAudioRef.current) { 
        remoteAudioRef.current = document.createElement('audio'); 
        remoteAudioRef.current.autoplay = true; 
      }
      remoteAudioRef.current.srcObject = remoteStream;
      remoteAudioRef.current.play().catch(e => console.error('Audio play error:', e));
    });
    
    call.on('close', () => { 
      console.log('Call closed');
      cleanupCall(); 
      setCallStatus('ended'); 
      setTimeout(() => setCallStatus('idle'), 2000); 
    });
    
    call.on('error', (err: any) => {
      console.error('Call error:', err);
      cleanupCall();
      setCallStatus('ended');
      setTimeout(() => setCallStatus('idle'), 2000);
    });
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString(locale === 'ar' ? 'ar-SA' : 'en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    });
  };

  const getAvatarUrl = (avatar?: string | null) => {
    if (!avatar) return '/default-avatar.png';
    if (avatar.startsWith('data:') || avatar.startsWith('http')) return avatar;
    return `https://neon-image-bucket.s3.us-east-1.amazonaws.com/${avatar}`;
  };

  return (
    <div className="flex h-full bg-[#f0f2f5] overflow-hidden relative" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Call Overlay */}
      <CallOverlay 
        callStatus={callStatus} 
        otherUser={callOtherUser} 
        onAccept={acceptCall} 
        onReject={rejectCall} 
        onEnd={endCall} 
      />
      
      {/* Conversations List */}
      <div className={`${selectedConversation ? 'hidden md:flex' : 'flex'} w-full md:w-[350px] lg:w-[400px] flex-col bg-white border-x border-gray-200 h-full`}>
        <div className="bg-[#f0f2f5] px-4 py-[10px] flex items-center justify-between border-b border-gray-200 min-h-[59px]">
          <button onClick={() => router.push(`/${locale}/community`)} className="p-2 hover:bg-gray-200 rounded-full md:hidden">
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <h2 className="text-xl font-semibold text-gray-900">{t('title')}</h2>
          <button className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <MoreVertical className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500">
              <MessageCircle className="w-8 h-8 mb-2" />
              <p className="text-sm">{t('noConversations')}</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <button 
                key={conv.other_user_id} 
                onClick={() => setSelectedConversation(conv)} 
                className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-[#f5f6f6] border-b border-gray-100 transition-colors ${
                  selectedConversation?.other_user_id === conv.other_user_id ? 'bg-[#f5f6f6]' : ''
                }`}
              >
                <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                  <Image 
                    src={getAvatarUrl(conv.avatar)} 
                    alt={conv.name || 'User'} 
                    width={48} 
                    height={48} 
                    className="object-cover" 
                    unoptimized 
                  />
                </div>
                <div className={`flex-1 min-w-0 ${isRtl ? 'text-right' : 'text-left'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-gray-900 truncate">{conv.name}</h3>
                    <span className="text-[11px] text-gray-500">
                      {conv.last_message_time ? formatTime(conv.last_message_time) : ''}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 truncate">{conv.last_message || t('noMessages')}</p>
                </div>
                {conv.unread_count > 0 && (
                  <div className="bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {conv.unread_count}
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </div>
      
      {/* Chat Area */}
      <div className={`${!selectedConversation ? 'hidden md:flex' : 'flex'} flex-1 flex-col bg-[#efeae2] h-full relative overflow-hidden`}>
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="bg-[#f0f2f5] px-4 py-2 flex items-center gap-3 border-b border-gray-200 z-30 min-h-[59px]">
              <button onClick={() => setSelectedConversation(null)} className="p-2 hover:bg-gray-200 rounded-full md:hidden">
                <ArrowLeft className="w-6 h-6 text-gray-600" />
              </button>
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200">
                <Image 
                  src={getAvatarUrl(selectedConversation.avatar)} 
                  alt={selectedConversation.name || 'User'} 
                  width={40} 
                  height={40} 
                  className="object-cover" 
                  unoptimized 
                />
              </div>
              <div className={`flex-1 min-w-0 ${isRtl ? 'text-right' : 'text-left'}`}>
                <h3 className="font-semibold text-gray-900 truncate">{selectedConversation.name}</h3>
                <p className="text-xs text-green-600 font-medium">{t('online')}</p>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <button 
                  onClick={startCall} 
                  className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                  title={t('voiceCall')}
                >
                  <Phone className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 relative z-10">
              {messages.map((msg) => {
                const isOwn = msg.sender_id === currentUser.id;
                const isDeleted = msg.is_deleted;
                
                return (
                  <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                    <div 
                      onClick={() => isOwn && !isDeleted && setSelectedMessageId(selectedMessageId === msg.id ? null : msg.id)} 
                      className={`relative max-w-[70%] px-3 py-1.5 rounded-lg shadow-sm cursor-pointer ${
                        isOwn ? 'bg-[#dcf8c6] rounded-tr-none' : 'bg-white rounded-tl-none'
                      }`}
                    >
                      {/* Reply Preview */}
                      {msg.reply_to && (
                        <div className="mb-1 p-2 bg-gray-100/80 border-l-4 border-purple-400 rounded text-xs">
                          <span className="font-bold text-purple-600">{msg.reply_to.sender_name}</span>
                          <p className="text-gray-600 truncate">{msg.reply_to.content}</p>
                        </div>
                      )}
                      
                      <p className={`text-[15px] leading-relaxed text-gray-800 ${isDeleted ? 'italic text-gray-500' : ''}`}>
                        {isDeleted ? t('messageDeleted') : msg.content}
                      </p>
                      
                      <div className="flex items-center gap-1 mt-1 justify-end">
                        <span className="text-[10px] text-gray-500">{formatTime(msg.created_at)}</span>
                        {isOwn && (
                          msg.is_read 
                            ? <CheckCheck className="w-3 h-3 text-blue-500" /> 
                            : <Check className="w-3 h-3 text-gray-400" />
                        )}
                      </div>
                      
                      {/* Message Actions */}
                      {selectedMessageId === msg.id && isOwn && !isDeleted && (
                        <div className={`absolute ${isRtl ? 'right-0' : 'left-0'} top-full mt-1 z-50 bg-white rounded-lg shadow-xl border border-gray-100 py-1 min-w-[160px]`}>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setReplyingTo(msg); setSelectedMessageId(null); }}
                            className={`w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 ${isRtl ? 'justify-end text-right' : 'justify-start text-left'}`}
                          >
                            <MessageCircle className="w-4 h-4" /> {t('reply')}
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); deleteForEveryone(msg.id); }} 
                            className={`w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 ${isRtl ? 'justify-end text-right' : 'justify-start text-left'}`}
                          >
                            <Trash2 className="w-4 h-4" /> {t('deleteForEveryone')}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
            
            {/* Reply Bar */}
            {replyingTo && (
              <div className="bg-white border-t border-gray-200 px-4 py-2 flex items-center gap-2">
                <div className="flex-1 p-2 bg-gray-100 rounded border-l-4 border-purple-500">
                  <p className="text-xs font-bold text-purple-600">{t('replyingTo')}</p>
                  <p className="text-sm text-gray-600 truncate">{replyingTo.content}</p>
                </div>
                <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-gray-200 rounded">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            )}
            
            {/* Input Area */}
            <div className="bg-[#f0f2f5] p-2 flex items-center gap-2 z-30">
              <input 
                type="text" 
                placeholder={t('typeMessage')} 
                value={newMessage} 
                onChange={(e) => setNewMessage(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()} 
                className="flex-1 px-4 py-2.5 bg-white rounded-lg focus:outline-none text-gray-900" 
              />
              <button 
                onClick={sendMessage} 
                disabled={isSending || !newMessage.trim()} 
                className="p-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-full disabled:opacity-50 transition-colors"
              >
                <Send className={`w-5 h-5 ${isRtl ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500 bg-[#f8f9fa]">
            <Send className="w-10 h-10 text-gray-400 mb-4" />
            <h2 className="text-xl font-medium mb-2">{t('chat')}</h2>
            <p className="text-sm">{t('selectConversation')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
