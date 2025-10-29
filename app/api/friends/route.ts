import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, friendships } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth/middleware';
import { eq, or, and, sql } from 'drizzle-orm';

// Get friends list
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'friends'; // 'friends', 'pending', 'requests'

    let friendsList: any[] = [];

    if (type === 'friends') {
      // Get accepted friends
      const friends = await db
        .select({
          id: friendships.id,
          friendId: sql<number>`CASE WHEN ${friendships.userId} = ${authResult.user.id} THEN ${friendships.friendId} ELSE ${friendships.userId} END`.as('friend_id'),
          createdAt: friendships.createdAt,
        })
        .from(friendships)
        .where(
          and(
            or(
              eq(friendships.userId, authResult.user.id),
              eq(friendships.friendId, authResult.user.id)
            ),
            eq(friendships.status, 'accepted')
          )
        );

      // Get friend details
      friendsList = await Promise.all(
        friends.map(async (f) => {
          const friendIdValue = typeof f.friendId === 'number' ? f.friendId : 0;
          const friend = await db
            .select({
              id: users.id,
              name: users.name,
              email: users.email,
              avatar: users.avatar,
              lastSeen: users.lastSeen,
            })
            .from(users)
            .where(eq(users.id, friendIdValue))
            .limit(1);

          return {
            friendshipId: f.id,
            ...friend[0],
            createdAt: f.createdAt,
          };
        })
      );
    } else if (type === 'pending') {
      // Get pending requests sent by current user
      const pending = await db
        .select()
        .from(friendships)
        .where(
          and(
            eq(friendships.userId, authResult.user.id),
            eq(friendships.status, 'pending')
          )
        );

      friendsList = await Promise.all(
        pending.map(async (f) => {
          const friendIdValue = typeof f.friendId === 'number' ? f.friendId : 0;
          const friend = await db
            .select({
              id: users.id,
              name: users.name,
              email: users.email,
              avatar: users.avatar,
              lastSeen: users.lastSeen,
            })
            .from(users)
            .where(eq(users.id, friendIdValue))
            .limit(1);

          return {
            friendshipId: f.id,
            ...friend[0],
            createdAt: f.createdAt,
          };
        })
      );
    } else if (type === 'requests') {
      // Get friend requests received by current user
      const requests = await db
        .select()
        .from(friendships)
        .where(
          and(
            eq(friendships.friendId, authResult.user.id),
            eq(friendships.status, 'pending')
          )
        );

      friendsList = await Promise.all(
        requests.map(async (f) => {
          const userIdValue = typeof f.userId === 'number' ? f.userId : 0;
          const friend = await db
            .select({
              id: users.id,
              name: users.name,
              email: users.email,
              avatar: users.avatar,
              lastSeen: users.lastSeen,
            })
            .from(users)
            .where(eq(users.id, userIdValue))
            .limit(1);

          return {
            friendshipId: f.id,
            ...friend[0],
            createdAt: f.createdAt,
          };
        })
      );
    }

    return NextResponse.json({ friends: friendsList });
  } catch (error) {
    console.error('Get friends error:', error);
    return NextResponse.json(
      { error: 'Failed to get friends' },
      { status: 500 }
    );
  }
}

// Send friend request
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const body = await request.json();
    const { friendId } = body;

    if (!friendId) {
      return NextResponse.json(
        { error: 'Friend ID is required' },
        { status: 400 }
      );
    }

    // Check if friendship already exists
    const existing = await db
      .select()
      .from(friendships)
      .where(
        or(
          and(
            eq(friendships.userId, authResult.user.id),
            eq(friendships.friendId, friendId)
          ),
          and(
            eq(friendships.userId, friendId),
            eq(friendships.friendId, authResult.user.id)
          )
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Friend request already exists' },
        { status: 400 }
      );
    }

    // Create friend request
    await db.insert(friendships).values({
      userId: authResult.user.id,
      friendId,
      status: 'pending',
    });

    return NextResponse.json({
      message: 'Friend request sent successfully',
    });
  } catch (error) {
    console.error('Send friend request error:', error);
    return NextResponse.json(
      { error: 'Failed to send friend request' },
      { status: 500 }
    );
  }
}

// Accept/Reject friend request
export async function PUT(request: NextRequest) {
  const authResult = await requireAuth(request);
  
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const body = await request.json();
    const { friendshipId, action } = body; // action: 'accept' or 'reject'

    if (!friendshipId || !action) {
      return NextResponse.json(
        { error: 'Friendship ID and action are required' },
        { status: 400 }
      );
    }

    // Verify the friendship belongs to current user
    const friendship = await db
      .select()
      .from(friendships)
      .where(
        and(
          eq(friendships.id, friendshipId),
          eq(friendships.friendId, authResult.user.id),
          eq(friendships.status, 'pending')
        )
      )
      .limit(1);

    if (friendship.length === 0) {
      return NextResponse.json(
        { error: 'Friend request not found' },
        { status: 404 }
      );
    }

    // Update friendship status
    await db
      .update(friendships)
      .set({ status: action === 'accept' ? 'accepted' : 'rejected' })
      .where(eq(friendships.id, friendshipId));

    return NextResponse.json({
      message: `Friend request ${action}ed successfully`,
    });
  } catch (error) {
    console.error('Update friendship error:', error);
    return NextResponse.json(
      { error: 'Failed to update friend request' },
      { status: 500 }
    );
  }
}

// Remove friend
export async function DELETE(request: NextRequest) {
  const authResult = await requireAuth(request);
  
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const friendshipId = searchParams.get('id');

    if (!friendshipId) {
      return NextResponse.json(
        { error: 'Friendship ID is required' },
        { status: 400 }
      );
    }

    // Verify the friendship belongs to current user
    const friendship = await db
      .select()
      .from(friendships)
      .where(
        and(
          eq(friendships.id, parseInt(friendshipId)),
          or(
            eq(friendships.userId, authResult.user.id),
            eq(friendships.friendId, authResult.user.id)
          )
        )
      )
      .limit(1);

    if (friendship.length === 0) {
      return NextResponse.json(
        { error: 'Friendship not found' },
        { status: 404 }
      );
    }

    // Delete friendship
    await db
      .delete(friendships)
      .where(eq(friendships.id, parseInt(friendshipId)));

    return NextResponse.json({
      message: 'Friend removed successfully',
    });
  } catch (error) {
    console.error('Remove friend error:', error);
    return NextResponse.json(
      { error: 'Failed to remove friend' },
      { status: 500 }
    );
  }
}

