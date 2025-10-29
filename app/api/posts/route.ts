import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { posts, likes, users } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth/middleware';
import { desc, eq, sql } from 'drizzle-orm';

// GET all posts
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const allPosts = await db
      .select({
        id: posts.id,
        userId: posts.userId,
        userName: users.name,
        userAvatar: users.avatar,
        content: posts.content,
        imageUrl: posts.imageUrl,
        likesCount: posts.likesCount,
        commentsCount: posts.commentsCount,
        createdAt: posts.createdAt,
        isLiked: sql<boolean>`EXISTS (SELECT 1 FROM ${likes} WHERE ${likes.postId} = ${posts.id} AND ${likes.userId} = ${authResult.user.id})`,
      })
      .from(posts)
      .leftJoin(users, eq(posts.userId, users.id))
      .orderBy(desc(posts.createdAt));

    return NextResponse.json({ posts: allPosts });
  } catch (error) {
    console.error('Error fetching posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}

// POST create new post
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
    const { content, imageUrl } = body;

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    const [newPost] = await db.insert(posts).values({
      userId: authResult.user.id,
      content,
      imageUrl,
    }).returning();

    return NextResponse.json({ post: newPost }, { status: 201 });
  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json(
      { error: 'Failed to create post' },
      { status: 500 }
    );
  }
}

