export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { messages, users, follows } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth/middleware';
import { eq, and, or, desc, sql } from 'drizzle-orm';

// GET /api/messages/requests - Get message requests (non-mutual followers)
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

    // Get message requests (messages from users not mutually followed)
    const requests = await db
      .select({
        id: messages.id,
        senderId: messages.senderId,
        content: messages.content,
        createdAt: messages.createdAt,
        senderName: users.name,
        senderUsername: users.username,
        senderAvatar: users.avatar,
      })
      .from(messages)
      .innerJoin(users, eq(messages.senderId, users.id))
      .where(
        and(
          eq(messages.receiverId, user.id),
          sql`${messages.senderId} NOT IN (${sql.join(followingIds.length > 0 ? followingIds : [0], sql`, `)})`
        )
      )
      .orderBy(desc(messages.createdAt));

    return NextResponse.json({
      success: true,
      requests: requests,
    });
  } catch (error) {
    console.error('Error fetching message requests:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch message requests' },
      { status: 500 }
    );
  }
}

// POST /api/messages/requests - Accept a message request (no-op, just for compatibility)
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  return NextResponse.json({
    success: true,
    message: 'Message request accepted',
  });
}

// DELETE /api/messages/requests - Delete messages from a user
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
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Delete all messages from this user
    await db
      .delete(messages)
      .where(
        and(
          eq(messages.senderId, parseInt(userId)),
          eq(messages.receiverId, user.id)
        )
      );

    return NextResponse.json({
      success: true,
      message: 'Messages deleted',
    });
  } catch (error) {
    console.error('Error deleting messages:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete messages' },
      { status: 500 }
    );
  }
}
