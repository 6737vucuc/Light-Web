import { NextRequest, NextResponse } from 'next/server';
import { db, sql } from '@/lib/db';
import { verifyAuth } from '@/lib/auth/verify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST - Update typing status
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const groupId = parseInt(id);
    const { isTyping } = await request.json();

    // Update or insert typing status
    await sql`
      INSERT INTO typing_status (group_id, user_id, is_typing, started_at)
      VALUES (${groupId}, ${user.userId}, ${isTyping}, NOW())
      ON CONFLICT (group_id, user_id)
      DO UPDATE SET is_typing = ${isTyping}, started_at = NOW()
    `;

    // Get user info for broadcast
    const userInfo = await sql`
      SELECT id, name, avatar FROM users WHERE id = ${user.userId}
    `;

    // Broadcast typing status via Pusher
    try {
      const { pusherServer } = require('@/lib/realtime/chat');
      await pusherServer.trigger(`group-${groupId}`, 'user-typing', {
        userId: user.userId,
        name: userInfo[0]?.name || user.name,
        isTyping
      });
    } catch (pusherError) {
      console.error('Pusher broadcast failed:', pusherError);
    }

    return NextResponse.json({ 
      success: true,
      user: userInfo[0],
      isTyping
    });
  } catch (error: any) {
    console.error('Error updating typing status:', error);
    return NextResponse.json({ 
      error: 'Failed to update typing status',
      details: error.message 
    }, { status: 500 });
  }
}

// GET - Get users currently typing
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const groupId = parseInt(id);

    // Get users typing in last 5 seconds (to auto-clear stale typing indicators)
    const typingUsers = await sql`
      SELECT 
        ts.user_id,
        ts.is_typing,
        ts.started_at,
        u.name,
        u.avatar
      FROM typing_status ts
      JOIN users u ON ts.user_id = u.id
      WHERE ts.group_id = ${groupId}
        AND ts.is_typing = true
        AND ts.started_at > NOW() - INTERVAL '5 seconds'
        AND ts.user_id != ${user.userId}
    `;

    return NextResponse.json({ 
      typingUsers: typingUsers.map((t: any) => ({
        userId: t.user_id,
        name: t.name,
        avatar: t.avatar,
        startedAt: t.started_at
      }))
    });
  } catch (error: any) {
    console.error('Error getting typing users:', error);
    return NextResponse.json({ 
      error: 'Failed to get typing users',
      details: error.message 
    }, { status: 500 });
  }
}
