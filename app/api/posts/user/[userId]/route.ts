import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { posts, likes, comments } from '@/lib/db/schema';
import { eq, desc, sql } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const userId = parseInt(params.userId);

    if (isNaN(userId)) {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      );
    }

    // Get user posts with like and comment counts
    const userPosts = await db
      .select({
        id: posts.id,
        userId: posts.userId,
        content: posts.content,
        image: posts.imageUrl,
        createdAt: posts.createdAt,
        likes: sql<number>`(SELECT COUNT(*) FROM ${likes} WHERE ${likes.postId} = ${posts.id})`,
        comments: sql<number>`(SELECT COUNT(*) FROM ${comments} WHERE ${comments.postId} = ${posts.id})`,
      })
      .from(posts)
      .where(eq(posts.userId, userId))
      .orderBy(desc(posts.createdAt));

    return NextResponse.json({
      posts: userPosts,
    });
  } catch (error) {
    console.error('Error fetching user posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}
