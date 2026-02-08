import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { ChatEvent, ChatMessage, TypingIndicator } from '@/lib/realtime/chat';

export function useRealtimeChat(channelId: string, currentUserId: number) {
  const [messages, setMessages] = useState<any[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([]);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    const channel = supabase.channel(channelId, {
      config: {
        broadcast: { self: false },
      },
    });

    channel
      .on('broadcast', { event: ChatEvent.NEW_MESSAGE }, ({ payload }) => {
        setMessages((prev) => [...prev, payload]);
      })
      .on('broadcast', { event: ChatEvent.MESSAGE_DELETED }, ({ payload }) => {
        setMessages((prev) => prev.filter((m) => m.id !== payload.messageId));
      })
      .on('broadcast', { event: ChatEvent.TYPING }, ({ payload }) => {
        if (payload.userId !== currentUserId) {
          setTypingUsers((prev) => {
            const filtered = prev.filter((u) => u.userId !== payload.userId);
            if (payload.isTyping) {
              return [...filtered, payload];
            }
            return filtered;
          });
        }
      })
      .on('broadcast', { event: ChatEvent.MESSAGE_READ }, ({ payload }) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === payload.messageId ? { ...m, isRead: true, readAt: payload.readAt } : m
          )
        );
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId, currentUserId]);

  const sendTyping = useCallback((isTyping: boolean, userName: string) => {
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: ChatEvent.TYPING,
        payload: { userId: currentUserId, userName, isTyping },
      });
    }
  }, [currentUserId]);

  return {
    messages,
    setMessages,
    typingUsers,
    sendTyping,
  };
}
