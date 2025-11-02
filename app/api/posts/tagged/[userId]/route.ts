import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { postTags, posts, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: userIdStr } = await params;
    const userId = parseInt(userIdStr);

    // Get tagged posts
    const tagged = await db
      .select({
        post: posts,
        user: users,
      })
      .from(postTags)
      .innerJoin(posts, eq(postTags.postId, posts.id))
      .innerJoin(users, eq(posts.userId, users.id))
      .where(eq(postTags.userId, userId))
      .orderBy(postTags.createdAt);

    const formattedPosts = tagged.map((item) => ({
      id: item.post.id,
      userId: item.post.userId,
      userName: item.user.name,
      userAvatar: item.user.avatar,
      content: item.post.content,
      imageUrl: item.post.imageUrl,
      videoUrl: item.post.videoUrl,
      likesCount: item.post.likesCount,
      commentsCount: item.post.commentsCount,
      sharesCount: item.post.sharesCount,
      createdAt: item.post.createdAt,
    }));

    return NextResponse.json({ posts: formattedPosts });
  } catch (error) {
    console.error('Error fetching tagged posts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
