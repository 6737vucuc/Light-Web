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
    const { userId } = await params;
    const targetUserId = parseInt(userId);

    if (isNaN(targetUserId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    // Get current user from token
    let currentUserId: number | null = null;
    const token = request.cookies.get('token')?.value;

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
        currentUserId = decoded.userId;
      } catch (error) {
        // Token invalid
      }
    }

    // Check if user exists
    const userResult = await sql`
      SELECT id, is_private
      FROM users
      WHERE id = ${targetUserId}
    `;

    if (userResult.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = userResult[0];
    const isOwnProfile = currentUserId === targetUserId;

    // If private account and not own profile, check if following
    if (user.is_private && !isOwnProfile) {
      if (!currentUserId) {
        return NextResponse.json({
          progress: [],
          message: 'This account is private',
        });
      }

      const followResult = await sql`
        SELECT id, status
        FROM follows
        WHERE follower_id = ${currentUserId}
          AND following_id = ${targetUserId}
          AND status = 'accepted'
      `;

      if (followResult.length === 0) {
        return NextResponse.json({
          progress: [],
          message: 'This account is private',
        });
      }
    }

    // Fetch lesson progress
    const progress = await sql`
      SELECT 
        lp.lesson_id,
        lp.user_id,
        lp.completed,
        lp.progress,
        lp.last_watched_at,
        lp.completed_at,
        l.id as lesson_id,
        l.title,
        l.content,
        l.image_url,
        l.created_at as lesson_created_at
      FROM lesson_progress lp
      JOIN lessons l ON lp.lesson_id = l.id
      WHERE lp.user_id = ${targetUserId}
      ORDER BY lp.last_watched_at DESC
    `;

    return NextResponse.json({
      success: true,
      progress: progress.map((p) => ({
        lessonId: p.lesson_id,
        userId: p.user_id,
        completed: p.completed,
        progress: p.progress,
        lastWatchedAt: p.last_watched_at,
        completedAt: p.completed_at,
        lesson: {
          id: p.lesson_id,
          title: p.title,
          content: p.content,
          imageUrl: p.image_url,
          createdAt: p.lesson_created_at,
        },
      })),
    });
  } catch (error) {
    console.error('Error fetching lesson progress:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lesson progress' },
      { status: 500 }
    );
  }
}
