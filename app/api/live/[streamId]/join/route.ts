import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';

const sql = neon(process.env.DATABASE_URL!);
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Join live stream (increment viewers)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ streamId: string }> }
) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    const { streamId: streamIdStr } = await params;
    const streamId = parseInt(streamIdStr);

    if (isNaN(streamId)) {
      return NextResponse.json({ error: 'Invalid stream ID' }, { status: 400 });
    }

    // Check if stream exists and is live
    const streamResult = await sql`
      SELECT id, user_id, is_private FROM live_streams
      WHERE id = ${streamId} AND status = 'live'
    `;

    if (streamResult.length === 0) {
      return NextResponse.json(
        { error: 'Stream not found or not live' },
        { status: 404 }
      );
    }

    const stream = streamResult[0];

    // Check if user can access private stream
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

    // Add viewer
    const existingViewer = await sql`
      SELECT id FROM stream_viewers
      WHERE stream_id = ${streamId} AND user_id = ${decoded.userId}
    `;

    if (existingViewer.length === 0) {
      await sql`
        INSERT INTO stream_viewers (stream_id, user_id, joined_at)
        VALUES (${streamId}, ${decoded.userId}, NOW())
      `;

      // Increment viewers count
      await sql`
        UPDATE live_streams
        SET viewers_count = viewers_count + 1
        WHERE id = ${streamId}
      `;
    }

    return NextResponse.json({
      success: true,
      message: 'Joined stream',
    });
  } catch (error) {
    console.error('Error joining live stream:', error);
    return NextResponse.json(
      { error: 'Failed to join live stream' },
      { status: 500 }
    );
  }
}

// Leave live stream (decrement viewers)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ streamId: string }> }
) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    const { streamId: streamIdStr } = await params;
    const streamId = parseInt(streamIdStr);

    if (isNaN(streamId)) {
      return NextResponse.json({ error: 'Invalid stream ID' }, { status: 400 });
    }

    // Remove viewer
    const result = await sql`
      DELETE FROM stream_viewers
      WHERE stream_id = ${streamId} AND user_id = ${decoded.userId}
      RETURNING id
    `;

    if (result.length > 0) {
      // Decrement viewers count
      await sql`
        UPDATE live_streams
        SET viewers_count = GREATEST(viewers_count - 1, 0)
        WHERE id = ${streamId}
      `;
    }

    return NextResponse.json({
      success: true,
      message: 'Left stream',
    });
  } catch (error) {
    console.error('Error leaving live stream:', error);
    return NextResponse.json(
      { error: 'Failed to leave live stream' },
      { status: 500 }
    );
  }
}
