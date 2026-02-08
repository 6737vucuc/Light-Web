'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, Send, Phone, Video, Info, Image as ImageIcon, 
  Smile, MoreVertical, Mic, Paperclip, Check, CheckCheck,
  Camera, Music, FileText, MapPin, User as UserIcon,
  PhoneOff, MicOff, Volume2, Maximize2, Minimize2,
  MessageSquare, ArrowLeft
} from 'lucide-react';
import Image from 'next/image';
import { useRealtimeChat } from '@/lib/hooks/useRealtimeChat';
import { useVoiceCall } from '@/lib/hooks/useVoiceCall';
import { RealtimeChatService } from '@/lib/realtime/chat';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import VoiceRecorder from './VoiceRecorder';
import VoiceMessagePlayer from './VoiceMessagePlayer';
import MessageReactions from './MessageReactions';
import LinkPreview from './LinkPreview';

interface ModernMessengerProps {
  recipient: any;
  currentUser: any;
  onClose: () => void;
}

export default function ModernMessenger({ recipient, currentUser, onClose }: ModernMessengerProps) {
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Ensure we have IDs before calling getPrivateChannelName
  const currentUserId = currentUser?.id || currentUser?.userId;
  const recipientId = recipient?.id || recipient?.userId;
  
  const channelId = (currentUserId && recipientId) 
    ? RealtimeChatService.getPrivateChannelName(currentUserId, recipientId)
    : 'private-chat-pending';
  
  const { messages, setMessages, typingUsers, sendTyping } = useRealtimeChat(channelId, currentUserId);
  const { 
    callState, initiateCall, acceptCall, rejectCall, endCall, 
    toggleMute, formatDuration, remoteAudioRef 
  } = useVoiceCall(
    currentUserId, 
    currentUser?.name || 'User', 
    currentUser?.avatar || null
  );

  useEffect(() => {
    if (recipientId) {
      loadMessages();
    }
  }, [recipientId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    if (!recipientId) return;
    try {
      const res = await fetch(`/api/chat/messages/${recipientId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (content?: string, type: string = 'text', mediaUrl?: string) => {
    const messageContent = content || newMessage;
    if (!messageContent.trim() && !mediaUrl) return;
    if (!recipientId) return;
    
    setIsSending(true);
    try {
      const res = await fetch('/api/chat/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId: recipientId,
          content: messageContent.trim(),
          messageType: type,
          mediaUrl: mediaUrl
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // Add message to local state immediately
        const newMsg = {
          id: data.message.id,
          senderId: currentUserId,
          senderName: currentUser?.name || 'You',
          senderAvatar: currentUser?.avatar,
          content: messageContent.trim(),
          messageType: type,
          mediaUrl: mediaUrl,
          timestamp: new Date(),
          isRead: false,
        };
        setMessages(prev => [...prev, newMsg]);
        setNewMessage('');
        setShowEmojiPicker(false);
        sendTyping(false, currentUser?.name || 'User');
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setShowAttachmentMenu(false);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        await handleSendMessage('', file.type.startsWith('image/') ? 'image' : 'file', data.url);
      }
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleVoiceMessageSend = async (audioBlob: Blob) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'voice-message.webm');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        await handleSendMessage('', 'voice', data.url);
      }
    } catch (error) {
      console.error('Voice upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const onEmojiClick = (emojiData: any) => {
    setNewMessage(prev => prev + emojiData.emoji);
  };

  const getAvatarUrl = (avatar?: string | null) => {
    if (!avatar) return '/default-avatar.png';
    if (avatar.startsWith('data:') || avatar.startsWith('http')) return avatar;
    return `https://neon-image-bucket.s3.us-east-1.amazonaws.com/${avatar}`;
  };

  if (!recipient || !currentUser) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-500">
      <div className="bg-white w-full max-w-4xl h-full md:h-[90vh] md:rounded-[3rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden border border-white/20 animate-in zoom-in-95 duration-500 relative">
        
        {/* Decorative Background Elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-200/30 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-200/30 rounded-full blur-[100px] pointer-events-none"></div>

        {/* Header - Ultra Modern Glassmorphism */}
        <div className="relative z-10 px-4 md:px-6 py-3 md:py-5 bg-white/80 backdrop-blur-xl border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-4">
            <button onClick={onClose} className="md:hidden p-2 hover:bg-gray-100 rounded-full transition-colors">
              <ArrowLeft size={24} className="text-gray-600" />
            </button>
            <div className="relative group">
              <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-[1.5rem] overflow-hidden border-2 border-white shadow-xl transition-transform group-hover:scale-105 duration-300">
                {recipient.avatar ? (
                  <Image src={getAvatarUrl(recipient.avatar)} alt={recipient.name} fill className="object-cover" unoptimized />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-blue-500 text-white text-lg md:text-2xl font-black">
                    {recipient.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 md:-bottom-1 md:-right-1 w-3 h-3 md:w-5 md:h-5 bg-emerald-500 border-2 md:border-[3px] border-white rounded-full shadow-lg"></div>
            </div>
            <div className="min-w-0">
              <h3 className="font-black text-base md:text-xl text-gray-900 tracking-tight leading-none mb-1 truncate">{recipient.name}</h3>
              <div className="flex items-center gap-1.5 md:gap-2">
                <span className="flex h-1.5 w-1.5 md:h-2 md:w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <p className="text-[9px] md:text-[11px] text-emerald-600 font-black uppercase tracking-widest truncate">
                  {typingUsers.length > 0 ? 'Typing...' : 'Online Now'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5 md:gap-3">
            <button 
              onClick={() => initiateCall(recipientId, 'voice')}
              className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-gray-50 hover:bg-purple-50 text-gray-600 hover:text-purple-600 rounded-xl md:rounded-2xl transition-all active:scale-90 border border-gray-100"
            >
              <Phone size={20} strokeWidth={2.5} />
            </button>
            <button 
              onClick={() => initiateCall(recipientId, 'video')}
              className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-gray-50 hover:bg-blue-50 text-gray-600 hover:text-blue-600 rounded-xl md:rounded-2xl transition-all active:scale-90 border border-gray-100"
            >
              <Video size={20} strokeWidth={2.5} />
            </button>
            <div className="hidden md:block w-px h-8 bg-gray-100 mx-1"></div>
            <button onClick={onClose} className="hidden md:flex w-12 h-12 items-center justify-center bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-2xl transition-all active:scale-90 border border-gray-100">
              <X size={22} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Messages Area - Clean & Spacious */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 md:space-y-8 bg-transparent custom-scrollbar relative z-10">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
              <div className="w-20 h-20 md:w-24 md:h-24 bg-gray-100 rounded-[1.5rem] md:rounded-[2rem] flex items-center justify-center mb-4">
                <MessageSquare size={48} className="text-gray-300" />
              </div>
              <p className="font-black text-gray-400 text-sm md:text-base">Start a beautiful conversation</p>
            </div>
          )}
          
          {messages.map((msg, idx) => {
            const isMine = msg.senderId === currentUserId;
            const isImage = msg.messageType === 'image';
            const isVoice = msg.messageType === 'voice';
            const isLink = msg.messageType === 'text' && msg.content?.startsWith('http');
            
            return (
              <div key={msg.id || idx} className={`flex ${isMine ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-4 duration-500`}>
                <div className={`max-w-[85%] md:max-w-[80%] flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                  <div className={`relative group transition-all duration-300 ${
                    isMine 
                      ? 'bg-gradient-to-br from-purple-600 via-purple-500 to-blue-600 text-white shadow-[0_10px_30px_-10px_rgba(124,58,237,0.5)] rounded-[1.4rem] md:rounded-[1.8rem] rounded-tr-none' 
                      : 'bg-white text-gray-800 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)] border border-gray-100 rounded-[1.4rem] md:rounded-[1.8rem] rounded-tl-none'
                  } ${isImage ? 'p-1 md:p-1.5' : 'px-4 py-3 md:px-6 md:py-4'}`}>
                    
                    {isImage ? (
                      <div className="relative rounded-[1.1rem] md:rounded-[1.4rem] overflow-hidden min-w-[150px] md:min-w-[200px] min-h-[100px] md:min-h-[150px]">
                        <Image src={msg.mediaUrl} alt="Sent image" width={400} height={300} className="object-cover hover:scale-105 transition-transform duration-500" unoptimized />
                      </div>
                    ) : isVoice ? (
                      <VoiceMessagePlayer
                        audioUrl={msg.mediaUrl}
                        duration={msg.duration || 0}
                        senderName={msg.senderName}
                        isMine={isMine}
                      />
                    ) : isLink ? (
                      <LinkPreview
                        url={msg.content}
                        title={msg.linkTitle}
                        description={msg.linkDescription}
                        image={msg.linkImage}
                        isMine={isMine}
                      />
                    ) : (
                      <p className="text-[14px] md:text-[15px] font-bold leading-relaxed tracking-tight">{msg.content}</p>
                    )}

                    {/* Quick Actions on Hover (Desktop Only) */}
                    <div className={`hidden md:flex absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 gap-1 ${isMine ? '-left-12' : '-right-12'}`}>
                      <button className="p-2 bg-white shadow-md rounded-full text-gray-400 hover:text-purple-500 transition-colors">
                        <Smile size={14} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-1.5 md:mt-2 px-2">
                    <span className="text-[9px] md:text-[10px] text-gray-400 font-black uppercase tracking-tighter">
                      {new Date(msg.createdAt || msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isMine && (
                      <div className="flex items-center">
                        {msg.isRead ? (
                          <CheckCheck size={14} className="text-blue-500" />
                        ) : (
                          <Check size={14} className="text-gray-300" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area - Floating Design */}
        <div className="p-4 md:p-6 bg-white/80 backdrop-blur-xl border-t border-gray-100 relative z-10">
          <div className="max-w-4xl mx-auto flex items-end gap-2 md:gap-3">
            
            {/* Attachment Menu */}
            <div className="relative">
              <button 
                onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                className={`w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-xl md:rounded-2xl transition-all ${showAttachmentMenu ? 'bg-purple-600 text-white rotate-45' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
              >
                <Paperclip size={22} />
              </button>
              
              {showAttachmentMenu && (
                <div className="absolute bottom-14 md:bottom-16 left-0 bg-white rounded-2xl md:rounded-[2rem] shadow-2xl border border-gray-100 p-2 md:p-3 flex flex-col gap-1 md:gap-2 animate-in slide-in-from-bottom-4 duration-300 min-w-[160px] md:min-w-[180px]">
                  <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 md:gap-3 p-2 md:p-3 hover:bg-purple-50 rounded-xl md:rounded-2xl transition-colors text-gray-700 font-black text-xs md:text-sm">
                    <div className="w-8 h-8 md:w-10 md:h-10 bg-purple-100 text-purple-600 rounded-lg md:rounded-xl flex items-center justify-center"><ImageIcon size={20} /></div>
                    Photos
                  </button>
                  <button onClick={() => setShowVoiceRecorder(true)} className="flex items-center gap-2 md:gap-3 p-2 md:p-3 hover:bg-red-50 rounded-xl md:rounded-2xl transition-colors text-gray-700 font-black text-xs md:text-sm">
                    <div className="w-8 h-8 md:w-10 md:h-10 bg-red-100 text-red-600 rounded-lg md:rounded-xl flex items-center justify-center"><Mic size={20} /></div>
                    Voice Message
                  </button>
                  <button className="flex items-center gap-2 md:gap-3 p-2 md:p-3 hover:bg-emerald-50 rounded-xl md:rounded-2xl transition-colors text-gray-700 font-black text-xs md:text-sm">
                    <div className="w-8 h-8 md:w-10 md:h-10 bg-emerald-100 text-emerald-600 rounded-lg md:rounded-xl flex items-center justify-center"><FileText size={20} /></div>
                    Document
                  </button>
                </div>
              )}
            </div>

            {/* Main Input Field */}
            <div className="flex-1 relative bg-gray-100 rounded-2xl md:rounded-[2rem] border-2 border-transparent focus-within:border-purple-200 focus-within:bg-white focus-within:shadow-xl transition-all duration-300 flex items-center px-2 md:px-4 py-0.5 md:py-1">
              <button 
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className={`p-1.5 md:p-2 transition-colors ${showEmojiPicker ? 'text-purple-600' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <Smile size={24} />
              </button>
              
              <input 
                type="text"
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  sendTyping(e.target.value.length > 0, currentUser?.name || 'User');
                }}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type your message..."
                className="flex-1 bg-transparent border-none focus:ring-0 py-3 md:py-4 text-[14px] md:text-[15px] font-bold text-gray-800 placeholder:text-gray-400"
              />

              {isUploading && (
                <div className="absolute right-3 md:right-4 animate-spin rounded-full h-4 w-4 md:h-5 md:w-5 border-2 border-purple-600 border-t-transparent"></div>
              )}
            </div>

            {/* Send Button */}
            <button 
              onClick={() => handleSendMessage()}
              disabled={(!newMessage.trim() && !isUploading) || isSending}
              className="w-11 h-11 md:w-14 md:h-14 bg-gradient-to-br from-purple-600 to-blue-600 text-white rounded-xl md:rounded-[1.5rem] shadow-xl shadow-purple-200 flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
            >
              <Send size={24} strokeWidth={2.5} />
            </button>
          </div>

          {/* Emoji Picker Overlay */}
          {showEmojiPicker && (
            <div className="absolute bottom-24 md:bottom-28 left-4 md:left-6 z-50 shadow-2xl rounded-2xl md:rounded-3xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300 max-w-[calc(100vw-2rem)]">
              <EmojiPicker 
                onEmojiClick={onEmojiClick}
                theme={Theme.LIGHT}
                width={typeof window !== 'undefined' && window.innerWidth < 768 ? 280 : 320}
                height={typeof window !== 'undefined' && window.innerWidth < 768 ? 350 : 400}
              />
            </div>
          )}
        </div>

        {/* Hidden File Input */}
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileUpload} 
          className="hidden" 
          accept="image/*,application/pdf"
        />

        {/* Voice Recorder Modal */}
        <VoiceRecorder
          isOpen={showVoiceRecorder}
          onClose={() => setShowVoiceRecorder(false)}
          onSend={handleVoiceMessageSend}
        />

        {/* Call Overlay - Ultra Immersive */}
        {(callState.isCalling || callState.isReceivingCall || callState.isInCall) && (
          <div className="absolute inset-0 z-[200] bg-gray-900 flex flex-col items-center justify-center text-white p-4 md:p-8 animate-in fade-in duration-700 overflow-hidden">
            
            {/* Animated Background Gradients */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-purple-600/20 rounded-full blur-[120px] animate-pulse"></div>
              <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }}></div>
            </div>

            <div className="relative z-10 flex flex-col items-center w-full max-w-md">
              <div className="relative mb-8 md:mb-12">
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-[3rem] md:rounded-[4rem] overflow-hidden border-4 border-white/10 shadow-[0_0_80px_rgba(124,58,237,0.3)] animate-pulse">
                  <Image 
                    src={getAvatarUrl(callState.isReceivingCall ? callState.callerAvatar : recipient.avatar)} 
                    alt="Caller" 
                    fill 
                    className="object-cover" 
                    unoptimized 
                  />
                </div>
                <div className="absolute -bottom-3 md:-bottom-4 left-1/2 -translate-x-1/2 bg-emerald-500 px-3 md:px-4 py-1 md:py-1.5 rounded-full shadow-xl flex items-center gap-1.5 md:gap-2">
                  <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-white rounded-full animate-ping"></div>
                  <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest">Live Connection</span>
                </div>
              </div>
              
              <h2 className="text-2xl md:text-4xl font-black mb-2 md:mb-3 tracking-tight text-center">
                {callState.isReceivingCall ? callState.callerName : recipient.name}
              </h2>
              <p className="text-purple-300 font-black mb-10 md:mb-16 tracking-[0.2em] md:tracking-[0.3em] uppercase text-[10px] md:text-xs text-center">
                {callState.isInCall ? (
                  <span className="flex items-center gap-2 md:gap-3 justify-center">
                    <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-red-500 rounded-full animate-pulse"></span>
                    {formatDuration(callState.duration)}
                  </span>
                ) : (
                  callState.isReceivingCall ? 'Incoming Voice Call' : 'Establishing Secure Line...'
                )}
              </p>

              <div className="flex items-center gap-6 md:gap-10">
                {callState.isReceivingCall ? (
                  <>
                    <button 
                      onClick={rejectCall}
                      className="w-16 h-16 md:w-20 md:h-20 bg-white/10 hover:bg-red-500/20 text-white hover:text-red-500 rounded-[2rem] md:rounded-[2.5rem] flex items-center justify-center shadow-2xl transition-all border border-white/10 group"
                    >
                      <PhoneOff size={32} className="group-hover:scale-110 transition-transform" />
                    </button>
                    <button 
                      onClick={acceptCall}
                      className="w-20 h-20 md:w-24 md:h-24 bg-emerald-500 text-white rounded-[2.5rem] md:rounded-[3rem] flex items-center justify-center shadow-[0_20px_50px_rgba(16,185,129,0.4)] hover:scale-110 active:scale-90 transition-all"
                    >
                      <Phone size={40} className="animate-bounce" />
                    </button>
                  </>
                ) : (
                  <>
                    <button 
                      onClick={toggleMute}
                      className={`w-14 h-14 md:w-18 md:h-18 ${callState.isMuted ? 'bg-red-500 text-white' : 'bg-white/10 text-white'} rounded-[1.5rem] md:rounded-[2rem] flex items-center justify-center hover:bg-white/20 transition-all border border-white/10`}
                    >
                      {callState.isMuted ? <MicOff size={28} /> : <Mic size={28} />}
                    </button>
                    <button 
                      onClick={endCall}
                      className="w-20 h-20 md:w-24 md:h-24 bg-red-500 text-white rounded-[2.5rem] md:rounded-[3rem] flex items-center justify-center shadow-[0_20px_50px_rgba(239,68,68,0.4)] hover:scale-110 active:scale-90 transition-all"
                    >
                      <PhoneOff size={40} />
                    </button>
                    <button className="w-14 h-14 md:w-18 md:h-18 bg-white/10 text-white rounded-[1.5rem] md:rounded-[2rem] flex items-center justify-center hover:bg-white/20 transition-all border border-white/10">
                      <Volume2 size={28} />
                    </button>
                  </>
                )}
              </div>
            </div>
            <audio ref={remoteAudioRef} autoPlay className="hidden" />
          </div>
        )}
      </div>
    </div>
  );
}
