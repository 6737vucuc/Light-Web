import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';

const sql = neon(process.env.DATABASE_URL!);
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Add reaction to a story
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
    const { emoji } = await request.json();

    if (isNaN(storyId)) {
      return NextResponse.json({ error: 'Invalid story ID' }, { status: 400 });
    }

    if (!emoji) {
      return NextResponse.json({ error: 'Emoji is required' }, { status: 400 });
    }

    // Check if story exists
    const storyResult = await sql`
      SELECT id, user_id FROM stories WHERE id = ${storyId}
    `;

    if (storyResult.length === 0) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }

    // Check if already reacted
    const existingReaction = await sql`
      SELECT id FROM story_reactions
      WHERE story_id = ${storyId} AND user_id = ${decoded.userId}
    `;

    if (existingReaction.length > 0) {
      // Update existing reaction
      await sql`
        UPDATE story_reactions
        SET emoji = ${emoji}, created_at = NOW()
        WHERE story_id = ${storyId} AND user_id = ${decoded.userId}
      `;
    } else {
      // Add new reaction
      await sql`
        INSERT INTO story_reactions (story_id, user_id, emoji)
        VALUES (${storyId}, ${decoded.userId}, ${emoji})
      `;
    }

    return NextResponse.json({
      success: true,
      message: 'Reaction added',
    });
  } catch (error) {
    console.error('Error adding story reaction:', error);
    return NextResponse.json(
      { error: 'Failed to add reaction' },
      { status: 500 }
    );
  }
}

// Get reactions for a story (owner only)
export async function GET(
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

    // Check if user owns the story
    const storyResult = await sql`
      SELECT user_id FROM stories WHERE id = ${storyId}
    `;

    if (storyResult.length === 0) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }

    if (storyResult[0].user_id !== decoded.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get all reactions
    const reactions = await sql`
      SELECT 
        sr.id,
        sr.emoji,
        sr.created_at,
        sr.user_id,
        u.name as user_name,
        u.username,
        u.avatar as user_avatar
      FROM story_reactions sr
      JOIN users u ON sr.user_id = u.id
      WHERE sr.story_id = ${storyId}
      ORDER BY sr.created_at DESC
    `;

    return NextResponse.json({
      success: true,
      reactions: reactions.map((r) => ({
        id: r.id,
        emoji: r.emoji,
        userId: r.user_id,
        userName: r.user_name,
        username: r.username,
        userAvatar: r.user_avatar,
        createdAt: r.created_at,
      })),
    });
  } catch (error) {
    console.error('Error fetching story reactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reactions' },
      { status: 500 }
    );
  }
}

// Delete reaction
export async function DELETE(
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

    await sql`
      DELETE FROM story_reactions
      WHERE story_id = ${storyId} AND user_id = ${decoded.userId}
    `;

    return NextResponse.json({
      success: true,
      message: 'Reaction removed',
    });
  } catch (error) {
    console.error('Error removing story reaction:', error);
    return NextResponse.json(
      { error: 'Failed to remove reaction' },
      { status: 500 }
    );
  }
}
