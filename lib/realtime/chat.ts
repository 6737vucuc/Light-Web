// Real-time Chat Updates using Pusher
import Pusher from 'pusher';
import PusherClient from 'pusher-js';

// Server-side Pusher instance
export const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID || '',
  key: process.env.NEXT_PUBLIC_PUSHER_KEY || '',
  secret: process.env.PUSHER_SECRET || '',
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us2',
  useTLS: true,
});

// Client-side Pusher instance
export const getPusherClient = () => {
  return new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY || '', {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us2',
  });
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
}

export interface ChatMessage {
  id: number;
  senderId: number;
  senderName: string;
  senderAvatar?: string;
  content: string;
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

// Real-time chat service
export class RealtimeChatService {
  // Send new message event
  static async sendMessage(
    channelId: string,
    message: ChatMessage
  ): Promise<void> {
    try {
      await pusherServer.trigger(channelId, ChatEvent.NEW_MESSAGE, message);
    } catch (error) {
      console.error('Send message error:', error);
    }
  }

  // Send message deleted event
  static async deleteMessage(
    channelId: string,
    messageId: number
  ): Promise<void> {
    try {
      await pusherServer.trigger(channelId, ChatEvent.MESSAGE_DELETED, {
        messageId,
        deletedAt: new Date(),
      });
    } catch (error) {
      console.error('Delete message error:', error);
    }
  }

  // Send typing indicator
  static async sendTypingIndicator(
    channelId: string,
    indicator: TypingIndicator
  ): Promise<void> {
    try {
      await pusherServer.trigger(channelId, ChatEvent.TYPING, indicator);
    } catch (error) {
      console.error('Typing indicator error:', error);
    }
  }

  // Update online status
  static async updateOnlineStatus(
    userId: number,
    status: OnlineStatus
  ): Promise<void> {
    try {
      await pusherServer.trigger(
        `presence-user-${userId}`,
        ChatEvent.ONLINE_STATUS,
        status
      );
    } catch (error) {
      console.error('Online status error:', error);
    }
  }

  // Mark message as read
  static async markAsRead(
    channelId: string,
    messageId: number,
    userId: number
  ): Promise<void> {
    try {
      await pusherServer.trigger(channelId, ChatEvent.MESSAGE_READ, {
        messageId,
        userId,
        readAt: new Date(),
      });
    } catch (error) {
      console.error('Mark as read error:', error);
    }
  }

  // Send read receipt
  static async sendReadReceipt(
    channelId: string,
    data: { messageId: number; readAt: Date }
  ): Promise<void> {
    try {
      await pusherServer.trigger(channelId, ChatEvent.MESSAGE_READ, data);
    } catch (error) {
      console.error('Send read receipt error:', error);
    }
  }

  // Send delivery receipt
  static async sendDeliveryReceipt(
    channelId: string,
    data: { messageId: number; deliveredAt: Date }
  ): Promise<void> {
    try {
      await pusherServer.trigger(channelId, ChatEvent.MESSAGE_DELIVERED, data);
    } catch (error) {
      console.error('Send delivery receipt error:', error);
    }
  }

  // Send profile update notification
  static async sendProfileUpdate(
    userId: number,
    data: { avatar?: string; name?: string; updatedAt: Date }
  ): Promise<void> {
    try {
      await pusherServer.trigger(
        `user-${userId}`,
        ChatEvent.PROFILE_UPDATED,
        data
      );
    } catch (error) {
      console.error('Send profile update error:', error);
    }
  }

  // Get channel name for private chat
  static getPrivateChannelName(user1Id: number, user2Id: number): string {
    const [id1, id2] = [user1Id, user2Id].sort((a, b) => a - b);
    return `private-chat-${id1}-${id2}`;
  }

  // Get channel name for group chat
  static getGroupChannelName(groupId: number): string {
    return `private-group-${groupId}`;
  }
}

// Client-side hooks for real-time updates
export const useRealtimeChat = (channelId: string) => {
  const pusher = getPusherClient();
  const channel = pusher.subscribe(channelId);

  const onNewMessage = (callback: (message: ChatMessage) => void) => {
    channel.bind(ChatEvent.NEW_MESSAGE, callback);
  };

  const onMessageDeleted = (callback: (data: { messageId: number }) => void) => {
    channel.bind(ChatEvent.MESSAGE_DELETED, callback);
  };

  const onTyping = (callback: (indicator: TypingIndicator) => void) => {
    channel.bind(ChatEvent.TYPING, callback);
  };

  const onOnlineStatus = (callback: (status: OnlineStatus) => void) => {
    channel.bind(ChatEvent.ONLINE_STATUS, callback);
  };

  const onMessageRead = (callback: (data: { messageId: number; userId: number }) => void) => {
    channel.bind(ChatEvent.MESSAGE_READ, callback);
  };

  const onMessageDelivered = (callback: (data: { messageId: number; deliveredAt: Date }) => void) => {
    channel.bind(ChatEvent.MESSAGE_DELIVERED, callback);
  };

  const cleanup = () => {
    channel.unbind_all();
    pusher.unsubscribe(channelId);
  };

  return {
    onNewMessage,
    onMessageDeleted,
    onTyping,
    onOnlineStatus,
    onMessageRead,
    onMessageDelivered,
    cleanup,
  };
};

// Presence channel for online users
export const usePresenceChannel = (userId: number) => {
  const pusher = getPusherClient();
  const channelName = `presence-user-${userId}`;
  const channel = pusher.subscribe(channelName);

  const onUserOnline = (callback: (user: any) => void) => {
    channel.bind('pusher:member_added', callback);
  };

  const onUserOffline = (callback: (user: any) => void) => {
    channel.bind('pusher:member_removed', callback);
  };

  const cleanup = () => {
    channel.unbind_all();
    pusher.unsubscribe(channelName);
  };

  return {
    onUserOnline,
    onUserOffline,
    cleanup,
  };
};
