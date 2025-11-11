export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { conversations, messages, users, follows } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth/middleware';
import { eq, and, or, desc, sql as drizzleSql } from 'drizzle-orm';
import { decryptMessageMilitary } from '@/lib/security/military-encryption';

// GET /api/messages/conversations - Get conversations (Instagram-style with Primary/Requests)
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  const { user } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'primary'; // 'primary' or 'requests'

    // Get users that current user follows (for primary inbox)
    const following = await db
      .select({ followingId: follows.followingId })
      .from(follows)
      .where(
        and(
          eq(follows.followerId, user.id),
          eq(follows.status, 'accepted')
        )
      );

    const followingIds = following.map(f => f.followingId);

    // Get users that follow current user (mutual check)
    const followers = await db
      .select({ followerId: follows.followerId })
      .from(follows)
      .where(
        and(
          eq(follows.followingId, user.id),
          eq(follows.status, 'accepted')
        )
      );

    const followerIds = followers.map(f => f.followerId);

    // Mutual follows (both follow each other)
    const mutualFollows = followingIds.filter(id => followerIds.includes(id));

    // Get all conversations
    const allConversations = await db
      .select({
        id: conversations.id,
        participant1Id: conversations.participant1Id,
        participant2Id: conversations.participant2Id,
        lastMessageAt: conversations.lastMessageAt,
        isPinned1: conversations.isPinned1,
        isPinned2: conversations.isPinned2,
        isMuted1: conversations.isMuted1,
        isMuted2: conversations.isMuted2,
      })
      .from(conversations)
      .where(
        or(
          eq(conversations.participant1Id, user.id),
          eq(conversations.participant2Id, user.id)
        )
      )
      .orderBy(desc(conversations.lastMessageAt));

    const conversationList = [];

    for (const conv of allConversations) {
      const otherUserId = conv.participant1Id === user.id 
        ? conv.participant2Id 
        : conv.participant1Id;

      // Check if it's a mutual follow
      const isMutual = mutualFollows.includes(otherUserId);

      // Filter based on type
      if (type === 'primary' && !isMutual) continue;
      if (type === 'requests' && isMutual) continue;

      // Get last message
      const [lastMessage] = await db
        .select()
        .from(messages)
        .where(
          and(
            eq(messages.conversationId, conv.id),
            // Don't show deleted messages
            or(
              and(
                eq(messages.senderId, user.id),
                eq(messages.deletedBySender, false)
              ),
              and(
                eq(messages.receiverId, user.id),
                eq(messages.deletedByReceiver, false)
              )
            )
          )
        )
        .orderBy(desc(messages.createdAt))
        .limit(1);

      // Get other user info
      const [otherUser] = await db
        .select({
          id: users.id,
          name: users.name,
          username: users.username,
          avatar: users.avatar,
          lastSeen: users.lastSeen,
        })
        .from(users)
        .where(eq(users.id, otherUserId))
        .limit(1);

      if (!otherUser) continue;

      // Get unread count
      const unreadResult = await db
        .select({ count: drizzleSql<number>`count(*)::int` })
        .from(messages)
        .where(
          and(
            eq(messages.conversationId, conv.id),
            eq(messages.receiverId, user.id),
            eq(messages.isRead, false),
            eq(messages.deletedByReceiver, false)
          )
        );

      const unreadCount = unreadResult[0]?.count || 0;

      let lastMessageContent = '';
      let lastMessageTime = conv.lastMessageAt;

      if (lastMessage) {
        // Decrypt if encrypted
        if (lastMessage.isEncrypted && lastMessage.encryptedContent) {
          try {
            lastMessageContent = decryptMessageMilitary(lastMessage.encryptedContent);
          } catch {
            lastMessageContent = '[Encrypted message]';
          }
        } else {
          lastMessageContent = lastMessage.content || '';
        }

        // Truncate long messages
        if (lastMessageContent.length > 50) {
          lastMessageContent = lastMessageContent.substring(0, 50) + '...';
        }

        // Add media indicator
        if (lastMessage.mediaUrl) {
          lastMessageContent = lastMessage.messageType === 'image' 
            ? '📷 Photo' 
            : lastMessage.messageType === 'video'
            ? '🎥 Video'
            : lastMessageContent;
        }

        lastMessageTime = lastMessage.createdAt;
      }

      const isPinned = conv.participant1Id === user.id ? conv.isPinned1 : conv.isPinned2;
      const isMuted = conv.participant1Id === user.id ? conv.isMuted1 : conv.isMuted2;

      conversationList.push({
        conversationId: conv.id,
        user: otherUser,
        lastMessage: lastMessageContent || 'No messages yet',
        lastMessageTime,
        unreadCount,
        isPinned,
        isMuted,
        isMutual,
      });
    }

    // Sort: Pinned first, then by last message time
    conversationList.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
      const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
      return timeB - timeA;
    });

    return NextResponse.json({
      success: true,
      conversations: conversationList,
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}
