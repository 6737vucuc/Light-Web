import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { ChatEvent, RealtimeChatService } from '@/lib/realtime/chat';

export function usePrivateChat(recipientId: number, currentUserId: number) {
  const [messages, setMessages] = useState<any[]>([]);
  const [recipientTyping, setRecipientTyping] = useState(false);
  const channelRef = useRef<any>(null);
  const typingTimeoutRef = useRef<any>(null);

  const channelId = (currentUserId && recipientId) ? RealtimeChatService.getPrivateChannelName(currentUserId, recipientId) : '';

  useEffect(() => {
    if (!recipientId || !currentUserId || !channelId) return;

    const channel = supabase.channel(channelId, {
      config: {
        broadcast: { self: true },
      },
    });

    channel
      .on('broadcast', { event: ChatEvent.NEW_MESSAGE }, ({ payload }) => {
        setMessages((prev) => {
          // 1. Check if real message already exists
          if (prev.some(m => !String(m.id).startsWith('temp-') && String(m.id) === String(payload.id))) return prev;
          
          // 2. Look for matching optimistic message
          const tempIndex = prev.findIndex(m => {
            const isTemp = String(m.id).startsWith('temp-') || m.tempId;
            if (!isTemp) return false;
            if (payload.clientId && (String(m.id) === String(payload.clientId) || String(m.tempId) === String(payload.clientId))) return true;
            return m.content === payload.content && String(m.senderId) === String(payload.senderId);
          });
          
          if (tempIndex !== -1) {
            const newMessages = [...prev];
            newMessages[tempIndex] = payload;
            return newMessages;
          }
          
          return [...prev, payload];
        });
      })
      .on('broadcast', { event: ChatEvent.TYPING }, ({ payload }) => {
        if (String(payload.userId) === String(recipientId)) {
          setRecipientTyping(payload.isTyping);
          
          if (payload.isTyping && typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }
          
          if (payload.isTyping) {
            typingTimeoutRef.current = setTimeout(() => {
              setRecipientTyping(false);
            }, 3000);
          }
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [channelId, recipientId, currentUserId]);

  const sendTyping = useCallback((isTyping: boolean) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: ChatEvent.TYPING,
        payload: { userId: currentUserId, isTyping },
      });
    }
  }, [currentUserId]);

  return {
    messages,
    setMessages,
    recipientTyping,
    sendTyping,
  };
}
