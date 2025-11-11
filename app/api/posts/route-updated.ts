export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { posts, likes, users, follows, savedPosts, postTags } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth/middleware';
import { desc, eq, sql, and, or, inArray } from 'drizzle-orm';

// GET posts - Instagram-style feed
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
    const feedType = searchParams.get('type') || 'following'; // 'following', 'explore', 'user'
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query;

    if (feedType === 'following') {
      // Get posts from users that current user follows
      const following = await db
        .select({ followingId: follows.followingId })
        .from(follows)
        .where(
          and(
            eq(follows.followerId, authResult.user.id),
            eq(follows.status, 'accepted')
          )
        );

      const followingIds = following.map(f => f.followingId);
      followingIds.push(authResult.user.id); // Include own posts

      query = db
        .select({
          id: posts.id,
          userId: posts.userId,
          userName: users.name,
          username: users.username,
          userAvatar: users.avatar,
          content: posts.content,
          imageUrl: posts.imageUrl,
          videoUrl: posts.videoUrl,
          mediaType: posts.mediaType,
          location: posts.location,
          likesCount: posts.likesCount,
          commentsCount: posts.commentsCount,
          sharesCount: posts.sharesCount,
          privacy: posts.privacy,
          createdAt: posts.createdAt,
          isLiked: sql<boolean>`EXISTS (SELECT 1 FROM ${likes} WHERE ${likes.postId} = ${posts.id} AND ${likes.userId} = ${authResult.user.id})`,
          isSaved: sql<boolean>`EXISTS (SELECT 1 FROM ${savedPosts} WHERE ${savedPosts.postId} = ${posts.id} AND ${savedPosts.userId} = ${authResult.user.id})`,
        })
        .from(posts)
        .leftJoin(users, eq(posts.userId, users.id))
        .where(
          and(
            inArray(posts.userId, followingIds),
            or(
              eq(posts.privacy, 'public'),
              eq(posts.privacy, 'followers')
            )
          )
        )
        .orderBy(desc(posts.createdAt))
        .limit(limit)
        .offset(offset);

    } else if (feedType === 'explore') {
      // Explore feed - public posts from all users
      query = db
        .select({
          id: posts.id,
          userId: posts.userId,
          userName: users.name,
          username: users.username,
          userAvatar: users.avatar,
          content: posts.content,
          imageUrl: posts.imageUrl,
          videoUrl: posts.videoUrl,
          mediaType: posts.mediaType,
          location: posts.location,
          likesCount: posts.likesCount,
          commentsCount: posts.commentsCount,
          sharesCount: posts.sharesCount,
          privacy: posts.privacy,
          createdAt: posts.createdAt,
          isLiked: sql<boolean>`EXISTS (SELECT 1 FROM ${likes} WHERE ${likes.postId} = ${posts.id} AND ${likes.userId} = ${authResult.user.id})`,
          isSaved: sql<boolean>`EXISTS (SELECT 1 FROM ${savedPosts} WHERE ${savedPosts.postId} = ${posts.id} AND ${savedPosts.userId} = ${authResult.user.id})`,
        })
        .from(posts)
        .leftJoin(users, eq(posts.userId, users.id))
        .where(eq(posts.privacy, 'public'))
        .orderBy(desc(posts.likesCount), desc(posts.createdAt))
        .limit(limit)
        .offset(offset);

    } else if (feedType === 'user' && userId) {
      // User profile posts
      const targetUserId = parseInt(userId);
      
      // Check if user is private and not following
      const [targetUser] = await db
        .select({ isPrivate: users.isPrivate })
        .from(users)
        .where(eq(users.id, targetUserId))
        .limit(1);

      if (targetUser?.isPrivate && targetUserId !== authResult.user.id) {
        // Check if following
        const [isFollowing] = await db
          .select()
          .from(follows)
          .where(
            and(
              eq(follows.followerId, authResult.user.id),
              eq(follows.followingId, targetUserId),
              eq(follows.status, 'accepted')
            )
          )
          .limit(1);

        if (!isFollowing) {
          return NextResponse.json({
            success: true,
            posts: [],
            message: 'This account is private'
          });
        }
      }

      query = db
        .select({
          id: posts.id,
          userId: posts.userId,
          userName: users.name,
          username: users.username,
          userAvatar: users.avatar,
          content: posts.content,
          imageUrl: posts.imageUrl,
          videoUrl: posts.videoUrl,
          mediaType: posts.mediaType,
          location: posts.location,
          likesCount: posts.likesCount,
          commentsCount: posts.commentsCount,
          sharesCount: posts.sharesCount,
          privacy: posts.privacy,
          createdAt: posts.createdAt,
          isLiked: sql<boolean>`EXISTS (SELECT 1 FROM ${likes} WHERE ${likes.postId} = ${posts.id} AND ${likes.userId} = ${authResult.user.id})`,
          isSaved: sql<boolean>`EXISTS (SELECT 1 FROM ${savedPosts} WHERE ${savedPosts.postId} = ${posts.id} AND ${savedPosts.userId} = ${authResult.user.id})`,
        })
        .from(posts)
        .leftJoin(users, eq(posts.userId, users.id))
        .where(eq(posts.userId, targetUserId))
        .orderBy(desc(posts.createdAt))
        .limit(limit)
        .offset(offset);

    } else {
      return NextResponse.json(
        { error: 'Invalid feed type' },
        { status: 400 }
      );
    }

    const allPosts = await query;

    // Get tagged users for each post
    const postsWithTags = await Promise.all(
      allPosts.map(async (post) => {
        const tags = await db
          .select({
            userId: postTags.userId,
            userName: users.name,
            username: users.username,
          })
          .from(postTags)
          .leftJoin(users, eq(postTags.userId, users.id))
          .where(eq(postTags.postId, post.id));

        return {
          ...post,
          taggedUsers: tags,
        };
      })
    );

    return NextResponse.json({
      success: true,
      posts: postsWithTags,
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}

// POST create new post - Instagram-style
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const body = await request.json();
    const {
      content,
      imageUrl,
      videoUrl,
      mediaType,
      location,
      privacy,
      taggedUsers, // Array of user IDs
    } = body;

    // Validate: either content or media is required
    if (!content && !imageUrl && !videoUrl) {
      return NextResponse.json(
        { error: 'Content or media is required' },
        { status: 400 }
      );
    }

    // Validate media type
    const validMediaTypes = ['text', 'image', 'video', 'carousel'];
    const finalMediaType = mediaType || (imageUrl ? 'image' : videoUrl ? 'video' : 'text');
    
    if (!validMediaTypes.includes(finalMediaType)) {
      return NextResponse.json(
        { error: 'Invalid media type' },
        { status: 400 }
      );
    }

    // Validate privacy
    const validPrivacy = ['public', 'followers', 'private'];
    const finalPrivacy = privacy || 'public';
    
    if (!validPrivacy.includes(finalPrivacy)) {
      return NextResponse.json(
        { error: 'Invalid privacy setting' },
        { status: 400 }
      );
    }

    // Create post
    const [newPost] = await db
      .insert(posts)
      .values({
        userId: authResult.user.id,
        content: content || null,
        imageUrl: imageUrl || null,
        videoUrl: videoUrl || null,
        mediaType: finalMediaType,
        location: location || null,
        privacy: finalPrivacy,
      })
      .returning();

    // Add tagged users
    if (taggedUsers && Array.isArray(taggedUsers) && taggedUsers.length > 0) {
      await db
        .insert(postTags)
        .values(
          taggedUsers.map((userId: number) => ({
            postId: newPost.id,
            userId,
          }))
        );
    }

    // Update user's posts count
    await db
      .update(users)
      .set({
        postsCount: sql`${users.postsCount} + 1`,
      })
      .where(eq(users.id, authResult.user.id));

    return NextResponse.json({
      success: true,
      post: newPost,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json(
      { error: 'Failed to create post' },
      { status: 500 }
    );
  }
}

// DELETE post
export async function DELETE(request: NextRequest) {
  const authResult = await requireAuth(request);
  
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId');

    if (!postId) {
      return NextResponse.json(
        { error: 'Post ID is required' },
        { status: 400 }
      );
    }

    // Check if user owns the post
    const [post] = await db
      .select()
      .from(posts)
      .where(eq(posts.id, parseInt(postId)))
      .limit(1);

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      );
    }

    if (post.userId !== authResult.user.id && !authResult.user.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Delete post
    await db
      .delete(posts)
      .where(eq(posts.id, parseInt(postId)));

    // Update user's posts count
    await db
      .update(users)
      .set({
        postsCount: sql`GREATEST(${users.postsCount} - 1, 0)`,
      })
      .where(eq(users.id, post.userId));

    return NextResponse.json({
      success: true,
      message: 'Post deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting post:', error);
    return NextResponse.json(
      { error: 'Failed to delete post' },
      { status: 500 }
    );
  }
}
