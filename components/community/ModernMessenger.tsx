'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { ChatEvent, RealtimeChatService } from '@/lib/realtime/chat';
import { X, Send, Smile, Paperclip, CheckCheck, MessageSquare, Loader2 } from 'lucide-react';
import Image from 'next/image';

interface ModernMessengerProps {
  recipient: any;
  currentUser: any;
  onClose: () => void;
}

interface Message {
  id: number;
  senderId: number;
  recipientId: number;
  content: string;
  createdAt: string;
  messageType: string;
  isRead: boolean;
  isDeleted?: boolean;
}

export default function ModernMessenger({ recipient, currentUser, onClose }: ModernMessengerProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [recipientOnline, setRecipientOnline] = useState(false);
  const [recipientTyping, setRecipientTyping] = useState(false);
  const [recipientLastSeen, setRecipientLastSeen] = useState<Date | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);

  const currentUserId = currentUser?.id || currentUser?.userId;
  const recipientId = recipient?.id || recipient?.userId;

  // Load messages from DB on mount or recipient change
  useEffect(() => {
    fetchMessages();
  }, [recipientId]);

  // Scroll down on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Realtime subscription
  useEffect(() => {
    if (!currentUserId || !recipientId) return;

    const channelName = RealtimeChatService.getPrivateChannelName(currentUserId, recipientId);
    const channel = supabase.channel(channelName, { config: { broadcast: { self: true } } });

    channel
      .on('broadcast', { event: ChatEvent.NEW_MESSAGE }, ({ payload }) => {
        setMessages(prev => [...prev, payload]);
      })
      .on('broadcast', { event: ChatEvent.ONLINE_STATUS }, ({ payload }) => {
        if (payload.userId === recipientId) {
          setRecipientOnline(payload.isOnline);
          if (!payload.isOnline) setRecipientLastSeen(new Date());
        }
      })
      .on('broadcast', { event: ChatEvent.TYPING_STATUS }, ({ payload }) => {
        if (payload.userId === recipientId) setRecipientTyping(payload.isTyping);
      })
      .subscribe()
      .then(() => {
        channel.send({
          type: 'broadcast',
          event: ChatEvent.ONLINE_STATUS,
          payload: { userId: currentUserId, isOnline: true },
        });
      });

    return () => {
      channel.send({
        type: 'broadcast',
        event: ChatEvent.ONLINE_STATUS,
        payload: { userId: currentUserId, isOnline: false },
      });
      supabase.removeChannel(channel);
    };
  }, [currentUserId, recipientId]);

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/chat/messages/${recipientId}?currentUserId=${currentUserId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  const sendMessage = async () => {
    if (!newMessage.trim() || isSending) return;
    setIsSending(true);

    const content = newMessage.trim();
    setNewMessage('');

    const tempMsg: Message = {
      id: Date.now(),
      senderId: currentUserId,
      recipientId,
      content,
      createdAt: new Date().toISOString(),
      messageType: 'text',
      isRead: false,
    };
    setMessages(prev => [...prev, tempMsg]);

    try {
      const res = await fetch('/api/chat/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId, content, messageType: 'text' }),
      });
      if (!res.ok) throw new Error('Failed to send');
    } catch (err) {
      console.error(err);
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
      setNewMessage(content);
    } finally {
      setIsSending(false);
      scrollToBottom();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
    sendTyping(true);
  };

  const sendTyping = (isTyping: boolean) => {
    if (!currentUserId || !recipientId) return;
    supabase.channel(RealtimeChatService.getPrivateChannelName(currentUserId, recipientId))
      .send({ type: 'broadcast', event: ChatEvent.TYPING_STATUS, payload: { userId: currentUserId, isTyping } });
  };

  const deleteMessageForBoth = async (messageId: number) => {
    try {
      await fetch('/api/chat/messages/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId }),
      });
      setMessages(prev => prev.filter(m => m.id !== messageId));
    } catch (err) {
      console.error(err);
    }
  };

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-3 border-b bg-gray-100">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-full overflow-hidden">
            {recipient.avatar ? (
              <Image src={recipient.avatar} alt={recipient.name} fill className="object-cover" />
            ) : (
              <div className="bg-purple-500 text-white flex items-center justify-center">
                {recipient.name.charAt(0)}
              </div>
            )}
            <span
              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-gray-100 ${
                recipientOnline ? 'bg-green-500' : 'bg-gray-400'
              }`}
            />
          </div>
          <div>
            <div className="font-bold">{recipient.name}</div>
            <div className="text-xs">
              {recipientTyping
                ? 'Typing...'
                : recipientOnline
                ? 'Online'
                : recipientLastSeen
                ? `Last seen ${new Date(recipientLastSeen).toLocaleTimeString()}`
                : 'Offline'}
            </div>
          </div>
        </div>
        <button onClick={onClose}><X /></button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.map(msg => {
          const isMine = msg.senderId === currentUserId;
          return (
            <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
              <div className="relative">
                <div
                  className={`px-3 py-2 rounded-lg ${isMine ? 'bg-purple-600 text-white' : 'bg-gray-200'}`}
                >
                  <p>{msg.content}</p>
                  <div className="text-xs flex justify-end items-center gap-1 mt-1">
                    <span>{formatTime(msg.createdAt)}</span>
                    {isMine && <button onClick={() => deleteMessageForBoth(msg.id)} className="text-red-400">Delete</button>}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-2 flex gap-2 border-t bg-gray-100">
        <textarea
          value={newMessage}
          onChange={handleInputChange}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
          placeholder="Type your message..."
          className="flex-1 p-2 rounded-lg border"
        />
        <button
          onClick={sendMessage}
          disabled={!newMessage.trim() || isSending}
          className="px-3 rounded-lg bg-purple-600 text-white"
        >
          {isSending ? <Loader2 className="animate-spin" /> : <Send />}
        </button>
      </div>
    </div>
  );
}
