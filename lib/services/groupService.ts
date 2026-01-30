import { db } from '@/lib/db';
import { eq, and, desc, sql } from 'drizzle-orm';

/**
 * Advanced Group Chat Service
 * Handles all group-related operations including messaging, presence, and moderation
 */

// ============================================
// Message Management
// ============================================

export async function pinMessage(messageId: number, groupId: number, userId: number) {
  try {
    // Check if user is admin or moderator
    const member = await db.query.group_members.findFirst({
      where: and(
        eq(db.schema.group_members.group_id, groupId),
        eq(db.schema.group_members.user_id, userId)
      ),
    });

    if (!member?.is_admin && !member?.is_moderator) {
      throw new Error('Only admins and moderators can pin messages');
    }

    // Pin the message
    const result = await db.insert(db.schema.pinned_messages).values({
      group_id: groupId,
      message_id: messageId,
      pinned_by: userId,
      pinned_at: new Date(),
    }).onConflictDoNothing();

    return result;
  } catch (error) {
    console.error('Error pinning message:', error);
    throw error;
  }
}

export async function unpinMessage(messageId: number, groupId: number, userId: number) {
  try {
    // Check if user is admin or moderator
    const member = await db.query.group_members.findFirst({
      where: and(
        eq(db.schema.group_members.group_id, groupId),
        eq(db.schema.group_members.user_id, userId)
      ),
    });

    if (!member?.is_admin && !member?.is_moderator) {
      throw new Error('Only admins and moderators can unpin messages');
    }

    // Unpin the message
    await db.delete(db.schema.pinned_messages).where(
      and(
        eq(db.schema.pinned_messages.group_id, groupId),
        eq(db.schema.pinned_messages.message_id, messageId)
      )
    );
  } catch (error) {
    console.error('Error unpinning message:', error);
    throw error;
  }
}

export async function getPinnedMessages(groupId: number) {
  try {
    const pinned = await db.query.pinned_messages.findMany({
      where: eq(db.schema.pinned_messages.group_id, groupId),
      with: {
        message: {
          with: {
            user: true,
          },
        },
        pinnedBy: true,
      },
      orderBy: desc(db.schema.pinned_messages.pinned_at),
    });

    return pinned;
  } catch (error) {
    console.error('Error getting pinned messages:', error);
    throw error;
  }
}

// ============================================
// Starred Messages (Bookmarks)
// ============================================

export async function starMessage(messageId: number, userId: number) {
  try {
    const result = await db.insert(db.schema.starred_messages).values({
      user_id: userId,
      message_id: messageId,
      starred_at: new Date(),
    }).onConflictDoNothing();

    return result;
  } catch (error) {
    console.error('Error starring message:', error);
    throw error;
  }
}

export async function unstarMessage(messageId: number, userId: number) {
  try {
    await db.delete(db.schema.starred_messages).where(
      and(
        eq(db.schema.starred_messages.user_id, userId),
        eq(db.schema.starred_messages.message_id, messageId)
      )
    );
  } catch (error) {
    console.error('Error unstarring message:', error);
    throw error;
  }
}

export async function getStarredMessages(userId: number) {
  try {
    const starred = await db.query.starred_messages.findMany({
      where: eq(db.schema.starred_messages.user_id, userId),
      with: {
        message: {
          with: {
            user: true,
          },
        },
      },
      orderBy: desc(db.schema.starred_messages.starred_at),
    });

    return starred;
  } catch (error) {
    console.error('Error getting starred messages:', error);
    throw error;
  }
}

// ============================================
// Member Presence (Online Status)
// ============================================

export async function updateMemberPresence(groupId: number, userId: number, isOnline: boolean, sessionId: string) {
  try {
    const result = await db.insert(db.schema.member_presence).values({
      group_id: groupId,
      user_id: userId,
      is_online: isOnline,
      last_seen: new Date(),
      session_id: sessionId,
    }).onConflictDoUpdate({
      target: [db.schema.member_presence.group_id, db.schema.member_presence.user_id, db.schema.member_presence.session_id],
      set: {
        is_online: isOnline,
        last_seen: new Date(),
      },
    });

    return result;
  } catch (error) {
    console.error('Error updating member presence:', error);
    throw error;
  }
}

export async function getOnlineMembers(groupId: number) {
  try {
    const onlineMembers = await db.query.member_presence.findMany({
      where: and(
        eq(db.schema.member_presence.group_id, groupId),
        eq(db.schema.member_presence.is_online, true)
      ),
      with: {
        user: true,
      },
    });

    return onlineMembers;
  } catch (error) {
    console.error('Error getting online members:', error);
    throw error;
  }
}

export async function getOnlineMembersCount(groupId: number) {
  try {
    const result = await db.select({ count: sql`COUNT(*)` })
      .from(db.schema.member_presence)
      .where(and(
        eq(db.schema.member_presence.group_id, groupId),
        eq(db.schema.member_presence.is_online, true)
      ));

    return result[0]?.count || 0;
  } catch (error) {
    console.error('Error getting online members count:', error);
    throw error;
  }
}

// ============================================
// Message Search
// ============================================

export async function searchMessages(groupId: number, query: string, limit = 20) {
  try {
    const results = await db.query.group_messages.findMany({
      where: and(
        eq(db.schema.group_messages.group_id, groupId),
        sql`to_tsvector('english', content) @@ plainto_tsquery('english', ${query})`
      ),
      with: {
        user: true,
      },
      orderBy: desc(db.schema.group_messages.created_at),
      limit,
    });

    return results;
  } catch (error) {
    console.error('Error searching messages:', error);
    throw error;
  }
}

// ============================================
// Message Mentions
// ============================================

export async function addMentions(messageId: number, mentionedUserIds: number[]) {
  try {
    const mentions = mentionedUserIds.map(userId => ({
      message_id: messageId,
      mentioned_user_id: userId,
      created_at: new Date(),
    }));

    await db.insert(db.schema.message_mentions).values(mentions).onConflictDoNothing();
  } catch (error) {
    console.error('Error adding mentions:', error);
    throw error;
  }
}

export async function getMentions(userId: number, groupId: number) {
  try {
    const mentions = await db.query.message_mentions.findMany({
      where: eq(db.schema.message_mentions.mentioned_user_id, userId),
      with: {
        message: {
          where: eq(db.schema.group_messages.group_id, groupId),
          with: {
            user: true,
          },
        },
      },
      orderBy: desc(db.schema.message_mentions.created_at),
    });

    return mentions.filter(m => m.message);
  } catch (error) {
    console.error('Error getting mentions:', error);
    throw error;
  }
}

// ============================================
// Member Management
// ============================================

export async function promoteToAdmin(groupId: number, userId: number, promotedBy: number) {
  try {
    // Check if promoter is admin
    const promoter = await db.query.group_members.findFirst({
      where: and(
        eq(db.schema.group_members.group_id, groupId),
        eq(db.schema.group_members.user_id, promotedBy)
      ),
    });

    if (!promoter?.is_admin) {
      throw new Error('Only admins can promote members');
    }

    // Promote member
    await db.update(db.schema.group_members)
      .set({ is_admin: true })
      .where(and(
        eq(db.schema.group_members.group_id, groupId),
        eq(db.schema.group_members.user_id, userId)
      ));

    // Log activity
    await logGroupActivity(groupId, promotedBy, 'PROMOTE_ADMIN', { promoted_user_id: userId });
  } catch (error) {
    console.error('Error promoting to admin:', error);
    throw error;
  }
}

export async function muteUser(groupId: number, userId: number, mutedUntil: Date, mutedBy: number) {
  try {
    // Check if muter is admin or moderator
    const muter = await db.query.group_members.findFirst({
      where: and(
        eq(db.schema.group_members.group_id, groupId),
        eq(db.schema.group_members.user_id, mutedBy)
      ),
    });

    if (!muter?.is_admin && !muter?.is_moderator) {
      throw new Error('Only admins and moderators can mute members');
    }

    // Mute member
    await db.update(db.schema.group_members)
      .set({ muted_until: mutedUntil })
      .where(and(
        eq(db.schema.group_members.group_id, groupId),
        eq(db.schema.group_members.user_id, userId)
      ));

    // Log activity
    await logGroupActivity(groupId, mutedBy, 'MUTE_USER', { muted_user_id: userId, muted_until: mutedUntil });
  } catch (error) {
    console.error('Error muting user:', error);
    throw error;
  }
}

// ============================================
// Activity Logging
// ============================================

export async function logGroupActivity(groupId: number, userId: number | null, action: string, details?: any) {
  try {
    await db.insert(db.schema.group_activity_log).values({
      group_id: groupId,
      user_id: userId,
      action,
      details: details ? JSON.stringify(details) : null,
      created_at: new Date(),
    });
  } catch (error) {
    console.error('Error logging group activity:', error);
    throw error;
  }
}

export async function getGroupActivityLog(groupId: number, limit = 50) {
  try {
    const logs = await db.query.group_activity_log.findMany({
      where: eq(db.schema.group_activity_log.group_id, groupId),
      with: {
        user: true,
      },
      orderBy: desc(db.schema.group_activity_log.created_at),
      limit,
    });

    return logs;
  } catch (error) {
    console.error('Error getting activity log:', error);
    throw error;
  }
}

// ============================================
// Message Read Receipts
// ============================================

export async function markMessageAsRead(messageId: number, userId: number) {
  try {
    await db.insert(db.schema.group_message_read_receipts).values({
      message_id: messageId,
      user_id: userId,
      read_at: new Date(),
    }).onConflictDoNothing();
  } catch (error) {
    console.error('Error marking message as read:', error);
    throw error;
  }
}

export async function getMessageReadCount(messageId: number) {
  try {
    const result = await db.select({ count: sql`COUNT(*)` })
      .from(db.schema.group_message_read_receipts)
      .where(eq(db.schema.group_message_read_receipts.message_id, messageId));

    return result[0]?.count || 0;
  } catch (error) {
    console.error('Error getting message read count:', error);
    throw error;
  }
}

export async function getWhoReadMessage(messageId: number) {
  try {
    const readers = await db.query.group_message_read_receipts.findMany({
      where: eq(db.schema.group_message_read_receipts.message_id, messageId),
      with: {
        user: true,
      },
      orderBy: desc(db.schema.group_message_read_receipts.read_at),
    });

    return readers;
  } catch (error) {
    console.error('Error getting who read message:', error);
    throw error;
  }
}
