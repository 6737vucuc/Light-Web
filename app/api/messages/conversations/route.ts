// Force dynamic rendering
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { messages, users, follows } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth/middleware';
import { eq, and, or, desc, sql as drizzleSql, ne } from 'drizzle-orm';
import { decryptMessageMilitary } from '@/lib/security/military-encryption';

// GET /api/messages/conversations - Get conversations (Instagram-style with Primary/Requests)
// Simplified: Works directly with messages table, no conversations table needed
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

    // Get unique users from messages (sent or received)
    const allMessages = await db
      .select({
        id: messages.id,
        senderId: messages.senderId,
        receiverId: messages.receiverId,
        content: messages.content,
        encryptedContent: messages.encryptedContent,
        isEncrypted: messages.isEncrypted,
        messageType: messages.messageType,
        mediaUrl: messages.mediaUrl,
        isRead: messages.isRead,
        isDeleted: messages.isDeleted,
        deletedBySender: messages.deletedBySender,
        deletedByReceiver: messages.deletedByReceiver,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .where(
        and(
          or(
            eq(messages.senderId, user.id),
            eq(messages.receiverId, user.id)
          ),
          eq(messages.isDeleted, false)
        )
      )
      .orderBy(desc(messages.createdAt));

    // Group messages by conversation partner
    const conversationsMap = new Map();

    for (const msg of allMessages) {
      const isSender = msg.senderId === user.id;
      const partnerId = isSender ? msg.receiverId : msg.senderId;

      // Skip if deleted by current user
      if (isSender && msg.deletedBySender) continue;
      if (!isSender && msg.deletedByReceiver) continue;

      if (!conversationsMap.has(partnerId)) {
        conversationsMap.set(partnerId, {
          userId: partnerId,
          lastMessage: msg,
          unreadCount: 0,
          messages: [],
        });
      }

      const conv = conversationsMap.get(partnerId);
      conv.messages.push(msg);

      // Count unread messages (received by current user and not read)
      if (msg.receiverId === user.id && !msg.isRead) {
        conv.unreadCount++;
      }
    }

    // Get user details for each conversation
    const conversationList = [];

    for (const [partnerId, convData] of conversationsMap.entries()) {
      const partnerUser = await db.query.users.findFirst({
        where: eq(users.id, partnerId),
      });

      if (!partnerUser) continue;

      const isMutual = mutualFollows.includes(partnerId);

      // Filter by type
      if (type === 'primary' && !isMutual) continue;
      if (type === 'requests' && isMutual) continue;

      // Decrypt last message if encrypted
      let lastMessageContent = convData.lastMessage.content;
      if (convData.lastMessage.isEncrypted && convData.lastMessage.encryptedContent) {
        try {
          lastMessageContent = decryptMessageMilitary(convData.lastMessage.encryptedContent);
        } catch (error) {
          lastMessageContent = '[Encrypted]';
        }
      }

      conversationList.push({
        conversationId: `${Math.min(user.id, partnerId)}-${Math.max(user.id, partnerId)}`, // Virtual conversation ID
        user: {
          id: partnerUser.id,
          name: partnerUser.name,
          username: partnerUser.username,
          avatar: partnerUser.avatar,
        },
        lastMessage: lastMessageContent || (convData.lastMessage.mediaUrl ? 'Sent a photo' : ''),
        lastMessageAt: convData.lastMessage.createdAt,
        unreadCount: convData.unreadCount,
        isMutual: isMutual,
      });
    }

    // Sort by last message time
    conversationList.sort((a, b) => {
      const timeA = new Date(a.lastMessageAt).getTime();
      const timeB = new Date(b.lastMessageAt).getTime();
      return timeB - timeA;
    });

    return NextResponse.json({
      conversations: conversationList,
      type: type,
    });
  } catch (error) {
    console.error('Get conversations error:', error);
    return NextResponse.json(
      { error: 'Failed to get conversations' },
      { status: 500 }
    );
  }
}
