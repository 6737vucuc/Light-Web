import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { follows, users } from '@/lib/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { verifyToken } from '@/lib/auth/jwt';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const currentUserId = decoded.userId as number;

    // Get users that current user follows
    const following = await db
      .select({ followingId: follows.followingId })
      .from(follows)
      .where(
        and(
          eq(follows.followerId, currentUserId),
          eq(follows.status, 'accepted')
        )
      );

    const followingIds = following.map(f => f.followingId);

    if (followingIds.length === 0) {
      return NextResponse.json({
        success: true,
        mutualFollowers: [],
      });
    }

    // Get users that follow current user (from the followingIds list)
    const followers = await db
      .select({ followerId: follows.followerId })
      .from(follows)
      .where(
        and(
          eq(follows.followingId, currentUserId),
          eq(follows.status, 'accepted'),
          inArray(follows.followerId, followingIds)
        )
      );

    const mutualFollowerIds = followers.map(f => f.followerId);

    if (mutualFollowerIds.length === 0) {
      return NextResponse.json({
        success: true,
        mutualFollowers: [],
      });
    }

    // Get user details for mutual followers
    const mutualFollowers = await db
      .select({
        id: users.id,
        name: users.name,
        username: users.username,
        avatar: users.avatar,
        lastSeen: users.lastSeen,
      })
      .from(users)
      .where(inArray(users.id, mutualFollowerIds));

    return NextResponse.json({
      success: true,
      mutualFollowers,
    });
  } catch (error) {
    console.error('Error fetching mutual followers:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
