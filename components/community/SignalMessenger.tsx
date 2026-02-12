'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Send, Phone, Video, Search, MoreVertical, ArrowLeft, 
  Smile, Paperclip, Mic, X, Check, CheckCheck, Loader2,
  PhoneOff, MicOff, VideoOff, Volume2, Maximize2, Play, Pause,
  Shield, Sparkles, User, Image as ImageIcon, FileText, Download
} from 'lucide-react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase/client';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';

let Peer: any;

interface Message {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  messageType: string;
  mediaUrl?: string;
  createdAt: string;
  isRead: boolean;
  senderName?: string;
  senderAvatar?: string;
}

interface Conversation {
  id: number;
  name: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
}

interface SignalMessengerProps {
  currentUser: any;
  initialUserId?: number;
  fullPage?: boolean;
  onBack?: () => void;
}

export default function SignalMessenger({ currentUser, initialUserId, fullPage = false, onBack }: SignalMessengerProps) {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [replyTo, setReplyTo] = useState<any>(null);
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [remoteIsTyping, setRemoteIsTyping] = useState(false);
  const typingTimeoutRef = useRef<any>(null);
  const [isPeerReady, setIsPeerReady] = useState(false);
  
  // Voice Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  // Call States
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'incoming' | 'connected'>('idle');
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const peerRef = useRef<any>(null);
  const currentCallRef = useRef<any>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  // Initialize PeerJS for Calls
  const initPeer = useCallback(async () => {
    if (typeof window === 'undefined' || !currentUser?.id) return;
    try {
      if (!Peer) {
        const module = await import('peerjs');
        Peer = module.default;
      }
      
      const peer = new Peer(`user-${currentUser.id}`, {
        host: '0.peerjs.com',
        port: 443,
        path: '/',
        secure: true
      });

      peer.on('open', () => {
        setIsPeerReady(true);
        peerRef.current = peer;
      });

      peer.on('call', async (call: any) => {
        setCallType(call.metadata?.type || 'audio');
        setCallStatus('incoming');
        currentCallRef.current = call;
      });

      peer.on('error', (err: any) => console.error('PeerJS Error:', err));
    } catch (e) {
      console.error('PeerJS Init Error:', e);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    initPeer();
    return () => {
      if (peerRef.current) peerRef.current.destroy();
    };
  }, [initPeer]);

  // Fetch Conversations
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/conversations');
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
        
        if (initialUserId && !selectedConv) {
          const found = data.conversations.find((c: any) => c.id === initialUserId);
          if (found) setSelectedConv(found);
          else {
            const { data: userData } = await supabase.from('users').select('id, name, avatar, is_online').eq('id', initialUserId).single();
            if (userData) {
              setSelectedConv({
                id: userData.id,
                name: userData.name,
                avatar: userData.avatar,
                isOnline: userData.is_online,
                unreadCount: 0
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Fetch conversations error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [initialUserId, selectedConv]);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);

  // Real-time Messages & Presence
  useEffect(() => {
    if (!currentUser?.id || !selectedConv) return;

    const channelId = `chat-${Math.min(currentUser.id, selectedConv.id)}-${Math.max(currentUser.id, selectedConv.id)}`;
    const channel = supabase.channel(channelId)
      .on('broadcast', { event: 'new-message' }, ({ payload }) => {
        setMessages(prev => {
          if (prev.some(m => m.id === payload.id)) return prev;
          return [...prev, payload];
        });
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.userId !== currentUser.id) {
          setRemoteIsTyping(payload.isTyping);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUser?.id, selectedConv]);

  const handleTyping = () => {
    if (!selectedConv || !currentUser) return;
    
    const channelId = `chat-${Math.min(currentUser.id, selectedConv.id)}-${Math.max(currentUser.id, selectedConv.id)}`;
    const channel = supabase.channel(channelId);
    
    if (!isTyping) {
      setIsTyping(true);
      channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId: currentUser.id, isTyping: true }
      });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId: currentUser.id, isTyping: false }
      });
    }, 2000);
  };

  // Load Messages
  useEffect(() => {
    if (!selectedConv) return;
    const loadMessages = async () => {
      const res = await fetch(`/api/chat/messages/${selectedConv.id}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        setTimeout(() => messagesEndRef.current?.scrollIntoView(), 100);
      }
    };
    loadMessages();
  }, [selectedConv]);

  const handleSendMessage = async (content?: string, type: string = 'text', mediaUrl?: string) => {
    const messageContent = content || newMessage;
    if (!messageContent.trim() && !mediaUrl || !selectedConv || isSending) return;
    setIsSending(true);
    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiverId: selectedConv.id,
          content: messageContent,
          messageType: type,
          mediaUrl,
          replyToId: replyTo?.id
        })
      });
      if (res.ok) {
        const { message } = await res.json();
        setMessages(prev => [...prev, message]);
        if (type === 'text') setNewMessage('');
        setReplyTo(null);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    } catch (error) {
      console.error('Send error:', error);
    } finally {
      setIsSending(false);
    }
  };

  // File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedConv) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (res.ok) {
        const data = await res.json();
        const url = data.url;
        const type = file.type.startsWith('image/') ? 'image' : 'file';
        handleSendMessage(file.name, type, url);
      }
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  // Voice Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('file', audioBlob, 'voice.webm');
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        if (res.ok) {
          const data = await res.json();
          const url = data.url;
          handleSendMessage('Voice message', 'voice', url);
        }
        stream.getTracks().forEach(t => t.stop());
      };
      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
    } catch (e) { console.error('Mic error:', e); }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const addEmoji = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const emojis = ['😊', '😂', '❤️', '😍', '👍', '🔥', '🙌', '✨', '🤔', '😎', '🎉', '💡', '✅', '🚀', '🙏', '💯'];

  useEffect(() => {
    let interval: any;
    if (isRecording) interval = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [isRecording]);

  // Call Functions
  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(t => t.enabled = !t.enabled);
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream && callType === 'video') {
      localStream.getVideoTracks().forEach(t => t.enabled = !t.enabled);
      setIsVideoOff(!isVideoOff);
    }
  };
  const startCall = async (type: 'audio' | 'video') => {
    if (!isPeerReady || !selectedConv) return;
    setCallType(type);
    setCallStatus('calling');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' });
      setLocalStream(stream);
      const call = peerRef.current.call(`user-${selectedConv.id}`, stream, { metadata: { type } });
      currentCallRef.current = call;
      call.on('stream', (rs: any) => {
        setRemoteStream(rs);
        setCallStatus('connected');
      });
      call.on('close', () => endCall());
    } catch (e) {
      console.error('Call Error:', e);
      setCallStatus('idle');
    }
  };

  const acceptCall = async () => {
    if (!currentCallRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: callType === 'video' });
      setLocalStream(stream);
      currentCallRef.current.answer(stream);
      currentCallRef.current.on('stream', (rs: any) => {
        setRemoteStream(rs);
        setCallStatus('connected');
      });
      setCallStatus('connected');
    } catch (e) {
      console.error('Accept Call Error:', e);
    }
  };

  const endCall = () => {
    if (localStream) localStream.getTracks().forEach(t => t.stop());
    if (currentCallRef.current) currentCallRef.current.close();
    setLocalStream(null);
    setRemoteStream(null);
    setCallStatus('idle');
  };

  if (isLoading) return (
    <div className="flex-1 flex items-center justify-center bg-white h-full">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-4 border-purple-100 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-purple-600 rounded-full border-t-transparent animate-spin"></div>
        </div>
        <p className="text-purple-600 font-bold animate-pulse">Initializing Secure Chat...</p>
      </div>
    </div>
  );

  return (
    <div className={`flex bg-white overflow-hidden ${fullPage ? 'fixed inset-0 z-50' : 'h-[750px] rounded-[2.5rem] shadow-2xl border border-slate-100'}`}>
      {/* Sidebar */}
      <div className={`${selectedConv ? 'hidden md:flex' : 'flex'} w-full md:w-96 flex-col border-r border-slate-100 bg-slate-50/50 backdrop-blur-xl`}>
        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">Messages</h2>
              <p className="text-xs font-bold text-purple-600 uppercase tracking-widest mt-1">End-to-End Encrypted</p>
            </div>
            {onBack && (
              <button onClick={onBack} className="p-3 bg-white shadow-sm hover:shadow-md rounded-2xl transition-all text-slate-600">
                <X size={20} />
              </button>
            )}
          </div>
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-purple-600 transition-colors" size={20} />
            <input 
              type="text" 
              placeholder="Search people or messages..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-100 rounded-[1.25rem] pl-12 pr-4 py-4 text-sm focus:ring-4 focus:ring-purple-50 focus:border-purple-200 outline-none transition-all shadow-sm"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-2">
          {conversations.filter(c => 
            c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
            c.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase())
          ).map(conv => (
            <button 
              key={conv.id} 
              onClick={() => setSelectedConv(conv)}
              className={`w-full p-5 flex items-center gap-4 rounded-[1.5rem] transition-all duration-300 ${selectedConv?.id === conv.id ? 'bg-gradient-to-br from-purple-600 to-blue-600 text-white shadow-xl shadow-purple-200 scale-[1.02]' : 'hover:bg-white hover:shadow-md text-slate-600'}`}
            >
              <div className="relative flex-shrink-0">
                <div className={`w-14 h-14 rounded-2xl overflow-hidden border-2 ${selectedConv?.id === conv.id ? 'border-white/30' : 'border-white'} shadow-sm`}>
                  <Image src={conv.avatar || '/default-avatar.png'} alt={conv.name} width={56} height={56} className="object-cover" unoptimized />
                </div>
                {conv.isOnline && <div className={`absolute -bottom-1 -right-1 w-4 h-4 border-2 border-white rounded-full ${selectedConv?.id === conv.id ? 'bg-white' : 'bg-emerald-500'} shadow-sm`}></div>}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex justify-between items-baseline mb-1">
                  <h3 className="font-bold text-base truncate">{conv.name}</h3>
                  {conv.lastMessageTime && <span className={`text-[10px] font-medium ${selectedConv?.id === conv.id ? 'text-purple-100' : 'text-slate-400'}`}>{format(new Date(conv.lastMessageTime), 'HH:mm')}</span>}
                </div>
                <p className={`text-xs truncate font-medium ${selectedConv?.id === conv.id ? 'text-purple-100/80' : 'text-slate-400'}`}>{conv.lastMessage || 'Start a new story...'}</p>
              </div>
              {conv.unreadCount > 0 && selectedConv?.id !== conv.id && (
                <span className="bg-purple-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full animate-bounce shadow-lg shadow-purple-200">{conv.unreadCount}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`${selectedConv ? 'flex' : 'hidden md:flex'} flex-1 flex-col bg-white relative`}>
        {selectedConv ? (
          <>
            {/* Header */}
            <div className="p-6 bg-white border-b border-slate-50 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 hover:bg-slate-50 rounded-full transition-colors lg:hidden"><ArrowLeft size={20} /></button>
                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-purple-50 shadow-sm">
                    <Image src={selectedConv.avatar || '/default-avatar.png'} alt={selectedConv.name} fill className="object-cover" unoptimized />
                  </div>
                  {selectedConv.isOnline && <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-4 border-white rounded-full"></div>}
                </div>
                <div>
                  <h3 className="font-black text-slate-900 tracking-tight">{selectedConv.name}</h3>
                  {remoteIsTyping ? (
                    <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest animate-pulse">Typing...</p>
                  ) : (
                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                      {selectedConv.isOnline ? 'Online Now' : 'Offline'}
                    </p>
                  )}
                </div>
              </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => startCall('audio')} className="p-3 text-slate-400 hover:bg-purple-50 hover:text-purple-600 rounded-2xl transition-all shadow-sm hover:shadow-md"><Phone size={22} /></button>
                <button onClick={() => startCall('video')} className="p-3 text-slate-400 hover:bg-blue-50 hover:text-blue-600 rounded-2xl transition-all shadow-sm hover:shadow-md"><Video size={22} /></button>
                <button className="p-3 text-slate-400 hover:bg-slate-50 rounded-2xl transition-all"><MoreVertical size={22} /></button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-[#fdfdfd] scrollbar-hide">
              <div className="flex flex-col items-center mb-8">
                <div className="p-4 bg-purple-50 rounded-3xl mb-3">
                  <Shield className="text-purple-600" size={32} />
                </div>
                <p className="text-[11px] font-black text-purple-400 uppercase tracking-[0.2em]">Military Grade Encryption Active</p>
                <p className="text-[10px] text-slate-300 mt-1">Messages are secured with end-to-end technology</p>
              </div>

              {messages.map((msg, i) => {
                const isMe = msg.senderId === currentUser.id;
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                    <div className={`max-w-[80%] group relative`}>
                      <div className={`px-5 py-3.5 rounded-[1.75rem] text-[15px] shadow-sm transition-all hover:shadow-md ${isMe ? 'bg-gradient-to-br from-purple-600 to-blue-600 text-white rounded-tr-none' : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'}`}>
                        {msg.replyTo && (
                          <div className={`mb-2 p-2 rounded-xl text-xs border-l-4 ${isMe ? 'bg-white/10 border-white/40 text-purple-100' : 'bg-slate-50 border-purple-400 text-slate-500'} truncate`}>
                            {msg.replyTo.content}
                          </div>
                        )}
                        {msg.messageType === 'text' && <p className="leading-relaxed font-medium">{msg.content}</p>}
                        
                        {msg.messageType === 'image' && msg.mediaUrl && (
                          <div className="rounded-xl overflow-hidden mb-2 border border-white/20">
                            <Image src={msg.mediaUrl} alt="Sent image" width={300} height={200} className="object-cover w-full h-auto" unoptimized />
                          </div>
                        )}

                        {msg.messageType === 'voice' && msg.mediaUrl && (
                          <div className="flex items-center gap-3 py-2 min-w-[200px]">
                            <button 
                              onClick={(e) => {
                                const audio = e.currentTarget.nextElementSibling as HTMLAudioElement;
                                if (audio.paused) audio.play(); else audio.pause();
                              }}
                              className={`p-2.5 rounded-full ${isMe ? 'bg-white/20 hover:bg-white/30' : 'bg-purple-100 hover:bg-purple-200'} transition-all`}
                            >
                              <Play size={18} className={isMe ? 'text-white' : 'text-purple-600'} />
                            </button>
                            <audio src={msg.mediaUrl} onPlay={(e) => {
                              const btn = e.currentTarget.previousElementSibling as HTMLButtonElement;
                              // Simple visual feedback could be added here
                            }} />
                            <div className="flex-1">
                              <div className={`h-1.5 w-full rounded-full ${isMe ? 'bg-white/20' : 'bg-slate-100'}`}>
                                <div className={`h-full w-0 rounded-full ${isMe ? 'bg-white' : 'bg-purple-600'} transition-all duration-300`}></div>
                              </div>
                              <p className={`text-[9px] mt-1 font-bold ${isMe ? 'text-purple-100' : 'text-slate-400'}`}>Voice Message</p>
                            </div>
                          </div>
                        )}

                        {msg.messageType === 'file' && msg.mediaUrl && (
                          <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-3 p-3 rounded-xl ${isMe ? 'bg-white/10' : 'bg-slate-50'} hover:opacity-80 transition-all`}>
                            <div className={`p-2 rounded-lg ${isMe ? 'bg-white/20' : 'bg-purple-100 text-purple-600'}`}>
                              <FileText size={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold truncate">{msg.content}</p>
                              <p className="text-[10px] opacity-60">Click to download</p>
                            </div>
                            <Download size={16} className="opacity-60" />
                          </a>
                        )}

                        <div className={`flex items-center justify-end gap-1.5 mt-1.5 text-[10px] font-bold ${isMe ? 'text-purple-100/80' : 'text-slate-400'}`}>
                          {format(new Date(msg.createdAt), 'HH:mm')}
                          {isMe && (msg.isRead ? <CheckCheck size={14} className="text-emerald-300" /> : <Check size={14} />)}
                        </div>
                      </div>
                      {!isMe && (
                        <button 
                          onClick={() => setReplyTo(msg)}
                          className="absolute -right-10 top-1/2 -translate-y-1/2 p-2 text-slate-300 hover:text-purple-600 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Reply size={18} />
                        </button>
                      )}
                      {isMe && (
                        <button 
                          onClick={() => setReplyTo(msg)}
                          className="absolute -left-10 top-1/2 -translate-y-1/2 p-2 text-slate-300 hover:text-purple-600 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Reply size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-6 bg-white border-t border-slate-50 relative">
              {showEmojiPicker && (
                <div className="absolute bottom-full left-6 mb-4 p-4 bg-white rounded-3xl shadow-2xl border border-slate-100 grid grid-cols-8 gap-2 animate-in zoom-in-95 duration-200 z-50">
                  {emojis.map(emoji => (
                    <button key={emoji} onClick={() => addEmoji(emoji)} className="text-2xl hover:scale-125 transition-transform p-1">{emoji}</button>
                  ))}
                </div>
              )}
              
              {replyTo && (
                <div className="mb-4 p-3 bg-purple-50 rounded-2xl flex items-center justify-between animate-in slide-in-from-bottom-2">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-8 bg-purple-600 rounded-full"></div>
                    <div>
                      <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest">Replying to</p>
                      <p className="text-xs text-slate-600 truncate max-w-[200px]">{replyTo.content}</p>
                    </div>
                  </div>
                  <button onClick={() => setReplyTo(null)} className="p-2 hover:bg-purple-100 rounded-full transition-all text-purple-600"><X size={16} /></button>
                </div>
              )}
              {isRecording && (
                <div className="mb-4 p-4 bg-red-50 rounded-2xl flex items-center justify-between animate-pulse">
                  <div className="flex items-center gap-3 text-red-600">
                    <div className="w-3 h-3 bg-red-600 rounded-full animate-ping"></div>
                    <span className="font-black uppercase tracking-widest text-xs">Recording Voice... {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}</span>
                  </div>
                  <button onClick={stopRecording} className="p-2 bg-red-600 text-white rounded-full hover:scale-110 transition-all shadow-lg shadow-red-200"><X size={16} /></button>
                </div>
              )}
              
              <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-[2rem] border border-slate-100 focus-within:border-purple-200 focus-within:ring-8 focus-within:ring-purple-50/50 transition-all shadow-inner">
                <button 
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className={`p-3 rounded-full transition-all ${showEmojiPicker ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-purple-600 hover:bg-white'}`}
                >
                  <Smile size={24} />
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="p-3 text-slate-400 hover:text-purple-600 hover:bg-white rounded-full transition-all">
                  <Paperclip size={24} />
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                </button>
                <input 
                  type="text" 
                  placeholder={isUploading ? "Uploading file..." : "Write something beautiful..."}
                  value={newMessage}
                  disabled={isUploading}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    handleTyping();
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="flex-1 bg-transparent border-none outline-none text-base text-slate-700 py-2 font-medium placeholder:text-slate-300"
                />
                {newMessage.trim() || isUploading ? (
                  <button 
                    onClick={() => handleSendMessage()}
                    disabled={isSending || isUploading}
                    className="p-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full hover:shadow-xl hover:shadow-purple-200 transition-all disabled:opacity-50 active:scale-95"
                  >
                    {isUploading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                  </button>
                ) : (
                  <button onClick={startRecording} className="p-4 bg-white text-purple-600 rounded-full shadow-sm hover:shadow-md transition-all"><Mic size={24} /></button>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-12 text-center bg-gradient-to-b from-white to-slate-50/50">
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-purple-100 rounded-[3rem] blur-3xl opacity-50 animate-pulse"></div>
              <div className="relative w-32 h-32 bg-white shadow-2xl rounded-[3rem] flex items-center justify-center border border-purple-50">
                <Sparkles size={64} className="text-purple-600 animate-bounce" />
              </div>
            </div>
            <h3 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Welcome to Light Chat</h3>
            <p className="text-base text-slate-500 max-w-sm font-medium leading-relaxed">
              Select a friend from the list to start a secure, encrypted conversation. Your privacy is our priority.
            </p>
            <div className="mt-12 flex items-center gap-8">
              <div className="flex flex-col items-center gap-2">
                <div className="p-4 bg-white shadow-md rounded-2xl text-purple-600"><Shield size={24} /></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Secure</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="p-4 bg-white shadow-md rounded-2xl text-blue-600"><Video size={24} /></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">HD Calls</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="p-4 bg-white shadow-md rounded-2xl text-emerald-600"><Mic size={24} /></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Voice</span>
              </div>
            </div>
          </div>
        )}

        {/* Call Overlay */}
        {callStatus !== 'idle' && (
          <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-2xl flex flex-col items-center justify-center text-white p-8 animate-in fade-in duration-500">
            <div className="relative mb-12">
              <div className="absolute inset-0 bg-purple-500 rounded-full blur-3xl opacity-20 animate-pulse"></div>
              <div className="relative w-40 h-40 rounded-[3rem] overflow-hidden border-4 border-white/10 shadow-2xl">
                <Image src={selectedConv?.avatar || '/default-avatar.png'} alt="Caller" fill className="object-cover" unoptimized />
              </div>
              {callStatus === 'calling' && <div className="absolute -inset-4 border-2 border-purple-500 rounded-[3.5rem] animate-ping opacity-50"></div>}
            </div>
            
            <h2 className="text-4xl font-black mb-2 tracking-tight">{selectedConv?.name}</h2>
            <p className="text-purple-400 font-black uppercase tracking-[0.3em] text-sm mb-12">
              {callStatus === 'calling' ? 'Calling...' : callStatus === 'incoming' ? 'Incoming Call' : 'Connected'}
            </p>

            {callStatus === 'connected' && callType === 'video' && (
              <div className="w-full max-w-4xl aspect-video bg-black rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10 mb-12 relative">
                <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                <div className="absolute bottom-6 right-6 w-48 aspect-video bg-slate-800 rounded-2xl overflow-hidden border-2 border-white/20 shadow-xl">
                  <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                </div>
              </div>
            )}

            <div className="flex items-center gap-8">
              {callStatus === 'incoming' ? (
                <>
                  <button onClick={acceptCall} className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center shadow-xl shadow-emerald-500/20 hover:scale-110 transition-all animate-bounce"><Phone size={32} /></button>
                  <button onClick={endCall} className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center shadow-xl shadow-red-500/20 hover:scale-110 transition-all"><PhoneOff size={32} /></button>
                </>
              ) : (
                <>
                  <button onClick={toggleMute} className={`w-16 h-16 ${isMuted ? 'bg-red-500' : 'bg-white/10'} hover:bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md transition-all`}>
                    {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                  </button>
                  <button onClick={endCall} className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center shadow-xl shadow-red-500/20 hover:scale-110 transition-all"><PhoneOff size={32} /></button>
                  <button onClick={toggleVideo} className={`w-16 h-16 ${isVideoOff ? 'bg-red-500' : 'bg-white/10'} hover:bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md transition-all`}>
                    {isVideoOff ? <VideoOff size={24} /> : <Video size={24} />}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
