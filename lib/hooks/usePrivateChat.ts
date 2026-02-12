import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { ChatEvent, RealtimeChatService } from '@/lib/realtime/chat';

export function usePrivateChat(recipientId: number, currentUserId: number) {
  const [messages, setMessages] = useState<any[]>([]);
  const [recipientTyping, setRecipientTyping] = useState(false);
  const channelRef = useRef<any>(null);
  const typingTimeoutRef = useRef<any>(null);

  const channelId = RealtimeChatService.getPrivateChannelName(currentUserId, recipientId);

  useEffect(() => {
    if (!recipientId || !currentUserId) return;

    const channel = supabase.channel(channelId, {
      config: {
        broadcast: { self: true },
      },
    });

    channel
      .on('broadcast', { event: ChatEvent.NEW_MESSAGE }, ({ payload }) => {
        setMessages((prev) => {
          if (prev.some(m => m.id === payload.id)) return prev;
          return [...prev, payload];
        });
      })
      .on('broadcast', { event: ChatEvent.TYPING }, ({ payload }) => {
        if (payload.userId === recipientId) {
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
