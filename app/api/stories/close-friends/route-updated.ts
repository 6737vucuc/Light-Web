export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { closeFriends, users } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth/middleware';
import { eq, and } from 'drizzle-orm';

// GET /api/stories/close-friends - Get close friends list
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
    const closeFriendsList = await db
      .select({
        id: closeFriends.id,
        friendId: closeFriends.friendId,
        friendName: users.name,
        friendUsername: users.username,
        friendAvatar: users.avatar,
        addedAt: closeFriends.createdAt
      })
      .from(closeFriends)
      .innerJoin(users, eq(closeFriends.friendId, users.id))
      .where(eq(closeFriends.userId, user.id));

    return NextResponse.json({
      success: true,
      closeFriends: closeFriendsList
    });
  } catch (error) {
    console.error('Error fetching close friends:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch close friends' },
      { status: 500 }
    );
  }
}

// POST /api/stories/close-friends - Add user to close friends
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
    const { friendId } = await request.json();

    if (!friendId) {
      return NextResponse.json(
        { success: false, error: 'Friend ID is required' },
        { status: 400 }
      );
    }

    // Check if already in close friends
    const existing = await db
      .select()
      .from(closeFriends)
      .where(
        and(
          eq(closeFriends.userId, user.id),
          eq(closeFriends.friendId, friendId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { success: false, error: 'User is already in close friends' },
        { status: 400 }
      );
    }

    // Add to close friends
    const [closeFriend] = await db
      .insert(closeFriends)
      .values({
        userId: user.id,
        friendId
      })
      .returning();

    return NextResponse.json({
      success: true,
      message: 'User added to close friends',
      closeFriend
    });
  } catch (error) {
    console.error('Error adding close friend:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add close friend' },
      { status: 500 }
    );
  }
}

// DELETE /api/stories/close-friends - Remove user from close friends
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
    const friendId = searchParams.get('friendId');

    if (!friendId) {
      return NextResponse.json(
        { success: false, error: 'Friend ID is required' },
        { status: 400 }
      );
    }

    // Remove from close friends
    await db
      .delete(closeFriends)
      .where(
        and(
          eq(closeFriends.userId, user.id),
          eq(closeFriends.friendId, parseInt(friendId))
        )
      );

    return NextResponse.json({
      success: true,
      message: 'User removed from close friends'
    });
  } catch (error) {
    console.error('Error removing close friend:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove close friend' },
      { status: 500 }
    );
  }
}
