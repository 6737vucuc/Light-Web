import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';
import { sql } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const { storyId, reaction } = await request.json();

    if (!storyId || !reaction) {
      return NextResponse.json(
        { error: 'Story ID and reaction are required' },
        { status: 400 }
      );
    }

    // Store reaction in database (you can create a story_reactions table)
    // For now, we'll just return success
    // In production, you would:
    // 1. Check if user already reacted to this story
    // 2. Update or insert the reaction
    // 3. Optionally send notification to story owner

    await db.execute(sql`
      INSERT INTO story_reactions (story_id, user_id, reaction, created_at)
      VALUES (${storyId}, ${authResult.user.id}, ${reaction}, NOW())
      ON CONFLICT (story_id, user_id) 
      DO UPDATE SET reaction = ${reaction}, created_at = NOW()
    `);

    return NextResponse.json({
      message: 'Reaction sent successfully',
      reaction,
    });
  } catch (error) {
    console.error('Error sending reaction:', error);
    return NextResponse.json(
      { error: 'Failed to send reaction' },
      { status: 500 }
    );
  }
}
