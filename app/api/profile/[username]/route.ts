import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, follows, blockedUsers, posts } from '@/lib/db/schema';
import { eq, and, or, desc, sql } from 'drizzle-orm';
import { verifyToken } from '@/lib/auth/jwt';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;
    
    // Get current user from token
    const token = request.cookies.get('token')?.value;
    let currentUserId: number | null = null;
    
    if (token) {
      try {
        const decoded = await verifyToken(token);
        if (decoded) {
          currentUserId = decoded.userId as number;
        }
      } catch (error) {
        // Token invalid, continue as guest
      }
    }

    // Get user by name (username)
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.name, username))
      .limit(1);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if current user is blocked by this user or has blocked this user
    if (currentUserId) {
      const [blocked] = await db
        .select()
        .from(blockedUsers)
        .where(
          or(
            and(
              eq(blockedUsers.userId, user.id),
              eq(blockedUsers.blockedUserId, currentUserId)
            ),
            and(
              eq(blockedUsers.userId, currentUserId),
              eq(blockedUsers.blockedUserId, user.id)
            )
          )
        )
        .limit(1);

      if (blocked) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }
    }

    // Get privacy settings from user
    const isPrivate = user.isPrivate || false;

    // Check if current user follows this user
    let isFollowing = false;
    let followStatus: 'not_following' | 'following' | 'requested' = 'not_following';
    
    if (currentUserId && currentUserId !== user.id) {
      const [follow] = await db
        .select()
        .from(follows)
        .where(
          and(
            eq(follows.followerId, currentUserId),
            eq(follows.followingId, user.id)
          )
        )
        .limit(1);

      if (follow) {
        if (follow.status === 'accepted') {
          isFollowing = true;
          followStatus = 'following';
        } else {
          followStatus = 'requested';
        }
      }
    }

    // Check if this user follows current user (follows back)
    let followsBack = false;
    if (currentUserId && currentUserId !== user.id) {
      const [follow] = await db
        .select()
        .from(follows)
        .where(
          and(
            eq(follows.followerId, user.id),
            eq(follows.followingId, currentUserId),
            eq(follows.status, 'accepted')
          )
        )
        .limit(1);

      followsBack = !!follow;
    }

    // Determine if current user can view posts
    const canViewPosts = 
      !isPrivate || 
      currentUserId === user.id || 
      isFollowing;

    // Get user posts count (if allowed)
    let userPosts: any[] = [];
    if (canViewPosts) {
      userPosts = await db
        .select()
        .from(posts)
        .where(eq(posts.userId, user.id))
        .orderBy(desc(posts.createdAt))
        .limit(12); // First 12 posts for grid
    }

    // Prepare response
    const profileData = {
      id: user.id,
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
      email: currentUserId === user.id ? user.email : undefined, // Only show email to owner
      avatar: user.avatar,
      coverPhoto: user.coverPhoto,
      bio: user.bio,
      website: user.website,
      location: user.location,
      work: user.work,
      education: user.education,
      postsCount: user.postsCount || 0,
      followersCount: user.hideFollowers && currentUserId !== user.id 
        ? null 
        : user.followersCount || 0,
      followingCount: user.hideFollowing && currentUserId !== user.id 
        ? null 
        : user.followingCount || 0,
      isPrivate,
      isFollowing,
      followStatus,
      followsBack,
      canViewPosts,
      isOwnProfile: currentUserId === user.id,
      posts: canViewPosts ? userPosts : [],
      createdAt: user.createdAt,
    };

    return NextResponse.json(profileData);
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}
