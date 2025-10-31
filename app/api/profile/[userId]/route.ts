import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, friendships, posts } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth/middleware';
import { eq, or, and, sql } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const authResult = await requireAuth(request);
  
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const userId = parseInt(params.userId);

    // Get user profile
    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        firstName: users.firstName,
        lastName: users.lastName,
        avatar: users.avatar,
        coverPhoto: users.coverPhoto,
        bio: users.bio,
        location: users.location,
        work: users.work,
        education: users.education,
        website: users.website,
        relationshipStatus: users.relationshipStatus,
        birthDate: users.birthDate,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Count friends
    const friendsCountResult = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM ${friendships}
      WHERE (${friendships.userId} = ${userId} OR ${friendships.friendId} = ${userId})
        AND ${friendships.status} = 'accepted'
    `);
    const friendsCount = parseInt(friendsCountResult.rows[0]?.count || '0');

    // Count posts
    const postsCountResult = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM ${posts}
      WHERE ${posts.userId} = ${userId}
    `);
    const postsCount = parseInt(postsCountResult.rows[0]?.count || '0');

    // Count photos (posts with images)
    const photosCountResult = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM ${posts}
      WHERE ${posts.userId} = ${userId}
        AND ${posts.imageUrl} IS NOT NULL
    `);
    const photosCount = parseInt(photosCountResult.rows[0]?.count || '0');

    // Check friendship status
    let isFriend = false;
    let friendRequestSent = false;

    if (userId !== authResult.user.id) {
      const [friendship] = await db
        .select()
        .from(friendships)
        .where(
          or(
            and(
              eq(friendships.userId, authResult.user.id),
              eq(friendships.friendId, userId)
            ),
            and(
              eq(friendships.userId, userId),
              eq(friendships.friendId, authResult.user.id)
            )
          )
        );

      if (friendship) {
        if (friendship.status === 'accepted') {
          isFriend = true;
        } else if (friendship.userId === authResult.user.id && friendship.status === 'pending') {
          friendRequestSent = true;
        }
      }
    }

    const profile = {
      ...user,
      friendsCount,
      postsCount,
      photosCount,
      isFriend,
      friendRequestSent,
    };

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}
