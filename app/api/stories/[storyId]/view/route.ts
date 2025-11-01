export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';

// POST /api/stories/[storyId]/view - Mark story as viewed
export async function POST(
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
    // Check if story exists
    const storyCheck = await sql`
      SELECT id, user_id FROM stories WHERE id = ${storyId}
    `;

    if (storyCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Story not found' },
        { status: 404 }
      );
    }

    const story = storyCheck[0];

    // Don't record view if it's the user's own story
    if (story.user_id === user.id) {
      return NextResponse.json({
        success: true,
        message: 'Own story view not recorded',
      });
    }

    // Check if already viewed
    const existingView = await sql`
      SELECT id FROM story_views 
      WHERE story_id = ${storyId} AND user_id = ${user.id}
    `;

    if (existingView.length === 0) {
      // Record new view
      await sql`
        INSERT INTO story_views (story_id, user_id, viewed_at)
        VALUES (${storyId}, ${user.id}, NOW())
      `;
    }

    return NextResponse.json({
      success: true,
      message: 'Story view recorded',
    });
  } catch (error) {
    console.error('Error recording story view:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to record view' },
      { status: 500 }
    );
  }
}
