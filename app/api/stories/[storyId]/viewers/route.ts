export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';

// GET /api/stories/[storyId]/viewers - Get story viewers
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ storyId: string }> }
) {
  const authResult = await requireAuth(request);
  
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  const { user } = authResult;
  const params = await context.params;
  const storyId = parseInt(params.storyId);

  try {
    // Check if user owns the story
    const storyCheck = await sql`
      SELECT user_id FROM stories WHERE id = ${storyId}
    `;

    if (storyCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Story not found' },
        { status: 404 }
      );
    }

    const story = storyCheck[0];

    if (story.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Get viewers
    const viewers = await sql`
      SELECT 
        sv.viewed_at,
        u.id,
        u.name,
        u.avatar
      FROM story_views sv
      JOIN users u ON sv.user_id = u.id
      WHERE sv.story_id = ${storyId}
      ORDER BY sv.viewed_at DESC
    `;

    return NextResponse.json({
      success: true,
      viewers: viewers.map((v: any) => ({
        id: v.id,
        name: v.name,
        avatar: v.avatar,
        viewedAt: v.viewed_at,
      })),
    });
  } catch (error) {
    console.error('Error fetching viewers:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch viewers' },
      { status: 500 }
    );
  }
}
