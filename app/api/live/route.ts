import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';

const sql = neon(process.env.DATABASE_URL!);
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Start a live stream
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    const { title, description, isPrivate } = await request.json();

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    // Check if user already has an active stream
    const activeStream = await sql`
      SELECT id FROM live_streams
      WHERE user_id = ${decoded.userId} AND status = 'live'
    `;

    if (activeStream.length > 0) {
      return NextResponse.json(
        { error: 'You already have an active stream' },
        { status: 400 }
      );
    }

    // Generate a unique stream key and room ID
    const streamKey = `stream_${decoded.userId}_${Date.now()}`;
    const roomId = `live_${decoded.userId}_${Date.now()}`;

    // Create live stream
    const result = await sql`
      INSERT INTO live_streams (
        user_id,
        title,
        description,
        stream_key,
        room_id,
        is_private,
        status,
        started_at
      )
      VALUES (
        ${decoded.userId},
        ${title},
        ${description || null},
        ${streamKey},
        ${roomId},
        ${isPrivate || false},
        'live',
        NOW()
      )
      RETURNING id, user_id, title, description, stream_key, room_id, is_private, status, viewers_count, started_at
    `;

    return NextResponse.json({
      success: true,
      stream: {
        id: result[0].id,
        userId: result[0].user_id,
        title: result[0].title,
        description: result[0].description,
        streamKey: result[0].stream_key,
        roomId: result[0].room_id,
        isPrivate: result[0].is_private,
        status: result[0].status,
        viewersCount: result[0].viewers_count,
        startedAt: result[0].started_at,
      },
    });
  } catch (error) {
    console.error('Error starting live stream:', error);
    return NextResponse.json(
      { error: 'Failed to start live stream' },
      { status: 500 }
    );
  }
}

// Get active live streams
export async function GET(request: NextRequest) {
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

    // Get all active live streams
    const streams = await sql`
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
        u.name as user_name,
        u.username,
        u.avatar as user_avatar
      FROM live_streams ls
      JOIN users u ON ls.user_id = u.id
      WHERE ls.status = 'live'
        AND (
          ls.is_private = false
          OR ls.user_id = ${currentUserId || 0}
          OR EXISTS (
            SELECT 1 FROM follows
            WHERE follower_id = ${currentUserId || 0}
              AND following_id = ls.user_id
              AND status = 'accepted'
          )
        )
      ORDER BY ls.started_at DESC
    `;

    return NextResponse.json({
      success: true,
      streams: streams.map((s) => ({
        id: s.id,
        userId: s.user_id,
        userName: s.user_name,
        username: s.username,
        userAvatar: s.user_avatar,
        title: s.title,
        description: s.description,
        roomId: s.room_id,
        isPrivate: s.is_private,
        status: s.status,
        viewersCount: s.viewers_count,
        startedAt: s.started_at,
      })),
    });
  } catch (error) {
    console.error('Error fetching live streams:', error);
    return NextResponse.json(
      { error: 'Failed to fetch live streams' },
      { status: 500 }
    );
  }
}
