import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { follows, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { verifyToken } from '@/lib/auth/jwt';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const token = request.cookies.get('token')?.value;
    let currentUserId: number | null = null;

    if (token) {
      const decoded = await verifyToken(token);
      if (decoded) {
        currentUserId = decoded.userId as number;
      }
    }

    const { userId } = await params;
    const targetUserId = parseInt(userId);

    // Get all users that the target user is following
    const followingData = await db
      .select({
        id: users.id,
        username: users.username,
        name: users.name,
        avatar: users.avatar,
        isOnline: users.isOnline,
        lastSeen: users.lastSeen,
      })
      .from(follows)
      .innerJoin(users, eq(follows.followingId, users.id))
      .where(
        and(
          eq(follows.followerId, targetUserId),
          eq(follows.status, 'accepted')
        )
      );

    // For each following, check if current user is following them and if they follow current user
    const followingWithStatus = await Promise.all(
      followingData.map(async (following) => {
        let isFollowing = false;
        let isFollowingYou = false;

        if (currentUserId) {
          // Check if current user follows this user
          const [followingCheck] = await db
            .select()
            .from(follows)
            .where(
              and(
                eq(follows.followerId, currentUserId),
                eq(follows.followingId, following.id),
                eq(follows.status, 'accepted')
              )
            )
            .limit(1);

          isFollowing = !!followingCheck;

          // Check if this user follows current user
          const [followsYouCheck] = await db
            .select()
            .from(follows)
            .where(
              and(
                eq(follows.followerId, following.id),
                eq(follows.followingId, currentUserId),
                eq(follows.status, 'accepted')
              )
            )
            .limit(1);

          isFollowingYou = !!followsYouCheck;
        }

        return {
          ...following,
          isFollowing,
          isFollowingYou,
        };
      })
    );

    return NextResponse.json({
      following: followingWithStatus,
      count: followingWithStatus.length,
    });
  } catch (error) {
    console.error('Error fetching following:', error);
    return NextResponse.json(
      { error: 'Failed to fetch following' },
      { status: 500 }
    );
  }
}
