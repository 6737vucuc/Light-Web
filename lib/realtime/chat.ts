import { getSupabaseAdmin } from '@/lib/supabase/client';

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
  CALL_ACCEPTED = 'call-accepted',
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

// Real-time chat service using Supabase Realtime
export class RealtimeChatService {
  private static getChannel(channelId: string) {
    const supabase = getSupabaseAdmin();
    return supabase.channel(channelId);
  }

  // Send new message event
  static async sendMessage(
    channelId: string,
    message: ChatMessage
  ): Promise<void> {
    try {
      const channel = this.getChannel(channelId);
      await channel.send({
        type: 'broadcast',
        event: ChatEvent.NEW_MESSAGE,
        payload: message,
      });
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
      const channel = this.getChannel(channelId);
      await channel.send({
        type: 'broadcast',
        event: ChatEvent.MESSAGE_DELETED,
        payload: {
          messageId,
          deletedAt: new Date(),
        },
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
      const channel = this.getChannel(channelId);
      await channel.send({
        type: 'broadcast',
        event: ChatEvent.TYPING,
        payload: indicator,
      });
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
      const channel = this.getChannel(`user-${userId}`);
      await channel.send({
        type: 'broadcast',
        event: ChatEvent.ONLINE_STATUS,
        payload: status,
      });
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
      const channel = this.getChannel(channelId);
      await channel.send({
        type: 'broadcast',
        event: ChatEvent.MESSAGE_READ,
        payload: {
          messageId,
          userId,
          readAt: new Date(),
        },
      });
    } catch (error) {
      console.error('Mark as read error:', error);
    }
  }

  // Call Methods
  static async initiateCall(
    recipientId: number,
    data: { 
      callerId: number;
      callerPeerId: string; 
      callerName: string; 
      callerAvatar: string | null;
      callType: 'voice' | 'video';
    }
  ): Promise<void> {
    try {
      const channel = this.getChannel(`user-${recipientId}`);
      await channel.send({
        type: 'broadcast',
        event: ChatEvent.INCOMING_CALL,
        payload: data,
      });
    } catch (error) {
      console.error('Initiate call error:', error);
    }
  }

  static async acceptCall(
    callerId: number, 
    data: { acceptorId: number; receiverPeerId: string }
  ): Promise<void> {
    try {
      const channel = this.getChannel(`user-${callerId}`);
      await channel.send({
        type: 'broadcast',
        event: ChatEvent.CALL_ACCEPTED,
        payload: data,
      });
    } catch (error) {
      console.error('Accept call error:', error);
    }
  }

  static async rejectCall(callerId: number): Promise<void> {
    try {
      const channel = this.getChannel(`user-${callerId}`);
      await channel.send({
        type: 'broadcast',
        event: ChatEvent.CALL_REJECTED,
        payload: {},
      });
    } catch (error) {
      console.error('Reject call error:', error);
    }
  }

  static async endCall(recipientId: number, endedBy: number): Promise<void> {
    try {
      const channel = this.getChannel(`user-${recipientId}`);
      await channel.send({
        type: 'broadcast',
        event: ChatEvent.CALL_ENDED,
        payload: { endedBy },
      });
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
    return `group-${groupId}`;
  }
}
