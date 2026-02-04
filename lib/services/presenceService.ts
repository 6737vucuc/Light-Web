import { db } from '@/lib/db';
import { eq, and, sql } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';
import { getSupabaseAdmin } from '@/lib/supabase/client';

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
      await db.insert(schema.memberPresence).values({
        groupId: groupId,
        userId: userId,
        isOnline: isOnline,
        lastSeen: new Date(),
        sessionId: sessionId,
      }).onConflictDoUpdate({
        target: [
          schema.memberPresence.groupId,
          schema.memberPresence.userId,
          schema.memberPresence.sessionId,
        ],
        set: {
          isOnline: isOnline,
          lastSeen: new Date(),
        },
      });

      // Broadcast presence update via Supabase Realtime
      try {
        const supabaseAdmin = getSupabaseAdmin();
        const channel = supabaseAdmin.channel(`group-${groupId}`);
        await channel.send({
          type: 'broadcast',
          event: 'presence-update',
          payload: {
            userId,
            isOnline,
            timestamp: new Date(),
          }
        });
      } catch (broadcastError) {
        console.error('Supabase Broadcast Error:', broadcastError);
      }
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
      const onlineMembers = await db.query.memberPresence.findMany({
        where: and(
          eq(schema.memberPresence.groupId, groupId),
          eq(schema.memberPresence.isOnline, true)
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
        userId: member.userId,
        user: member.user,
        lastSeen: member.lastSeen,
        sessionId: member.sessionId,
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
      const result = await db.query.memberPresence.findMany({
        where: and(
          eq(schema.memberPresence.groupId, groupId),
          eq(schema.memberPresence.isOnline, true)
        ),
        columns: {
          userId: true,
        },
      });

      // Count unique users (in case they have multiple sessions)
      const uniqueUsers = new Set(result.map(m => m.userId));
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
      const presence = await db.query.memberPresence.findFirst({
        where: and(
          eq(schema.memberPresence.userId, userId),
          eq(schema.memberPresence.groupId, groupId)
        ),
      });

      return presence?.lastSeen || null;
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
      await db.delete(schema.memberPresence).where(
        and(
          eq(schema.memberPresence.groupId, groupId),
          eq(schema.memberPresence.userId, userId),
          eq(schema.memberPresence.sessionId, sessionId)
        )
      );

      // Broadcast offline status via Supabase Realtime
      try {
        const supabaseAdmin = getSupabaseAdmin();
        const channel = supabaseAdmin.channel(`group-${groupId}`);
        await channel.send({
          type: 'broadcast',
          event: 'presence-update',
          payload: {
            userId,
            isOnline: false,
            timestamp: new Date(),
          }
        });
      } catch (broadcastError) {
        console.error('Supabase Broadcast Error:', broadcastError);
      }
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

      await db.delete(schema.memberPresence).where(
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

      const supabaseAdmin = getSupabaseAdmin();
      const channel = supabaseAdmin.channel(`group-${groupId}`);
      await channel.send({
        type: 'broadcast',
        event: 'members-online-update',
        payload: {
          groupId,
          userId,
          isOnline,
          totalOnline: onlineMembers.length,
          members: onlineMembers,
          timestamp: new Date(),
        }
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
      const totalMembers = await db.query.groupMembers.findMany({
        where: eq(schema.groupMembers.groupId, groupId),
        columns: { userId: true },
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
