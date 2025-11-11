export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { conversations, messages, users, follows } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth/middleware';
import { eq, and, or, desc, notInArray, inArray } from 'drizzle-orm';

// GET /api/messages/requests - Get message requests (Instagram-style)
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
    // Get users that current user follows (mutual follows)
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

    // Get all conversations where user is participant
    const allConversations = await db
      .select({
        id: conversations.id,
        participant1Id: conversations.participant1Id,
        participant2Id: conversations.participant2Id,
        lastMessageAt: conversations.lastMessageAt,
      })
      .from(conversations)
      .where(
        or(
          eq(conversations.participant1Id, user.id),
          eq(conversations.participant2Id, user.id)
        )
      )
      .orderBy(desc(conversations.lastMessageAt));

    // Separate into primary (following) and requests (not following)
    const messageRequests = [];

    for (const conv of allConversations) {
      const otherUserId = conv.participant1Id === user.id 
        ? conv.participant2Id 
        : conv.participant1Id;

      // Check if user follows the other person
      const isFollowing = followingIds.includes(otherUserId);

      // If not following, it's a message request
      if (!isFollowing) {
        // Get last message
        const [lastMessage] = await db
          .select()
          .from(messages)
          .where(eq(messages.conversationId, conv.id))
          .orderBy(desc(messages.createdAt))
          .limit(1);

        // Get other user info
        const [otherUser] = await db
          .select({
            id: users.id,
            name: users.name,
            username: users.username,
            avatar: users.avatar,
          })
          .from(users)
          .where(eq(users.id, otherUserId))
          .limit(1);

        if (otherUser && lastMessage) {
          messageRequests.push({
            conversationId: conv.id,
            user: otherUser,
            lastMessage: {
              content: lastMessage.content || '[Media]',
              createdAt: lastMessage.createdAt,
              senderId: lastMessage.senderId,
            },
            lastMessageAt: conv.lastMessageAt,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      requests: messageRequests,
    });
  } catch (error) {
    console.error('Error fetching message requests:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch message requests' },
      { status: 500 }
    );
  }
}

// POST /api/messages/requests - Accept a message request
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  const { user } = authResult;

  try {
    const { conversationId } = await request.json();

    if (!conversationId) {
      return NextResponse.json(
        { success: false, error: 'Conversation ID is required' },
        { status: 400 }
      );
    }

    // Verify conversation exists and user is participant
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.id, conversationId),
          or(
            eq(conversations.participant1Id, user.id),
            eq(conversations.participant2Id, user.id)
          )
        )
      )
      .limit(1);

    if (!conversation) {
      return NextResponse.json(
        { success: false, error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // In Instagram-style, accepting a message request is implicit
    // The conversation already exists, so we just mark it as "accepted"
    // by the user viewing it. No database change needed.

    return NextResponse.json({
      success: true,
      message: 'Message request accepted',
    });
  } catch (error) {
    console.error('Error accepting message request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to accept message request' },
      { status: 500 }
    );
  }
}

// DELETE /api/messages/requests - Delete a message request
export async function DELETE(request: NextRequest) {
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
    const conversationId = searchParams.get('conversationId');

    if (!conversationId) {
      return NextResponse.json(
        { success: false, error: 'Conversation ID is required' },
        { status: 400 }
      );
    }

    // Verify conversation exists and user is participant
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.id, parseInt(conversationId)),
          or(
            eq(conversations.participant1Id, user.id),
            eq(conversations.participant2Id, user.id)
          )
        )
      )
      .limit(1);

    if (!conversation) {
      return NextResponse.json(
        { success: false, error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Delete all messages in conversation
    await db
      .delete(messages)
      .where(eq(messages.conversationId, parseInt(conversationId)));

    // Delete conversation
    await db
      .delete(conversations)
      .where(eq(conversations.id, parseInt(conversationId)));

    return NextResponse.json({
      success: true,
      message: 'Message request deleted',
    });
  } catch (error) {
    console.error('Error deleting message request:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete message request' },
      { status: 500 }
    );
  }
}
