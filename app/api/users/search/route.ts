export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth/middleware';
import { like, or, and, eq, ne, sql } from 'drizzle-orm';

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
    const query = searchParams.get('q') || '';

    if (!query || query.length < 2) {
      return NextResponse.json({ users: [] });
    }

    // Search for users by name or email
    const searchResults = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        avatar: users.avatar,
      })
      .from(users)
      .where(
        and(
          or(
            like(users.name, `%${query}%`),
            like(users.email, `%${query}%`)
          ),
          ne(users.id, authResult.user.id),
          eq(users.isBanned, false)
        )
      )
      .limit(10);

    // Get friendship status for each user
    const usersWithStatus = await Promise.all(
      searchResults.map(async (user) => {
        const friendship = await db
          .select()
          .from(friendships)
          .where(
            or(
              and(
                eq(friendships.userId, authResult.user.id),
                eq(friendships.friendId, user.id)
              ),
              and(
                eq(friendships.userId, user.id),
                eq(friendships.friendId, authResult.user.id)
              )
            )
          )
          .limit(1);

        return {
          ...user,
          friendshipStatus: friendship[0]?.status || 'none',
          friendshipId: friendship[0]?.id || null,
        };
      })
    );

    return NextResponse.json({ users: usersWithStatus });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Failed to search users' },
      { status: 500 }
    );
  }
}

