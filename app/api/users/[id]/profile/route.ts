export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, blockedUsers, posts } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth/middleware';
import { eq, and, desc } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const currentUser = authResult.user;

    const { id } = await params;
    const userId = parseInt(id);

    // Check if the user is blocked
    const isBlocked = await db
      .select()
      .from(blockedUsers)
      .where(
        and(
          eq(blockedUsers.userId, currentUser.id),
          eq(blockedUsers.blockedUserId, userId)
        )
      )
      .limit(1);

    if (isBlocked.length > 0) {
      return NextResponse.json({ error: 'User is blocked' }, { status: 403 });
    }

    // Check if current user is blocked by the target user
    const isBlockedBy = await db
      .select()
      .from(blockedUsers)
      .where(
        and(
          eq(blockedUsers.userId, userId),
          eq(blockedUsers.blockedUserId, currentUser.id)
        )
      )
      .limit(1);

    if (isBlockedBy.length > 0) {
      return NextResponse.json({ error: 'You are blocked by this user' }, { status: 403 });
    }

    // Get user profile
    const userProfile = await db
      .select({
        id: users.id,
        name: users.name,
        avatar: users.avatar,
        gender: users.gender,
        country: users.country,
        lastSeen: users.lastSeen,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (userProfile.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get user's public posts
    const userPosts = await db
      .select()
      .from(posts)
      .where(eq(posts.userId, userId))
      .orderBy(desc(posts.createdAt))
      .limit(10);

    return NextResponse.json({
      user: userProfile[0],
      posts: userPosts,
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    return NextResponse.json({ error: 'Failed to get user profile' }, { status: 500 });
  }
}
