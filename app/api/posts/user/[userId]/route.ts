import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';

const sql = neon(process.env.DATABASE_URL!);
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: userIdStr } = await params;
    const userId = parseInt(userIdStr);

    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    // Get current user from token (if logged in)
    let currentUserId: number | null = null;
    const token = request.cookies.get('token')?.value;

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
        currentUserId = decoded.userId;
      } catch (error) {
        // Token invalid, continue as guest
      }
    }

    // Check if the profile is private and if current user is allowed to view
    const userResult = await sql`
      SELECT id, is_private
      FROM users
      WHERE id = ${userId}
    `;

    if (userResult.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = userResult[0];
    const isOwnProfile = currentUserId === userId;

    // If private account and not own profile, check if following
    if (user.is_private && !isOwnProfile) {
      if (!currentUserId) {
        return NextResponse.json({
          posts: [],
          message: 'This account is private',
        });
      }

      const followResult = await sql`
        SELECT id, status
        FROM follows
        WHERE follower_id = ${currentUserId}
          AND following_id = ${userId}
          AND status = 'accepted'
      `;

      if (followResult.length === 0) {
        return NextResponse.json({
          posts: [],
          message: 'This account is private',
        });
      }
    }

    // Fetch posts
    const posts = await sql`
      SELECT 
        p.id,
        p.user_id,
        p.content,
        p.image_url,
        p.video_url,
        p.media_type,
        p.likes_count,
        p.comments_count,
        p.shares_count,
        p.privacy,
        p.location,
        p.created_at,
        u.name as user_name,
        u.username,
        u.avatar as user_avatar
      FROM posts p
      JOIN users u ON p.user_id = u.id
      WHERE p.user_id = ${userId}
      ORDER BY p.created_at DESC
      LIMIT 50
    `;

    return NextResponse.json({
      success: true,
      posts: posts.map((post) => ({
        id: post.id,
        userId: post.user_id,
        content: post.content,
        imageUrl: post.image_url,
        videoUrl: post.video_url,
        mediaType: post.media_type,
        likesCount: post.likes_count,
        commentsCount: post.comments_count,
        sharesCount: post.shares_count,
        privacy: post.privacy,
        location: post.location,
        createdAt: post.created_at,
        user: {
          name: post.user_name,
          username: post.username,
          avatar: post.user_avatar,
        },
      })),
    });
  } catch (error) {
    console.error('Error fetching user posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    );
  }
}
