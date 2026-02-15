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
        const normalizedMsg = {
          id: payload.id,
          senderId: payload.senderId || payload.user_id || payload.sender_id,
          recipientId: payload.recipientId || payload.recipient_id,
          content: payload.content,
          createdAt: payload.createdAt || payload.created_at || payload.timestamp,
          messageType: payload.messageType || payload.message_type || 'text',
          isRead: payload.isRead || payload.is_read || false
        };

        setMessages((prev) => {
          if (prev.some(m => m.id === normalizedMsg.id)) return prev;
          
          const isRelevant = 
            (String(normalizedMsg.senderId) === String(currentUserId) && String(normalizedMsg.recipientId) === String(recipientId)) ||
            (String(normalizedMsg.senderId) === String(recipientId) && String(normalizedMsg.recipientId) === String(currentUserId));
            
          if (!isRelevant) return prev;
          return [...prev, normalizedMsg];
        });
      })
      // Absolute fallback: Listen to Postgres changes directly
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'direct_messages',
        filter: `recipient_id=eq.${currentUserId}` 
      }, (payload) => {
        const newMsg = payload.new;
        if (String(newMsg.sender_id) !== String(recipientId)) return;

        const normalizedMsg = {
          id: newMsg.id,
          senderId: newMsg.sender_id,
          recipientId: newMsg.recipient_id,
          content: newMsg.content,
          createdAt: newMsg.created_at,
          messageType: newMsg.message_type,
          isRead: newMsg.is_read
        };

        setMessages((prev) => {
          if (prev.some(m => m.id === normalizedMsg.id)) return prev;
          return [...prev, normalizedMsg];
        });
      })
      .on('broadcast', { event: ChatEvent.TYPING }, ({ payload }) => {
        const payloadUserId = payload.userId || payload.user_id;
        if (String(payloadUserId) === String(recipientId)) {
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
