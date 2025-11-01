import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { friendships, users } from '@/lib/db/schema';
import { eq, or, and } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const params = await context.params;
    const userId = parseInt(params.userId);

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
    const friendIds = userFriendships.map(f => 
      f.userId === userId ? f.friendId : f.userId
    );

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
      .where(
        or(...friendIds.map(id => eq(users.id, id)))
      );

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
