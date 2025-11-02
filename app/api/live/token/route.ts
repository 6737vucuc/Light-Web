import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';
import { generateBroadcastToken, generateViewerToken } from '@/lib/livekit';

const sql = neon(process.env.DATABASE_URL!);
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Generate LiveKit token for live streaming
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    const { streamId, role } = await request.json();

    if (!streamId) {
      return NextResponse.json({ error: 'Stream ID is required' }, { status: 400 });
    }

    if (!role || !['broadcaster', 'viewer'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Get stream details
    const streamResult = await sql`
      SELECT 
        ls.id,
        ls.user_id,
        ls.room_id,
        ls.title,
        ls.is_private,
        ls.status,
        u.name as user_name,
        u.username
      FROM live_streams ls
      JOIN users u ON u.id = ${decoded.userId}
      WHERE ls.id = ${streamId}
    `;

    if (streamResult.length === 0) {
      return NextResponse.json({ error: 'Stream not found' }, { status: 404 });
    }

    const stream = streamResult[0];

    // Check if stream is live
    if (stream.status !== 'live') {
      return NextResponse.json({ error: 'Stream is not live' }, { status: 400 });
    }

    // Check permissions
    if (role === 'broadcaster') {
      // Only stream owner can broadcast
      if (stream.user_id !== decoded.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }

      // Generate broadcaster token
      const livekitToken = await generateBroadcastToken(
        stream.room_id,
        stream.user_name || stream.username,
        `user_${decoded.userId}`
      );

      return NextResponse.json({
        success: true,
        token: livekitToken,
        roomId: stream.room_id,
        role: 'broadcaster',
      });
    } else {
      // Viewer
      // Check if user can view private stream
      if (stream.is_private && stream.user_id !== decoded.userId) {
        const followCheck = await sql`
          SELECT id FROM follows
          WHERE follower_id = ${decoded.userId}
            AND following_id = ${stream.user_id}
            AND status = 'accepted'
        `;

        if (followCheck.length === 0) {
          return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }
      }

      // Generate viewer token
      const livekitToken = await generateViewerToken(
        stream.room_id,
        stream.user_name || stream.username,
        `user_${decoded.userId}`
      );

      return NextResponse.json({
        success: true,
        token: livekitToken,
        roomId: stream.room_id,
        role: 'viewer',
      });
    }
  } catch (error) {
    console.error('Error generating LiveKit token for stream:', error);
    return NextResponse.json(
      { error: 'Failed to generate token' },
      { status: 500 }
    );
  }
}
