'use client';

import { supabase } from './client';
import { RealtimeChannel } from '@supabase/supabase-js';

// Message event types
export interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  content: string | null;
  message_type: string;
  media_url: string | null;
  is_encrypted: boolean;
  is_edited: boolean;
  is_deleted: boolean;
  reply_to_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface TypingIndicator {
  conversation_id: number;
  user_id: number;
  is_typing: boolean;
  updated_at: string;
}

export interface ConversationUpdate {
  id: number;
  last_message_at: string;
  updated_at: string;
}

// Subscribe to messages in a conversation
export const subscribeToMessages = (
  conversationId: number,
  onMessage: (message: Message) => void,
  onUpdate: (message: Message) => void,
  onDelete: (messageId: number) => void
): RealtimeChannel => {
  const channel = supabase
    .channel(`conversation:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        onMessage(payload.new as Message);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        const message = payload.new as Message;
        if (message.is_deleted) {
          onDelete(message.id);
        } else {
          onUpdate(message);
        }
      }
    )
    .subscribe();

  return channel;
};

// Subscribe to typing indicators
export const subscribeToTyping = (
  conversationId: number,
  onTyping: (indicator: TypingIndicator) => void
): RealtimeChannel => {
  const channel = supabase
    .channel(`typing:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'typing_indicators',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        onTyping(payload.new as TypingIndicator);
      }
    )
    .subscribe();

  return channel;
};

// Subscribe to conversation updates (last message, read receipts, etc.)
export const subscribeToConversation = (
  conversationId: number,
  onUpdate: (conversation: ConversationUpdate) => void
): RealtimeChannel => {
  const channel = supabase
    .channel(`conv_update:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'conversations',
        filter: `id=eq.${conversationId}`,
      },
      (payload) => {
        onUpdate(payload.new as ConversationUpdate);
      }
    )
    .subscribe();

  return channel;
};

// Subscribe to all conversations for a user
export const subscribeToUserConversations = (
  userId: number,
  onNewMessage: (conversationId: number) => void,
  onConversationUpdate: (conversationId: number) => void
): RealtimeChannel => {
  const channel = supabase
    .channel(`user_conversations:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      },
      (payload) => {
        const message = payload.new as Message;
        // Only notify if the user is in this conversation and not the sender
        if (message.sender_id !== userId) {
          onNewMessage(message.conversation_id);
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'conversations',
      },
      (payload) => {
        const conversation = payload.new as ConversationUpdate;
        onConversationUpdate(conversation.id);
      }
    )
    .subscribe();

  return channel;
};

// Update typing indicator
export const updateTypingIndicator = async (
  conversationId: number,
  userId: number,
  isTyping: boolean
) => {
  const { error } = await supabase
    .from('typing_indicators')
    .upsert({
      conversation_id: conversationId,
      user_id: userId,
      is_typing: isTyping,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'conversation_id,user_id'
    });

  if (error) {
    console.error('Error updating typing indicator:', error);
  }
};

// Update read receipt
export const markMessageAsRead = async (messageId: number, userId: number) => {
  const { error } = await supabase
    .from('message_read_receipts')
    .insert({
      message_id: messageId,
      user_id: userId,
      read_at: new Date().toISOString(),
    });

  if (error && !error.message.includes('duplicate')) {
    console.error('Error marking message as read:', error);
  }
};

// Unsubscribe from channel
export const unsubscribeFromChannel = (channel: RealtimeChannel) => {
  supabase.removeChannel(channel);
};
