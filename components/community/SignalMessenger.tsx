'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Send, Image as ImageIcon, ArrowLeft, MoreVertical, Phone, Video, 
  Search, Smile, Paperclip, Mic, X, Check, CheckCheck, Trash2, 
  User as UserIcon, MessageCircle, Loader2 
} from 'lucide-react';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabase/client';

let Peer: any;
if (typeof window !== 'undefined') {
  import('peerjs').then(module => { Peer = module.default; });
}

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
  const isRtl = locale === 'ar';
  const t = useTranslations('messages');

  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [otherUserOnline, setOtherUserOnline] = useState(false);
  const [otherUserLastSeen, setOtherUserLastSeen] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Call states
  const [callStatus, setCallStatus] = useState<'idle'|'calling'|'incoming'|'connected'|'ended'>('idle');
  const [callType, setCallType] = useState<'audio'|'video'>('audio');
  const [callOtherUser, setCallOtherUser] = useState({ name: '', avatar: '' as string | null });
  const [peerId, setPeerId] = useState<string | null>(null);
  const peerRef = useRef<any>(null);
  const currentCallRef = useRef<any>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  const loadConversations = useCallback(async (targetUserId?: number) => {
    try {
      const res = await fetch('/api/direct-messages');
      if (res.ok) {
        const data = await res.json();
        const convs = data.conversations || [];
        setConversations(convs);

        if (targetUserId && !selectedConversation) {
          const existingConv = convs.find(c => c.other_user_id === targetUserId);
          if (existingConv) setSelectedConversation(existingConv);
          else {
            try {
              const userRes = await fetch(`/api/users/${targetUserId}`);
              if (userRes.ok) {
                const userData = await userRes.json();
                const tempConv = {
                  other_user_id: targetUserId,
                  name: userData.user.name,
                  avatar: userData.user.avatar,
                  is_online: false,
                  last_message: null,
                  last_message_time: null
                };
                setSelectedConversation(tempConv);
              }
            } catch (err) { console.error(err); }
          }
        }
        setIsLoading(false);
      }
    } catch (err) { console.error(err); }
  }, [selectedConversation]);

  useEffect(() => {
    if (!currentUser?.id) return;
    loadConversations(initialUserId);
  }, [currentUser?.id, initialUserId, loadConversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;
    setIsSending(true);
    try {
      const messageData = {
        content: newMessage,
        conversation_id: selectedConversation.id,
        sender_id: currentUser.id
      };
      const res = await fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(messageData) });
      if (res.ok) {
        const savedMessage = await res.json();
        setMessages(prev => [...prev, savedMessage]);
        setNewMessage('');
      }
    } catch (err) { console.error(err); }
    setIsSending(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSendMessage();
  };

  const startCall = async (type: 'audio' | 'video') => {
    if (!selectedConversation) return;
    setCallType(type);
    setCallStatus('calling');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' });
      localStreamRef.current = stream;
      if (!peerRef.current && Peer) peerRef.current = new Peer();
      const call = peerRef.current.call(selectedConversation.other_user_id, stream);
      currentCallRef.current = call;
      call.on('stream', (remoteStream: MediaStream) => {
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
        if (remoteAudioRef.current) remoteAudioRef.current.srcObject = remoteStream;
      });
    } catch (err) { console.error(err); setCallStatus('ended'); }
  };

  const endCall = () => {
    currentCallRef.current?.close();
    localStreamRef.current?.getTracks().forEach(track => track.stop());
    setCallStatus('ended');
  };

  if (isLoading) return <div className="p-4 text-center"><Loader2 className="animate-spin mx-auto" /></div>;

  return (
    <div className={`flex flex-col h-full ${fullPage ? 'w-full' : 'w-[400px]'}`}>
      {fullPage && onBack && (
        <div className="flex items-center p-2 border-b">
          <button onClick={onBack}><ArrowLeft /></button>
          <h2 className="ml-2 font-semibold">{selectedConversation?.name || t('Messages')}</h2>
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {conversations.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase())).map(conv => (
          <div key={conv.other_user_id} className="flex items-center p-2 border-b cursor-pointer" onClick={() => setSelectedConversation(conv)}>
            <Image src={conv.avatar || '/default-avatar.png'} width={40} height={40} className="rounded-full" alt={conv.name} />
            <div className="ml-3 flex-1">
              <p className="font-semibold">{conv.name}</p>
              <p className="text-sm text-gray-500 truncate">{conv.last_message || t('Start a conversation')}</p>
            </div>
            {conv.unread_count > 0 && <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px]">{conv.unread_count}</span>}
          </div>
        ))}
      </div>
      {selectedConversation && (
        <div className="flex flex-col border-t p-2">
          <div className="flex items-center mb-2">
            <Image src={selectedConversation.avatar || '/default-avatar.png'} width={40} height={40} className="rounded-full" alt={selectedConversation.name} />
            <div className="ml-3">
              <p className="font-semibold">{selectedConversation.name}</p>
              <p className="text-sm text-gray-500">{otherUserTyping ? t('Typing...') : otherUserOnline ? t('Online') : otherUserLastSeen ? `${t('Last seen at')} ${otherUserLastSeen}` : ''}</p>
            </div>
            <div className="ml-auto flex space-x-2">
              <button onClick={() => startCall('audio')}><Phone /></button>
              <button onClick={() => startCall('video')}><Video /></button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto h-[300px] p-1 space-y-1">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.sender_id === currentUser.id ? 'justify-end' : 'justify-start'}`}>
                <div className={`p-2 rounded ${msg.sender_id === currentUser.id ? 'bg-blue-600 text-white' : 'bg-gray-200 text-black'}`}>{msg.content}</div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="flex items-center mt-2">
            <input type="text" className="flex-1 border rounded px-2 py-1" placeholder={t('Type a message')} value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyDown={handleKeyPress} />
            <button onClick={handleSendMessage} disabled={isSending}><Send /></button>
          </div>
        </div>
      )}
      {callStatus !== 'idle' && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center z-50">
          {callType === 'video' ? <video ref={remoteVideoRef} autoPlay className="w-80 h-60 rounded" /> : <audio ref={remoteAudioRef} autoPlay />}
          <button onClick={endCall} className="mt-4 p-2 bg-red-600 text-white rounded">{t('End Call')}</button>
        </div>
      )}
    </div>
  );
}