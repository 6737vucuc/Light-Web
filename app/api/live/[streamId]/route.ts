import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';

const sql = neon(process.env.DATABASE_URL!);
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Get stream details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ streamId: string }> }
) {
  try {
    const token = request.cookies.get('token')?.value;
    let currentUserId: number | null = null;

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
        currentUserId = decoded.userId;
      } catch (error) {
        // Token invalid
      }
    }

    const { streamId: streamIdStr } = await params;
    const streamId = parseInt(streamIdStr);

    if (isNaN(streamId)) {
      return NextResponse.json({ error: 'Invalid stream ID' }, { status: 400 });
    }

    // Get stream details
    const result = await sql`
      SELECT 
        ls.id,
        ls.user_id,
        ls.title,
        ls.description,
        ls.room_id,
        ls.is_private,
        ls.status,
        ls.viewers_count,
        ls.started_at,
        ls.ended_at,
        ls.duration,
        u.name as user_name,
        u.username,
        u.avatar as user_avatar
      FROM live_streams ls
      JOIN users u ON ls.user_id = u.id
      WHERE ls.id = ${streamId}
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Stream not found' }, { status: 404 });
    }

    const stream = result[0];

    // Check if user can access private stream
    if (stream.is_private && stream.user_id !== currentUserId) {
      if (!currentUserId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const followCheck = await sql`
        SELECT id FROM follows
        WHERE follower_id = ${currentUserId}
          AND following_id = ${stream.user_id}
          AND status = 'accepted'
      `;

      if (followCheck.length === 0) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    return NextResponse.json({
      success: true,
      stream: {
        id: stream.id,
        userId: stream.user_id,
        userName: stream.user_name,
        username: stream.username,
        userAvatar: stream.user_avatar,
        title: stream.title,
        description: stream.description,
        roomId: stream.room_id,
        isPrivate: stream.is_private,
        status: stream.status,
        viewersCount: stream.viewers_count,
        startedAt: stream.started_at,
        endedAt: stream.ended_at,
        duration: stream.duration,
      },
    });
  } catch (error) {
    console.error('Error fetching stream details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stream details' },
      { status: 500 }
    );
  }
}

// End live stream
export async function PATCH(
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

    // Check if user owns the stream
    const streamResult = await sql`
      SELECT id, user_id, started_at FROM live_streams WHERE id = ${streamId}
    `;

    if (streamResult.length === 0) {
      return NextResponse.json({ error: 'Stream not found' }, { status: 404 });
    }

    if (streamResult[0].user_id !== decoded.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Calculate duration
    const duration = Math.floor(
      (Date.now() - new Date(streamResult[0].started_at).getTime()) / 1000
    );

    // End stream
    const result = await sql`
      UPDATE live_streams
      SET status = 'ended', ended_at = NOW(), duration = ${duration}
      WHERE id = ${streamId}
      RETURNING id, status, ended_at, duration
    `;

    return NextResponse.json({
      success: true,
      stream: result[0],
    });
  } catch (error) {
    console.error('Error ending live stream:', error);
    return NextResponse.json(
      { error: 'Failed to end live stream' },
      { status: 500 }
    );
  }
}

// Delete stream
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

    // Check if user owns the stream
    const streamResult = await sql`
      SELECT user_id FROM live_streams WHERE id = ${streamId}
    `;

    if (streamResult.length === 0) {
      return NextResponse.json({ error: 'Stream not found' }, { status: 404 });
    }

    if (streamResult[0].user_id !== decoded.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Delete stream
    await sql`DELETE FROM live_streams WHERE id = ${streamId}`;

    return NextResponse.json({
      success: true,
      message: 'Stream deleted',
    });
  } catch (error) {
    console.error('Error deleting live stream:', error);
    return NextResponse.json(
      { error: 'Failed to delete live stream' },
      { status: 500 }
    );
  }
}
