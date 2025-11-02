export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, follows, posts, lessonProgress, lessons, postTags } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth/middleware';
import { eq, and, or, desc, sql } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: paramId } = await params;
  const authResult = await requireAuth(request);
  
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const userId = parseInt(paramId);

    // Get user profile - Instagram style
    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        username: users.username,
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
        isPrivate: users.isPrivate,
        hideFollowers: users.hideFollowers,
        hideFollowing: users.hideFollowing,
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

    // Instagram-style stats
    // 1. Posts count
    const postsCountResult = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM ${posts}
      WHERE ${posts.userId} = ${userId}
    `);
    const postsCount = parseInt(String(postsCountResult.rows[0]?.count || '0'));

    // 2. Followers count
    const followersCountResult = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM ${follows}
      WHERE ${follows.followingId} = ${userId}
        AND ${follows.status} = 'accepted'
    `);
    const followersCount = parseInt(String(followersCountResult.rows[0]?.count || '0'));

    // 3. Following count
    const followingCountResult = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM ${follows}
      WHERE ${follows.followerId} = ${userId}
        AND ${follows.status} = 'accepted'
    `);
    const followingCount = parseInt(String(followingCountResult.rows[0]?.count || '0'));

    // Check follow status (am I following this user?)
    let isFollowing = false;
    let isFollowingMe = false;
    let followRequestPending = false;

    if (userId !== authResult.user.id) {
      // Check if I'm following them
      const [myFollow] = await db
        .select()
        .from(follows)
        .where(
          and(
            eq(follows.followerId, authResult.user.id),
            eq(follows.followingId, userId)
          )
        );

      if (myFollow) {
        if (myFollow.status === 'accepted') {
          isFollowing = true;
        } else if (myFollow.status === 'pending') {
          followRequestPending = true;
        }
      }

      // Check if they're following me
      const [theirFollow] = await db
        .select()
        .from(follows)
        .where(
          and(
            eq(follows.followerId, userId),
            eq(follows.followingId, authResult.user.id)
          )
        );

      if (theirFollow && theirFollow.status === 'accepted') {
        isFollowingMe = true;
      }
    }

    // Get recent posts (for Posts tab)
    const recentPosts = await db
      .select({
        id: posts.id,
        content: posts.content,
        imageUrl: posts.imageUrl,
        videoUrl: posts.videoUrl,
        mediaType: posts.mediaType,
        likesCount: posts.likesCount,
        commentsCount: posts.commentsCount,
        createdAt: posts.createdAt,
      })
      .from(posts)
      .where(eq(posts.userId, userId))
      .orderBy(desc(posts.createdAt))
      .limit(12); // Instagram shows 12 posts per page

    // Get posts with videos (for Reels tab)
    const reelsPosts = await db
      .select({
        id: posts.id,
        content: posts.content,
        videoUrl: posts.videoUrl,
        likesCount: posts.likesCount,
        commentsCount: posts.commentsCount,
        createdAt: posts.createdAt,
      })
      .from(posts)
      .where(
        and(
          eq(posts.userId, userId),
          sql`${posts.videoUrl} IS NOT NULL`
        )
      )
      .orderBy(desc(posts.createdAt))
      .limit(12);

    // Get tagged posts (for Tagged tab)
    const taggedPostsData = await db
      .select({
        id: posts.id,
        content: posts.content,
        imageUrl: posts.imageUrl,
        videoUrl: posts.videoUrl,
        mediaType: posts.mediaType,
        likesCount: posts.likesCount,
        commentsCount: posts.commentsCount,
        createdAt: posts.createdAt,
      })
      .from(posts)
      .innerJoin(postTags, eq(posts.id, postTags.postId))
      .where(eq(postTags.userId, userId))
      .orderBy(desc(posts.createdAt))
      .limit(12);

    // Get lesson progress (NEW - for Lessons tab)
    const lessonsProgressData = await db
      .select({
        lessonId: lessonProgress.lessonId,
        lessonTitle: lessons.title,
        lessonContent: lessons.content,
        lessonImageUrl: lessons.imageUrl,
        completed: lessonProgress.completed,
        progress: lessonProgress.progress,
        completedAt: lessonProgress.completedAt,
        createdAt: lessonProgress.createdAt,
      })
      .from(lessonProgress)
      .innerJoin(lessons, eq(lessonProgress.lessonId, lessons.id))
      .where(eq(lessonProgress.userId, userId))
      .orderBy(desc(lessonProgress.createdAt));

    // Calculate lessons stats
    const totalLessons = lessonsProgressData.length;
    const completedLessons = lessonsProgressData.filter(l => l.completed).length;
    const inProgressLessons = lessonsProgressData.filter(l => !l.completed && (l.progress || 0) > 0).length;
    const overallProgress = totalLessons > 0 
      ? Math.round((completedLessons / totalLessons) * 100) 
      : 0;

    // Build Instagram-style profile response
    const profile = {
      // Basic info
      id: user.id,
      name: user.name,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      coverPhoto: user.coverPhoto,
      bio: user.bio,
      location: user.location,
      work: user.work,
      education: user.education,
      website: user.website,
      relationshipStatus: user.relationshipStatus,
      birthDate: user.birthDate,
      createdAt: user.createdAt,
      
      // Privacy settings
      isPrivate: user.isPrivate,
      hideFollowers: user.hideFollowers,
      hideFollowing: user.hideFollowing,
      
      // Instagram-style stats
      stats: {
        posts: postsCount,
        followers: followersCount,
        following: followingCount,
      },
      
      // Follow status
      isFollowing,
      isFollowingMe,
      followRequestPending,
      isOwnProfile: userId === authResult.user.id,
      
      // Tabs content
      tabs: {
        // Posts tab
        posts: recentPosts,
        
        // Reels tab
        reels: reelsPosts,
        
        // Tagged tab
        tagged: taggedPostsData,
        
        // Lessons tab (NEW)
        lessons: {
          stats: {
            total: totalLessons,
            completed: completedLessons,
            inProgress: inProgressLessons,
            overallProgress: overallProgress,
          },
          progress: lessonsProgressData,
        },
      },
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
