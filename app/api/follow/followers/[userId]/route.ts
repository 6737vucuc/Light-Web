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

    // Get all followers of the target user
    const followersData = await db
      .select({
        id: users.id,
        username: users.username,
        name: users.name,
        avatar: users.avatar,
        lastSeen: users.lastSeen,
      })
      .from(follows)
      .innerJoin(users, eq(follows.followerId, users.id))
      .where(
        and(
          eq(follows.followingId, targetUserId),
          eq(follows.status, 'accepted')
        )
      );

    // For each follower, check if current user is following them and if they follow current user
    const followersWithStatus = await Promise.all(
      followersData.map(async (follower) => {
        let isFollowing = false;
        let isFollowingYou = false;

        if (currentUserId) {
          // Check if current user follows this follower
          const [followingCheck] = await db
            .select()
            .from(follows)
            .where(
              and(
                eq(follows.followerId, currentUserId),
                eq(follows.followingId, follower.id),
                eq(follows.status, 'accepted')
              )
            )
            .limit(1);

          isFollowing = !!followingCheck;

          // Check if this follower follows current user
          const [followsYouCheck] = await db
            .select()
            .from(follows)
            .where(
              and(
                eq(follows.followerId, follower.id),
                eq(follows.followingId, currentUserId),
                eq(follows.status, 'accepted')
              )
            )
            .limit(1);

          isFollowingYou = !!followsYouCheck;
        }

        return {
          ...follower,
          isFollowing,
          isFollowingYou,
        };
      })
    );

    return NextResponse.json({
      followers: followersWithStatus,
      count: followersWithStatus.length,
    });
  } catch (error) {
    console.error('Error fetching followers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch followers' },
      { status: 500 }
    );
  }
}
