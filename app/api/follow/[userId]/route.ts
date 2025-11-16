import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { follows, users,  notifications } from '@/lib/db/schema';
import { eq, and, or, sql } from 'drizzle-orm';
import { verifyToken } from '@/lib/auth/jwt';

// Follow user
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }
    const currentUserId = decoded.userId as number;
    const { userId } = await params;
    const targetUserId = parseInt(userId);

    if (currentUserId === targetUserId) {
      return NextResponse.json(
        { error: 'Cannot follow yourself' },
        { status: 400 }
      );
    }

    // Check if blocked
    const [blocked] = await db
      .select()
      .from(blockedUsers)
      .where(
        or(
          and(
            eq(blockedUsers.userId, targetUserId),
            eq(blockedUsers.blockedUserId, currentUserId)
          ),
          and(
            eq(blockedUsers.userId, currentUserId),
            eq(blockedUsers.blockedUserId, targetUserId)
          )
        )
      )
      .limit(1);

    if (blocked) {
      return NextResponse.json(
        { error: 'Cannot follow this user' },
        { status: 403 }
      );
    }

    // Check if already following
    const [existingFollow] = await db
      .select()
      .from(follows)
      .where(
        and(
          eq(follows.followerId, currentUserId),
          eq(follows.followingId, targetUserId)
        )
      )
      .limit(1);

    if (existingFollow) {
      return NextResponse.json(
        { error: 'Already following or requested' },
        { status: 400 }
      );
    }

    // Get target user to check privacy settings
    const [targetUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, targetUserId))
      .limit(1);

    const isPrivate = targetUser?.isPrivate || false;
    const followStatus = isPrivate ? 'pending' : 'accepted';

    // Create follow record
    const [newFollow] = await db
      .insert(follows)
      .values({
        followerId: currentUserId,
        followingId: targetUserId,
        status: followStatus,
      })
      .returning();

    // Update counts if accepted immediately
    if (followStatus === 'accepted') {
      // Increment following count for current user
      await db
        .update(users)
        .set({
          followingCount: sql`${users.followingCount} + 1`,
        })
        .where(eq(users.id, currentUserId));

      // Increment followers count for target user
      await db
        .update(users)
        .set({
          followersCount: sql`${users.followersCount} + 1`,
        })
        .where(eq(users.id, targetUserId));
    }

    // Create notification
    await db.insert(notifications).values({
      userId: targetUserId,
      type: isPrivate ? 'follow_request' : 'new_follower',
      fromUserId: currentUserId,
      content: isPrivate 
        ? 'sent you a follow request' 
        : 'started following you',
    });

    return NextResponse.json({
      success: true,
      status: followStatus,
      message: isPrivate 
        ? 'Follow request sent' 
        : 'Now following',
    });
  } catch (error) {
    console.error('Error following user:', error);
    return NextResponse.json(
      { error: 'Failed to follow user' },
      { status: 500 }
    );
  }
}

// Unfollow user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }
    const currentUserId = decoded.userId as number;
    const { userId } = await params;
    const targetUserId = parseInt(userId);

    // Find and delete follow record
    const [existingFollow] = await db
      .select()
      .from(follows)
      .where(
        and(
          eq(follows.followerId, currentUserId),
          eq(follows.followingId, targetUserId)
        )
      )
      .limit(1);

    if (!existingFollow) {
      return NextResponse.json(
        { error: 'Not following this user' },
        { status: 400 }
      );
    }

    await db
      .delete(follows)
      .where(eq(follows.id, existingFollow.id));

    // Update counts if follow was accepted
    if (existingFollow.status === 'accepted') {
      // Decrement following count for current user
      await db
        .update(users)
        .set({
          followingCount: sql`GREATEST(${users.followingCount} - 1, 0)`,
        })
        .where(eq(users.id, currentUserId));

      // Decrement followers count for target user
      await db
        .update(users)
        .set({
          followersCount: sql`GREATEST(${users.followersCount} - 1, 0)`,
        })
        .where(eq(users.id, targetUserId));
    }

    return NextResponse.json({
      success: true,
      message: 'Unfollowed successfully',
    });
  } catch (error) {
    console.error('Error unfollowing user:', error);
    return NextResponse.json(
      { error: 'Failed to unfollow user' },
      { status: 500 }
    );
  }
}
