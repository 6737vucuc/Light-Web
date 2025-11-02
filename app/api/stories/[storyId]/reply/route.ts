import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';

const sql = neon(process.env.DATABASE_URL!);
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Send reply to a story
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
    const { message } = await request.json();

    if (isNaN(storyId)) {
      return NextResponse.json({ error: 'Invalid story ID' }, { status: 400 });
    }

    if (!message || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Get story owner
    const storyResult = await sql`
      SELECT user_id FROM stories WHERE id = ${storyId}
    `;

    if (storyResult.length === 0) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }

    const storyOwnerId = storyResult[0].user_id;

    // Check if user is blocked
    const blockCheck = await sql`
      SELECT id FROM blocked_users
      WHERE (user_id = ${storyOwnerId} AND blocked_user_id = ${decoded.userId})
         OR (user_id = ${decoded.userId} AND blocked_user_id = ${storyOwnerId})
    `;

    if (blockCheck.length > 0) {
      return NextResponse.json({ error: 'Cannot send reply' }, { status: 403 });
    }

    // Create a direct message as story reply
    const result = await sql`
      INSERT INTO messages (sender_id, receiver_id, content, message_type, story_id)
      VALUES (${decoded.userId}, ${storyOwnerId}, ${message}, 'story_reply', ${storyId})
      RETURNING id, sender_id, receiver_id, content, message_type, story_id, created_at
    `;

    return NextResponse.json({
      success: true,
      reply: result[0],
    });
  } catch (error) {
    console.error('Error sending story reply:', error);
    return NextResponse.json(
      { error: 'Failed to send reply' },
      { status: 500 }
    );
  }
}

// Get replies for a story (owner only)
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

    // Get all replies
    const replies = await sql`
      SELECT 
        m.id,
        m.sender_id,
        m.content,
        m.created_at,
        u.name as sender_name,
        u.username as sender_username,
        u.avatar as sender_avatar
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.story_id = ${storyId}
        AND m.message_type = 'story_reply'
      ORDER BY m.created_at DESC
    `;

    return NextResponse.json({
      success: true,
      replies: replies.map((r) => ({
        id: r.id,
        senderId: r.sender_id,
        senderName: r.sender_name,
        senderUsername: r.sender_username,
        senderAvatar: r.sender_avatar,
        content: r.content,
        createdAt: r.created_at,
      })),
    });
  } catch (error) {
    console.error('Error fetching story replies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch replies' },
      { status: 500 }
    );
  }
}
