import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';

const sql = neon(process.env.DATABASE_URL!);
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Send voice message
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    const { receiverId, voiceUrl, duration } = await request.json();

    if (!receiverId || !voiceUrl) {
      return NextResponse.json(
        { error: 'Receiver ID and voice URL are required' },
        { status: 400 }
      );
    }

    // Check if receiver exists
    const receiverResult = await sql`
      SELECT id FROM users WHERE id = ${receiverId}
    `;

    if (receiverResult.length === 0) {
      return NextResponse.json({ error: 'Receiver not found' }, { status: 404 });
    }

    // Check if blocked
    const blockCheck = await sql`
      SELECT id FROM blocked_users
      WHERE (user_id = ${receiverId} AND blocked_user_id = ${decoded.userId})
         OR (user_id = ${decoded.userId} AND blocked_user_id = ${receiverId})
    `;

    if (blockCheck.length > 0) {
      return NextResponse.json({ error: 'Cannot send message' }, { status: 403 });
    }

    // Create voice message
    const result = await sql`
      INSERT INTO messages (
        sender_id, 
        receiver_id, 
        content, 
        message_type, 
        media_url,
        voice_duration
      )
      VALUES (
        ${decoded.userId}, 
        ${receiverId}, 
        'Voice message', 
        'voice',
        ${voiceUrl},
        ${duration || 0}
      )
      RETURNING id, sender_id, receiver_id, content, message_type, media_url, voice_duration, created_at
    `;

    return NextResponse.json({
      success: true,
      message: result[0],
    });
  } catch (error) {
    console.error('Error sending voice message:', error);
    return NextResponse.json(
      { error: 'Failed to send voice message' },
      { status: 500 }
    );
  }
}
