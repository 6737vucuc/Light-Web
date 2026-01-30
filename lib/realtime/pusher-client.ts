'use client';

import PusherClient from 'pusher-js';

let pusherInstance: PusherClient | null = null;

export const getPusherClient = () => {
  if (!pusherInstance) {
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY || process.env.NEXT_PUBLIC_PUSHER_APP_KEY || '';
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us2';
    
    if (key) {
      pusherInstance = new PusherClient(key, {
        cluster: cluster,
      });
    }
  }
  return pusherInstance;
};

// Real-time event types
export enum ChatEvent {
  NEW_MESSAGE = 'new-message',
  MESSAGE_DELETED = 'message-deleted',
  TYPING = 'typing',
  ONLINE_STATUS = 'online-status',
  MESSAGE_READ = 'message-read',
  MESSAGE_DELIVERED = 'message-delivered',
  PROFILE_UPDATED = 'profile-updated',
  INCOMING_CALL = 'incoming-call',
  CALL_REJECTED = 'call-rejected',
  CALL_ENDED = 'call-ended',
}

export interface ChatMessage {
  id: number;
  senderId: number;
  senderName: string;
  senderAvatar?: string;
  content: string;
  mediaUrl?: string;
  messageType?: string;
  encrypted?: boolean;
  timestamp: Date;
  isRead: boolean;
  isDelivered?: boolean;
  deliveredAt?: Date;
}

export interface TypingIndicator {
  userId: number;
  userName: string;
  isTyping: boolean;
}

export interface OnlineStatus {
  userId: number;
  isOnline: boolean;
  lastSeen?: Date;
}
