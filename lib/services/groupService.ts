import { db } from '@/lib/db';
import { eq, and, desc, sql } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';

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
    const member = await db.query.groupMembers.findFirst({
      where: and(
        eq(schema.groupMembers.groupId, groupId),
        eq(schema.groupMembers.userId, userId)
      ),
    });

    if (!member?.isAdmin && !member?.isModerator) {
      throw new Error('Only admins and moderators can pin messages');
    }

    // Pin the message
    const result = await db.insert(schema.pinnedMessages).values({
      groupId: groupId,
      messageId: messageId,
      pinnedBy: userId,
      pinnedAt: new Date(),
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
    const member = await db.query.groupMembers.findFirst({
      where: and(
        eq(schema.groupMembers.groupId, groupId),
        eq(schema.groupMembers.userId, userId)
      ),
    });

    if (!member?.isAdmin && !member?.isModerator) {
      throw new Error('Only admins and moderators can unpin messages');
    }

    // Unpin the message
    await db.delete(schema.pinnedMessages).where(
      and(
        eq(schema.pinnedMessages.groupId, groupId),
        eq(schema.pinnedMessages.messageId, messageId)
      )
    );
  } catch (error) {
    console.error('Error unpinning message:', error);
    throw error;
  }
}

export async function getPinnedMessages(groupId: number) {
  try {
    const pinned = await db.query.pinnedMessages.findMany({
      where: eq(schema.pinnedMessages.groupId, groupId),
      with: {
        message: {
          with: {
            user: true,
          },
        },
        pinnedBy: true,
      },
      orderBy: desc(schema.pinnedMessages.pinnedAt),
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
    const result = await db.insert(schema.starredMessages).values({
      userId: userId,
      messageId: messageId,
      starredAt: new Date(),
    }).onConflictDoNothing();

    return result;
  } catch (error) {
    console.error('Error starring message:', error);
    throw error;
  }
}

export async function unstarMessage(messageId: number, userId: number) {
  try {
    await db.delete(schema.starredMessages).where(
      and(
        eq(schema.starredMessages.userId, userId),
        eq(schema.starredMessages.messageId, messageId)
      )
    );
  } catch (error) {
    console.error('Error unstarring message:', error);
    throw error;
  }
}

export async function getStarredMessages(userId: number) {
  try {
    const starred = await db.query.starredMessages.findMany({
      where: eq(schema.starredMessages.userId, userId),
      with: {
        message: {
          with: {
            user: true,
          },
        },
      },
      orderBy: desc(schema.starredMessages.starredAt),
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
    const result = await db.insert(schema.memberPresence).values({
      groupId: groupId,
      userId: userId,
      isOnline: isOnline,
      lastSeen: new Date(),
      sessionId: sessionId,
    }).onConflictDoUpdate({
      target: [schema.memberPresence.groupId, schema.memberPresence.userId, schema.memberPresence.sessionId],
      set: {
        isOnline: isOnline,
        lastSeen: new Date(),
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
    const onlineMembers = await db.query.memberPresence.findMany({
      where: and(
        eq(schema.memberPresence.groupId, groupId),
        eq(schema.memberPresence.isOnline, true)
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
      .from(schema.memberPresence)
      .where(and(
        eq(schema.memberPresence.groupId, groupId),
        eq(schema.memberPresence.isOnline, true)
      ));

    return Number(result[0]?.count) || 0;
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
    const results = await db.query.groupMessages.findMany({
      where: and(
        eq(schema.groupMessages.groupId, groupId),
        sql`to_tsvector('english', ${schema.groupMessages.content}) @@ plainto_tsquery('english', ${query})`
      ),
      with: {
        user: true,
      },
      orderBy: desc(schema.groupMessages.createdAt),
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
      messageId: messageId,
      mentionedUserId: userId,
      createdAt: new Date(),
    }));

    await db.insert(schema.messageMentions).values(mentions).onConflictDoNothing();
  } catch (error) {
    console.error('Error adding mentions:', error);
    throw error;
  }
}

export async function getMentions(userId: number, groupId: number) {
  try {
    const mentions = await db.query.messageMentions.findMany({
      where: eq(schema.messageMentions.mentionedUserId, userId),
      with: {
        message: {
          with: {
            user: true,
          },
        },
      },
      orderBy: desc(schema.messageMentions.createdAt),
    });

    return mentions.filter(m => m.message && m.message.groupId === groupId);
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
    const promoter = await db.query.groupMembers.findFirst({
      where: and(
        eq(schema.groupMembers.groupId, groupId),
        eq(schema.groupMembers.userId, promotedBy)
      ),
    });

    if (!promoter?.isAdmin) {
      throw new Error('Only admins can promote members');
    }

    // Promote member
    await db.update(schema.groupMembers)
      .set({ isAdmin: true })
      .where(and(
        eq(schema.groupMembers.groupId, groupId),
        eq(schema.groupMembers.userId, userId)
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
    const muter = await db.query.groupMembers.findFirst({
      where: and(
        eq(schema.groupMembers.groupId, groupId),
        eq(schema.groupMembers.userId, mutedBy)
      ),
    });

    if (!muter?.isAdmin && !muter?.isModerator) {
      throw new Error('Only admins and moderators can mute members');
    }

    // Mute member
    await db.update(schema.groupMembers)
      .set({ mutedUntil: mutedUntil })
      .where(and(
        eq(schema.groupMembers.groupId, groupId),
        eq(schema.groupMembers.userId, userId)
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

export async function logGroupActivity(groupId: number, userId: number | null, action: string, details?: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
  try {
    await db.insert(schema.groupActivityLog).values({
      groupId: groupId,
      userId: userId,
      action,
      details: details,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error('Error logging group activity:', error);
    throw error;
  }
}

export async function getGroupActivityLog(groupId: number, limit = 50) {
  try {
    const logs = await db.query.groupActivityLog.findMany({
      where: eq(schema.groupActivityLog.groupId, groupId),
      with: {
        user: true,
      },
      orderBy: desc(schema.groupActivityLog.createdAt),
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
    await db.insert(schema.groupMessageReadReceipts).values({
      messageId: messageId,
      userId: userId,
      readAt: new Date(),
    }).onConflictDoNothing();
  } catch (error) {
    console.error('Error marking message as read:', error);
    throw error;
  }
}

export async function getMessageReadCount(messageId: number) {
  try {
    const result = await db.select({ count: sql`COUNT(*)` })
      .from(schema.groupMessageReadReceipts)
      .where(eq(schema.groupMessageReadReceipts.messageId, messageId));

    return Number(result[0]?.count) || 0;
  } catch (error) {
    console.error('Error getting message read count:', error);
    throw error;
  }
}

export async function getWhoReadMessage(messageId: number) {
  try {
    const readers = await db.query.groupMessageReadReceipts.findMany({
      where: eq(schema.groupMessageReadReceipts.messageId, messageId),
      with: {
        user: true,
      },
      orderBy: desc(schema.groupMessageReadReceipts.readAt),
    });

    return readers;
  } catch (error) {
    console.error('Error getting who read message:', error);
    throw error;
  }
}
