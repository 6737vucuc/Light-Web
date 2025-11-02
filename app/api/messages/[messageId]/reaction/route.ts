import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';

const sql = neon(process.env.DATABASE_URL!);
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Add reaction to a message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    const { messageId: messageIdStr } = await params;
    const messageId = parseInt(messageIdStr);
    const { emoji } = await request.json();

    if (isNaN(messageId)) {
      return NextResponse.json({ error: 'Invalid message ID' }, { status: 400 });
    }

    if (!emoji) {
      return NextResponse.json({ error: 'Emoji is required' }, { status: 400 });
    }

    // Check if message exists and user is part of conversation
    const messageResult = await sql`
      SELECT id, sender_id, receiver_id FROM messages WHERE id = ${messageId}
    `;

    if (messageResult.length === 0) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    const message = messageResult[0];
    if (
      message.sender_id !== decoded.userId &&
      message.receiver_id !== decoded.userId
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check if already reacted
    const existingReaction = await sql`
      SELECT id FROM message_reactions
      WHERE message_id = ${messageId} AND user_id = ${decoded.userId}
    `;

    if (existingReaction.length > 0) {
      // Update existing reaction
      await sql`
        UPDATE message_reactions
        SET emoji = ${emoji}, created_at = NOW()
        WHERE message_id = ${messageId} AND user_id = ${decoded.userId}
      `;
    } else {
      // Add new reaction
      await sql`
        INSERT INTO message_reactions (message_id, user_id, emoji)
        VALUES (${messageId}, ${decoded.userId}, ${emoji})
      `;
    }

    return NextResponse.json({
      success: true,
      message: 'Reaction added',
    });
  } catch (error) {
    console.error('Error adding message reaction:', error);
    return NextResponse.json(
      { error: 'Failed to add reaction' },
      { status: 500 }
    );
  }
}

// Get reactions for a message
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    const { messageId: messageIdStr } = await params;
    const messageId = parseInt(messageIdStr);

    if (isNaN(messageId)) {
      return NextResponse.json({ error: 'Invalid message ID' }, { status: 400 });
    }

    // Check if user is part of conversation
    const messageResult = await sql`
      SELECT sender_id, receiver_id FROM messages WHERE id = ${messageId}
    `;

    if (messageResult.length === 0) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    const message = messageResult[0];
    if (
      message.sender_id !== decoded.userId &&
      message.receiver_id !== decoded.userId
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get all reactions
    const reactions = await sql`
      SELECT 
        mr.id,
        mr.emoji,
        mr.user_id,
        mr.created_at,
        u.name as user_name,
        u.username,
        u.avatar as user_avatar
      FROM message_reactions mr
      JOIN users u ON mr.user_id = u.id
      WHERE mr.message_id = ${messageId}
      ORDER BY mr.created_at ASC
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
    console.error('Error fetching message reactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reactions' },
      { status: 500 }
    );
  }
}

// Delete reaction
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    const { messageId: messageIdStr } = await params;
    const messageId = parseInt(messageIdStr);

    if (isNaN(messageId)) {
      return NextResponse.json({ error: 'Invalid message ID' }, { status: 400 });
    }

    await sql`
      DELETE FROM message_reactions
      WHERE message_id = ${messageId} AND user_id = ${decoded.userId}
    `;

    return NextResponse.json({
      success: true,
      message: 'Reaction removed',
    });
  } catch (error) {
    console.error('Error removing message reaction:', error);
    return NextResponse.json(
      { error: 'Failed to remove reaction' },
      { status: 500 }
    );
  }
}
