export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { friendships, users } from '@/lib/db/schema';
import { eq, or, and, inArray } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const { id } = await params;
    const userId = parseInt(id);

    if (isNaN(userId)) {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    // Get all accepted friendships for this user
    const userFriendships = await db
      .select({
        friendshipId: friendships.id,
        userId: friendships.userId,
        friendId: friendships.friendId,
        status: friendships.status,
        createdAt: friendships.createdAt,
      })
      .from(friendships)
      .where(
        and(
          or(
            eq(friendships.userId, userId),
            eq(friendships.friendId, userId)
          ),
          eq(friendships.status, 'accepted')
        )
      );

    // Get friend user details
    const friendIds: number[] = userFriendships
      .map(f => f.userId === userId ? f.friendId : f.userId)
      .filter((id): id is number => id !== null && id !== undefined);

    if (friendIds.length === 0) {
      return NextResponse.json({ friends: [] });
    }

    const friendsData = await db
      .select({
        id: users.id,
        name: users.name,
        avatar: users.avatar,
      })
      .from(users)
      .where(inArray(users.id, friendIds));

    return NextResponse.json({
      friends: friendsData,
    });
  } catch (error) {
    console.error('Error fetching friends:', error);
    return NextResponse.json(
      { error: 'Failed to fetch friends' },
      { status: 500 }
    );
  }
}
