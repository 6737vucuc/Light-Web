import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';

const sql = neon(process.env.DATABASE_URL!);
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string }> }
) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    const { storyId: storyIdStr } = await params;
    const storyId = parseInt(storyIdStr);

    if (isNaN(storyId)) {
      return NextResponse.json({ error: 'Invalid story ID' }, { status: 400 });
    }

    // Check if story exists
    const storyResult = await sql`
      SELECT id, user_id FROM stories WHERE id = ${storyId}
    `;

    if (storyResult.length === 0) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }

    // Don't count views from story owner
    if (storyResult[0].user_id === decoded.userId) {
      return NextResponse.json({
        success: true,
        message: 'Story owner view not counted',
      });
    }

    // Check if already viewed
    const existingView = await sql`
      SELECT id FROM story_views
      WHERE story_id = ${storyId} AND user_id = ${decoded.userId}
    `;

    if (existingView.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'Already viewed',
      });
    }

    // Add view
    await sql`
      INSERT INTO story_views (story_id, user_id)
      VALUES (${storyId}, ${decoded.userId})
    `;

    // Update views count
    await sql`
      UPDATE stories
      SET views_count = views_count + 1
      WHERE id = ${storyId}
    `;

    return NextResponse.json({
      success: true,
      message: 'View recorded',
    });
  } catch (error) {
    console.error('Error recording story view:', error);
    return NextResponse.json(
      { error: 'Failed to record view' },
      { status: 500 }
    );
  }
}
