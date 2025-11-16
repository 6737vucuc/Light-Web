import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, follows } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const { userId } = await params;
    const targetUserId = parseInt(userId);

    if (isNaN(targetUserId)) {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    // Get current user from token
    let currentUserId: number | null = null;
    const token = request.cookies.get('token')?.value;
    
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: number };
        currentUserId = decoded.userId;
      } catch (error) {
        // Token invalid, continue as guest
      }
    }

    // Get user data
    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        username: users.username,
        email: users.email,
        avatar: users.avatar,
        coverPhoto: users.coverPhoto,
        bio: users.bio,
        website: users.website,
        postsCount: users.postsCount,
        followersCount: users.followersCount,
        followingCount: users.followingCount,
        isPrivate: users.isPrivate,
        hideFollowers: users.hideFollowers,
        hideFollowing: users.hideFollowing,
      })
      .from(users)
      .where(eq(users.id, targetUserId));

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if current user is blocked by target user
    let isBlocked = false;
    if (currentUserId) {
      const [blockRecord] = await db
        .select()
        .from(blockedUsers)
        .where(
          and(
            eq(blockedUsers.userId, targetUserId),
            eq(blockedUsers.blockedUserId, currentUserId)
          )
        );

      isBlocked = !!blockRecord;
    }

    // Check if current user is following target user
    let isFollowing = false;
    let isPending = false;
    
    if (currentUserId && currentUserId !== targetUserId) {
      const [followRecord] = await db
        .select()
        .from(follows)
        .where(
          and(
            eq(follows.followerId, currentUserId),
            eq(follows.followingId, targetUserId)
          )
        );

      if (followRecord) {
        isFollowing = followRecord.status === 'accepted';
        isPending = followRecord.status === 'pending';
      }
    }

    return NextResponse.json({
      user,
      isFollowing,
      isPending,
      isBlocked,
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}
