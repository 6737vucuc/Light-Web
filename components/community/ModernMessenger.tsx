'use client';

import { useState, useEffect, useRef } from 'react';
import { usePrivateChat } from '@/lib/hooks/usePrivateChat';
import { 
  X, Send, Image as ImageIcon, 
  Smile, Paperclip, CheckCheck, MessageSquare,
  User as UserIcon, MoreHorizontal
} from 'lucide-react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase/client';
import { ChatEvent, RealtimeChatService } from '@/lib/realtime/chat';
import EmojiPicker, { Theme } from 'emoji-picker-react';

interface ModernMessengerProps {
  recipient: any;
  currentUser: any;
  onClose: () => void;
}

export default function ModernMessenger({ recipient, currentUser, onClose }: ModernMessengerProps) {
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);
  
  const currentUserId = currentUser?.id || currentUser?.userId;
  const recipientId = recipient?.id || recipient?.userId;
  
  const { messages: realtimeMessages, setMessages, recipientTyping, sendTyping: sendTypingStatus } = usePrivateChat(currentUserId, recipientId);

  useEffect(() => {
    loadMessages();
  }, [recipientId]);

  useEffect(() => {
    if (realtimeMessages.length > 0) {
      setTimeout(scrollToBottom, 50);
    }
  }, [realtimeMessages]);

  const loadMessages = async () => {
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

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    const content = newMessage.trim();
    setNewMessage('');
    sendTypingStatus(false);

    try {
      const res = await fetch('/api/chat/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId: recipientId,
          content: content,
          messageType: 'text'
        }),
      });

      if (!res.ok) {
        setNewMessage(content);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(content);
    } finally {
      setIsSending(false);
    }
  };



  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
    
    if (!isTyping) {
      setIsTyping(true);
      sendTypingStatus(true);
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      sendTypingStatus(false);
    }, 3000);
  };

  const getAvatarUrl = (avatar?: string | null) => {
    if (!avatar) return '/default-avatar.png';
    if (avatar.startsWith('data:') || avatar.startsWith('http')) return avatar;
    return `https://neon-image-bucket.s3.us-east-1.amazonaws.com/${avatar}`;
  };

  return (
    <div className="flex flex-col h-full bg-[#f8f9fa] animate-in fade-in duration-500">
      {/* Header */}
      <div className="px-6 py-4 bg-white border-b border-gray-100 flex items-center justify-between shadow-sm relative z-10">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-purple-50 shadow-md">
              {recipient.avatar ? (
                <Image src={getAvatarUrl(recipient.avatar)} alt={recipient.name} fill className="object-cover" unoptimized />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-indigo-500 text-white text-xl font-black">
                  {recipient.name?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></div>
          </div>
          <div>
            <h3 className="font-black text-gray-900 leading-none mb-1">{recipient.name}</h3>
            <div className="flex items-center gap-1.5">
              {recipientTyping ? (
                <p className="text-[10px] text-purple-600 font-black animate-pulse uppercase tracking-widest">يكتب الآن...</p>
              ) : (
                <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest flex items-center gap-1">
                  <span className="w-1 h-1 bg-emerald-500 rounded-full"></span> متصل الآن
                </p>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><X size={20} /></button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        {realtimeMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-30">
            <div className="w-20 h-20 bg-gray-200 rounded-[2rem] flex items-center justify-center mb-4">
              <MessageSquare size={40} className="text-gray-400" />
            </div>
            <p className="font-black text-gray-500">ابدأ محادثة جميلة مع {recipient.name}</p>
          </div>
        ) : (
          realtimeMessages.map((msg, idx) => {
            const isMine = msg.senderId === currentUserId;
            return (
              <div key={msg.id || idx} className={`flex ${isMine ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                <div className={`max-w-[80%] flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                  <div className={`relative px-4 py-3 shadow-sm ${
                    isMine 
                      ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-[1.5rem] rounded-tr-none' 
                      : 'bg-white text-gray-800 border border-gray-100 rounded-[1.5rem] rounded-tl-none'
                  }`}>
                    <p className="text-sm md:text-base leading-relaxed break-words">{msg.content}</p>
                    <div className={`flex items-center gap-1.5 mt-1.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <span className="text-[9px] font-bold opacity-60">
                        {new Date(msg.createdAt || msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {isMine && <CheckCheck size={12} className="opacity-60" />}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-6 bg-white border-t border-gray-100">
        <form onSubmit={handleSendMessage} className="flex items-end gap-3">
          <div className="flex-1 bg-gray-50 rounded-[1.5rem] border border-gray-200 focus-within:border-purple-400 focus-within:ring-1 focus-within:ring-purple-400 transition-all flex flex-col overflow-hidden">
            <textarea
              value={newMessage}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="اكتب رسالتك هنا..."
              className="w-full bg-transparent border-none focus:ring-0 p-4 text-sm md:text-base resize-none max-h-32 min-h-[56px]"
              rows={1}
            />
            <div className="flex items-center justify-between px-3 pb-3">
              <div className="flex items-center gap-1">
                <button type="button" className="p-2 text-gray-400 hover:text-purple-600 transition-colors"><Smile size={20} /></button>
                <button type="button" className="p-2 text-gray-400 hover:text-purple-600 transition-colors"><Paperclip size={20} /></button>
                <button type="button" className="p-2 text-gray-400 hover:text-purple-600 transition-colors"><ImageIcon size={20} /></button>
              </div>
              <button type="button" className="p-2 text-gray-400 hover:text-purple-600 transition-colors"><MoreHorizontal size={20} /></button>
            </div>
          </div>
          <button
            type="submit"
            disabled={!newMessage.trim() || isSending}
            className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
              newMessage.trim() && !isSending
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-200 scale-100 active:scale-90'
                : 'bg-gray-100 text-gray-400 scale-95'
            }`}
          >
            {isSending ? (
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send size={24} className={newMessage.trim() ? 'translate-x-0.5' : ''} />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
