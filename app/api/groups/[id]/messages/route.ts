import { NextRequest, NextResponse } from 'next/server';
import { sql as rawSql } from '@/lib/db';
import { verifyAuth } from '@/lib/auth/verify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const groupId = parseInt(id);
    
    const user = await verifyAuth(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 1. Auto-join using Direct SQL
    await rawSql`
      INSERT INTO group_members (group_id, user_id, role)
      VALUES (${groupId}, ${user.userId}, 'member')
      ON CONFLICT (group_id, user_id) DO NOTHING
    `;

    // 2. Fetch messages using Direct SQL with JOIN for user details
    const messages = await rawSql`
      SELECT 
        gm.id, gm.content, gm.media_url, gm.message_type, gm.created_at, gm.user_id,
        u.name as sender_name, u.avatar as sender_avatar, u.username as sender_username
      FROM group_messages gm
      LEFT JOIN users u ON gm.user_id = u.id
      WHERE gm.group_id = ${groupId}
      ORDER BY gm.created_at ASC
    `;

    const formattedMessages = messages.map((msg: any) => ({
      id: msg.id,
      content: msg.content,
      media_url: msg.media_url,
      type: msg.message_type || 'text',
      timestamp: msg.created_at,
      userId: msg.user_id,
      user: {
        id: msg.user_id,
        name: msg.sender_name || 'User',
        avatar: msg.sender_avatar,
        username: msg.sender_username
      }
    }));

    return NextResponse.json({ messages: formattedMessages });
  } catch (error: any) {
    console.error('GET Messages SQL Error:', error);
    return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const groupId = parseInt(id);
    
    const user = await verifyAuth(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { content, messageType = 'text', mediaUrl = null } = body;

    // 1. Insert message using Direct SQL
    const result = await rawSql`
      INSERT INTO group_messages (group_id, user_id, content, message_type, media_url)
      VALUES (${groupId}, ${user.userId}, ${content}, ${messageType}, ${mediaUrl})
      RETURNING *
    `;
    
    const newMessage = result[0];

    // 2. Broadcast via Pusher
    try {
      const { pusherServer } = require('@/lib/realtime/chat');
      await pusherServer.trigger(`group-${groupId}`, 'new-message', {
        id: newMessage.id,
        content: newMessage.content,
        media_url: newMessage.media_url,
        type: newMessage.message_type,
        timestamp: newMessage.created_at,
        userId: user.userId,
        user: {
          id: user.userId,
          name: user.name,
          avatar: user.avatar,
          username: user.username
        }
      });
    } catch (pError) {
      console.error('Pusher Broadcast Error:', pError);
    }

    return NextResponse.json({ success: true, message: newMessage });
  } catch (error: any) {
    console.error('POST Message SQL Error:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
