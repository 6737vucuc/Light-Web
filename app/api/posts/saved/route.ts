import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { savedPosts, posts, users } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
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

    const userId = decoded.userId as number;

    // Get saved posts
    const saved = await db
      .select({
        post: posts,
        user: users,
      })
      .from(savedPosts)
      .innerJoin(posts, eq(savedPosts.postId, posts.id))
      .innerJoin(users, eq(posts.userId, users.id))
      .where(eq(savedPosts.userId, userId))
      .orderBy(savedPosts.createdAt);

    const formattedPosts = saved.map((item) => ({
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
    console.error('Error fetching saved posts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Save a post
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = decoded.userId as number;
    const { postId } = await request.json();

    // Check if already saved
    const existing = await db
      .select()
      .from(savedPosts)
      .where(
        and(
          eq(savedPosts.userId, userId),
          eq(savedPosts.postId, postId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Unsave
      await db
        .delete(savedPosts)
        .where(
          and(
            eq(savedPosts.userId, userId),
            eq(savedPosts.postId, postId)
          )
        );

      return NextResponse.json({ saved: false });
    } else {
      // Save
      await db.insert(savedPosts).values({
        userId,
        postId,
      });

      return NextResponse.json({ saved: true });
    }
  } catch (error) {
    console.error('Error saving post:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
