import { pusherServer } from '@/lib/realtime/chat';
import { db } from '@/lib/db';
import { eq, and } from 'drizzle-orm';

/**
 * Real-time Presence Service
 * Handles online/offline status tracking for group members
 */

export class PresenceService {
  /**
   * Update user presence in a group
   */
  static async updatePresence(
    groupId: number,
    userId: number,
    isOnline: boolean,
    sessionId: string
  ) {
    try {
      // Update database
      await db.insert(db.schema.member_presence).values({
        group_id: groupId,
        user_id: userId,
        is_online: isOnline,
        last_seen: new Date(),
        session_id: sessionId,
      }).onConflictDoUpdate({
        target: [
          db.schema.member_presence.group_id,
          db.schema.member_presence.user_id,
          db.schema.member_presence.session_id,
        ],
        set: {
          is_online: isOnline,
          last_seen: new Date(),
        },
      });

      // Broadcast presence update via Pusher
      await pusherServer.trigger(`group-${groupId}`, 'presence-update', {
        userId,
        isOnline,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Error updating presence:', error);
      throw error;
    }
  }

  /**
   * Get all online members in a group with their details
   */
  static async getOnlineMembers(groupId: number) {
    try {
      const onlineMembers = await db.query.member_presence.findMany({
        where: and(
          eq(db.schema.member_presence.group_id, groupId),
          eq(db.schema.member_presence.is_online, true)
        ),
        with: {
          user: {
            columns: {
              id: true,
              name: true,
              avatar: true,
              email: true,
            },
          },
        },
      });

      return onlineMembers.map(member => ({
        userId: member.user_id,
        user: member.user,
        lastSeen: member.last_seen,
        sessionId: member.session_id,
      }));
    } catch (error) {
      console.error('Error getting online members:', error);
      throw error;
    }
  }

  /**
   * Get online members count for a group
   */
  static async getOnlineMembersCount(groupId: number): Promise<number> {
    try {
      const result = await db.query.member_presence.findMany({
        where: and(
          eq(db.schema.member_presence.group_id, groupId),
          eq(db.schema.member_presence.is_online, true)
        ),
        columns: {
          user_id: true,
        },
      });

      // Count unique users (in case they have multiple sessions)
      const uniqueUsers = new Set(result.map(m => m.user_id));
      return uniqueUsers.size;
    } catch (error) {
      console.error('Error getting online members count:', error);
      throw error;
    }
  }

  /**
   * Get user's last seen time
   */
  static async getLastSeen(userId: number, groupId: number) {
    try {
      const presence = await db.query.member_presence.findFirst({
        where: and(
          eq(db.schema.member_presence.user_id, userId),
          eq(db.schema.member_presence.group_id, groupId)
        ),
      });

      return presence?.last_seen || null;
    } catch (error) {
      console.error('Error getting last seen:', error);
      throw error;
    }
  }

  /**
   * Mark user as offline
   */
  static async markOffline(
    groupId: number,
    userId: number,
    sessionId: string
  ) {
    try {
      // Delete the session
      await db.delete(db.schema.member_presence).where(
        and(
          eq(db.schema.member_presence.group_id, groupId),
          eq(db.schema.member_presence.user_id, userId),
          eq(db.schema.member_presence.session_id, sessionId)
        )
      );

      // Broadcast offline status
      await pusherServer.trigger(`group-${groupId}`, 'presence-update', {
        userId,
        isOnline: false,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Error marking offline:', error);
      throw error;
    }
  }

  /**
   * Clean up stale sessions (older than 30 minutes)
   */
  static async cleanupStaleSessions() {
    try {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

      await db.delete(db.schema.member_presence).where(
        sql`last_seen < ${thirtyMinutesAgo}`
      );
    } catch (error) {
      console.error('Error cleaning up stale sessions:', error);
      throw error;
    }
  }

  /**
   * Broadcast presence changes to all group members
   */
  static async broadcastPresenceUpdate(groupId: number, userId: number, isOnline: boolean) {
    try {
      const onlineMembers = await this.getOnlineMembers(groupId);

      await pusherServer.trigger(`group-${groupId}`, 'members-online-update', {
        groupId,
        userId,
        isOnline,
        totalOnline: onlineMembers.length,
        members: onlineMembers,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error('Error broadcasting presence update:', error);
      throw error;
    }
  }

  /**
   * Get presence statistics for a group
   */
  static async getPresenceStats(groupId: number) {
    try {
      const onlineMembers = await this.getOnlineMembers(groupId);
      const totalMembers = await db.query.group_members.findMany({
        where: eq(db.schema.group_members.group_id, groupId),
        columns: { user_id: true },
      });

      const uniqueOnlineUsers = new Set(onlineMembers.map(m => m.userId));

      return {
        totalMembers: totalMembers.length,
        onlineMembers: uniqueOnlineUsers.size,
        offlineMembers: totalMembers.length - uniqueOnlineUsers.size,
        onlinePercentage: totalMembers.length > 0 
          ? Math.round((uniqueOnlineUsers.size / totalMembers.length) * 100)
          : 0,
        members: onlineMembers,
      };
    } catch (error) {
      console.error('Error getting presence stats:', error);
      throw error;
    }
  }
}

// Import sql for cleanup function
import { sql } from 'drizzle-orm';
