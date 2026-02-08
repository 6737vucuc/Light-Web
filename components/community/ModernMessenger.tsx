'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  X, Send, Phone, Video, Info, Image as ImageIcon, 
  Smile, MoreVertical, Mic, Paperclip, Check, CheckCheck 
} from 'lucide-react';
import Image from 'next/image';
import { useRealtimeChat } from '@/lib/hooks/useRealtimeChat';
import { useVoiceCall } from '@/lib/hooks/useVoiceCall';
import { RealtimeChatService } from '@/lib/realtime/chat';

interface ModernMessengerProps {
  recipient: any;
  currentUser: any;
  onClose: () => void;
}

export default function ModernMessenger({ recipient, currentUser, onClose }: ModernMessengerProps) {
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelId = RealtimeChatService.getPrivateChannelName(currentUser.id, recipient.id);
  
  const { messages, setMessages, typingUsers, sendTyping } = useRealtimeChat(channelId, currentUser.id);
  const { callState, initiateCall, acceptCall, rejectCall, endCall, toggleMute, formatDuration, remoteAudioRef } = useVoiceCall(
    currentUser.id, 
    currentUser.name, 
    currentUser.avatar
  );

  useEffect(() => {
    loadMessages();
  }, [recipient.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    try {
      const res = await fetch(`/api/chat/messages/${recipient.id}`);
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

  const handleSendMessage = async () => {
    if (!newMessage.trim() || isSending) return;
    setIsSending(true);
    
    try {
      const res = await fetch('/api/chat/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId: recipient.id,
          content: newMessage.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setNewMessage('');
        sendTyping(false, currentUser.name);
      }
    } catch (error) {
      console.error('Error sending message:', error);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-2xl h-[85vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-white/20 animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-purple-600 via-purple-500 to-blue-500 text-white flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-white/30 shadow-inner">
                {recipient.avatar ? (
                  <Image src={getAvatarUrl(recipient.avatar)} alt={recipient.name} fill className="object-cover" unoptimized />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-white/20 text-xl font-black">
                    {recipient.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full shadow-sm"></div>
            </div>
            <div>
              <h3 className="font-black text-lg leading-none mb-1">{recipient.name}</h3>
              <p className="text-xs text-purple-100 font-bold opacity-90">
                {typingUsers.length > 0 ? 'Typing...' : 'Online'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => initiateCall(recipient.id, 'voice')}
              className="p-3 hover:bg-white/20 rounded-2xl transition-all active:scale-90"
            >
              <Phone size={20} />
            </button>
            <button className="p-3 hover:bg-white/20 rounded-2xl transition-all active:scale-90">
              <Video size={20} />
            </button>
            <button onClick={onClose} className="p-3 hover:bg-white/20 rounded-2xl transition-all active:scale-90">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#f8f9fd] custom-scrollbar">
          {messages.map((msg, idx) => {
            const isMine = msg.senderId === currentUser.id;
            return (
              <div key={msg.id || idx} className={`flex ${isMine ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                <div className={`max-w-[75%] flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                  <div className={`px-5 py-3 rounded-[1.5rem] shadow-sm text-sm font-medium leading-relaxed ${
                    isMine 
                      ? 'bg-gradient-to-br from-purple-600 to-blue-600 text-white rounded-tr-none' 
                      : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
                  }`}>
                    {msg.content}
                  </div>
                  <div className="flex items-center gap-1 mt-1.5 px-1">
                    <span className="text-[10px] text-gray-400 font-bold">
                      {new Date(msg.createdAt || msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isMine && (
                      msg.isRead ? <CheckCheck size={12} className="text-blue-500" /> : <Check size={12} className="text-gray-300" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-6 bg-white border-t border-gray-50">
          <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-[2rem] border border-gray-100 focus-within:border-purple-300 focus-within:ring-4 focus-within:ring-purple-50 transition-all">
            <button className="p-2.5 text-gray-400 hover:text-purple-500 transition-colors">
              <Paperclip size={20} />
            </button>
            <input 
              type="text"
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                sendTyping(e.target.value.length > 0, currentUser.name);
              }}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Type a message..."
              className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-bold text-gray-700 placeholder:text-gray-400"
            />
            <button className="p-2.5 text-gray-400 hover:text-purple-500 transition-colors">
              <Smile size={20} />
            </button>
            <button 
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || isSending}
              className="p-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full shadow-lg shadow-purple-200 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
            >
              <Send size={20} />
            </button>
          </div>
        </div>

        {/* Call Overlay */}
        {(callState.isCalling || callState.isReceivingCall || callState.isInCall) && (
          <div className="absolute inset-0 z-[60] bg-gradient-to-br from-purple-900/95 via-blue-900/95 to-black/95 backdrop-blur-xl flex flex-col items-center justify-center text-white p-8 animate-in fade-in duration-500">
            <div className="relative mb-8">
              <div className="w-32 h-32 rounded-[3rem] overflow-hidden border-4 border-white/20 shadow-2xl animate-pulse">
                <Image 
                  src={getAvatarUrl(callState.isReceivingCall ? callState.callerAvatar : recipient.avatar)} 
                  alt="Caller" 
                  fill 
                  className="object-cover" 
                  unoptimized 
                />
              </div>
              <div className="absolute -bottom-2 -right-2 bg-emerald-500 p-3 rounded-2xl shadow-xl">
                <Phone size={24} className="animate-bounce" />
              </div>
            </div>
            
            <h2 className="text-3xl font-black mb-2 tracking-tight">
              {callState.isReceivingCall ? callState.callerName : recipient.name}
            </h2>
            <p className="text-purple-200 font-bold mb-12 tracking-widest uppercase text-sm">
              {callState.isInCall ? formatDuration(callState.duration) : 
               callState.isReceivingCall ? 'Incoming Voice Call' : 'Calling...'}
            </p>

            <div className="flex items-center gap-8">
              {callState.isReceivingCall ? (
                <>
                  <button 
                    onClick={rejectCall}
                    className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center shadow-2xl shadow-red-500/40 hover:scale-110 active:scale-90 transition-all"
                  >
                    <X size={32} />
                  </button>
                  <button 
                    onClick={acceptCall}
                    className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center shadow-2xl shadow-emerald-500/40 hover:scale-110 active:scale-90 transition-all"
                  >
                    <Phone size={36} />
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={toggleMute}
                    className={`w-16 h-16 ${callState.isMuted ? 'bg-white/20' : 'bg-white/10'} rounded-full flex items-center justify-center hover:bg-white/30 transition-all`}
                  >
                    <Mic size={28} className={callState.isMuted ? 'text-red-400' : 'text-white'} />
                  </button>
                  <button 
                    onClick={endCall}
                    className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center shadow-2xl shadow-red-500/40 hover:scale-110 active:scale-90 transition-all"
                  >
                    <Phone size={36} className="rotate-[135deg]" />
                  </button>
                  <button className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/30 transition-all">
                    <MoreVertical size={28} />
                  </button>
                </>
              )}
            </div>
            <audio ref={remoteAudioRef} autoPlay className="hidden" />
          </div>
        )}
      </div>
    </div>
  );
}
