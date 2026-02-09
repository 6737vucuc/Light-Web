// Real-time Chat Updates using Pusher - Server Side Only
import Pusher from 'pusher';

// Lazy initialization of server-side Pusher instance
let pusherServerInstance: Pusher | null = null;

const getPusherServer = () => {
  if (!pusherServerInstance) {
    pusherServerInstance = new Pusher({
      appId: process.env.PUSHER_APP_ID || '',
      key: process.env.PUSHER_KEY || process.env.NEXT_PUBLIC_PUSHER_KEY || '',
      secret: process.env.PUSHER_SECRET || '',
      cluster: process.env.PUSHER_CLUSTER || process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us2',
      useTLS: true,
    });
  }
  return pusherServerInstance;
};

// Export getter instead of direct instance
export const pusherServer = {
  trigger: async (channel: string, event: string, data: any) => {
    const server = getPusherServer();
    return server.trigger(channel, event, data);
  }
};

// Re-export client-side functions for backward compatibility
export { getPusherClient } from './pusher-client';

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

  // Call Methods
  static async initiateCall(
    recipientId: number,
    data: { callerPeerId: string; callerName: string; callerAvatar: string | null }
  ): Promise<void> {
    try {
      await pusherServer.trigger(`user-${recipientId}`, ChatEvent.INCOMING_CALL, data);
    } catch (error) {
      console.error('Initiate call error:', error);
    }
  }

  static async rejectCall(recipientId: number): Promise<void> {
    try {
      await pusherServer.trigger(`user-${recipientId}`, ChatEvent.CALL_REJECTED, {});
    } catch (error) {
      console.error('Reject call error:', error);
    }
  }

  static async endCall(recipientId: number): Promise<void> {
    try {
      await pusherServer.trigger(`user-${recipientId}`, ChatEvent.CALL_ENDED, {});
    } catch (error) {
      console.error('End call error:', error);
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
