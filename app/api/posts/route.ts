import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth/verify';
import { sql } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/posts - Get all community posts
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.userId || user.id;

    // Get posts with user info and user's reaction
    const posts = await db.execute(sql`
      SELECT 
        cp.id,
        cp.content,
        cp.image_url,
        cp.likes_count,
        cp.dislikes_count,
        cp.created_at,
        cp.user_id,
        u.id as author_id,
        u.name as author_name,
        u.avatar as author_avatar,
        pr.reaction_type as user_reaction
      FROM community_posts cp
      LEFT JOIN users u ON cp.user_id = u.id
      LEFT JOIN post_reactions pr ON cp.id = pr.post_id AND pr.user_id = ${userId}
      ORDER BY cp.created_at DESC
      LIMIT 100
    `);

    const formattedPosts = (posts.rows || []).map((post: any) => ({
      id: post.id,
      content: post.content,
      imageUrl: post.image_url,
      likesCount: post.likes_count || 0,
      dislikesCount: post.dislikes_count || 0,
      createdAt: post.created_at,
      userId: post.user_id,
      author: {
        id: post.author_id,
        name: post.author_name || 'Unknown',
        avatar: post.author_avatar,
      },
      userReaction: post.user_reaction || null,
    }));

    return NextResponse.json({ posts: formattedPosts });
  } catch (error) {
    console.error('Posts GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/posts - Create a new post
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.userId || user.id;
    const body = await request.json();
    const { content, imageUrl } = body;

    // Validate content
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    if (content.trim().length > 1000) {
      return NextResponse.json({ error: 'Content too long (max 1000 characters)' }, { status: 400 });
    }

    // Sanitize content
    const sanitizedContent = content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();

    const result = await db.execute(sql`
      INSERT INTO community_posts (user_id, content, image_url)
      VALUES (${userId}, ${sanitizedContent}, ${imageUrl || null})
      RETURNING 
        id,
        content,
        image_url,
        likes_count,
        dislikes_count,
        created_at,
        user_id
    `);

    const post = result.rows?.[0];
    if (!post) {
      return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
    }

    // Get user info
    const userInfo = await db.execute(sql`
      SELECT id, name, avatar FROM users WHERE id = ${userId}
    `);

    const userData = userInfo.rows?.[0];

    const formattedPost = {
      id: post.id,
      content: post.content,
      imageUrl: post.image_url,
      likesCount: 0,
      dislikesCount: 0,
      createdAt: post.created_at,
      userId: post.user_id,
      author: {
        id: userData?.id,
        name: userData?.name || 'Unknown',
        avatar: userData?.avatar,
      },
      userReaction: null,
    };

    return NextResponse.json({ post: formattedPost }, { status: 201 });
  } catch (error) {
    console.error('Posts POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
