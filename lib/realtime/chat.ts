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
  PRESENCE_UPDATE = 'presence-update',
  USER_JOINED = 'user-joined',
  USER_LEFT = 'user-left',
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
  replyTo?: {
    id: number;
    content: string;
    userName: string;
  } | null;
}

export interface TypingIndicator {
  userId: number | string;
  userName: string;
  isTyping: boolean;
}

export interface OnlineStatus {
  userId: number | string;
  isOnline: boolean;
  lastSeen?: Date;
}

export interface PresenceUser {
  userId: number | string;
  userName: string;
  avatar?: string;
  status: 'online' | 'away' | 'offline';
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

  // Send new group message event
  static async sendGroupMessage(
    groupId: number | string,
    message: any
  ): Promise<void> {
    try {
      const channelId = this.getGroupChannelName(groupId);
      const channel = this.getChannel(channelId);
      await channel.send({
        type: 'broadcast',
        event: ChatEvent.NEW_MESSAGE,
        payload: message,
      });
    } catch (error) {
      console.error('Send group message error:', error);
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

  // Send presence update (user online/offline)
  static async sendPresenceUpdate(
    channelId: string,
    user: PresenceUser
  ): Promise<void> {
    try {
      const channel = this.getChannel(channelId);
      await channel.send({
        type: 'broadcast',
        event: ChatEvent.PRESENCE_UPDATE,
        payload: user,
      });
    } catch (error) {
      console.error('Presence update error:', error);
    }
  }

  // Broadcast user joined event
  static async broadcastUserJoined(
    channelId: string,
    user: PresenceUser
  ): Promise<void> {
    try {
      const channel = this.getChannel(channelId);
      await channel.send({
        type: 'broadcast',
        event: ChatEvent.USER_JOINED,
        payload: user,
      });
    } catch (error) {
      console.error('User joined broadcast error:', error);
    }
  }

  // Broadcast user left event
  static async broadcastUserLeft(
    channelId: string,
    userId: number | string
  ): Promise<void> {
    try {
      const channel = this.getChannel(channelId);
      await channel.send({
        type: 'broadcast',
        event: ChatEvent.USER_LEFT,
        payload: { userId },
      });
    } catch (error) {
      console.error('User left broadcast error:', error);
    }
  }

  // Get channel name for private chat
  static getPrivateChannelName(user1Id: number | string, user2Id: number | string): string {
    const [id1, id2] = [user1Id, user2Id].sort((a, b) => String(a).localeCompare(String(b)));
    return `private-chat-${id1}-${id2}`;
  }

  // Get channel name for group chat
  static getGroupChannelName(groupId: number | string): string {
    return `group-${groupId}`;
  }

  // Get presence channel name
  static getPresenceChannelName(groupId: number | string): string {
    return `presence-group-${groupId}`;
  }
}
