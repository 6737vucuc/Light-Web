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
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Simple Auto-join/Membership check
    try {
      await rawSql`
        INSERT INTO group_members (group_id, user_id, role)
        VALUES (${groupId}, ${user.userId}, 'member')
        ON CONFLICT DO NOTHING
      `;
    } catch (e) {
      console.error('Auto-join error:', e);
    }

    // 2. Fetch ALL messages for this group with user details using direct SQL
    // We use a LEFT JOIN to ensure messages show even if user data has issues
    const messages = await rawSql`
      SELECT 
        gm.*,
        u.name as user_name,
        u.avatar as user_avatar,
        u.username as user_username
      FROM group_messages gm
      LEFT JOIN users u ON gm.user_id = u.id
      WHERE gm.group_id = ${groupId}
      ORDER BY gm.created_at ASC
      LIMIT 100
    `;

    // 3. Format for frontend
    const formattedMessages = messages.map((msg: any) => ({
      id: msg.id,
      content: msg.content,
      media_url: msg.media_url,
      message_type: msg.message_type || 'text',
      created_at: msg.created_at,
      user_id: msg.user_id,
      user: {
        id: msg.user_id,
        name: msg.user_name || 'User',
        avatar: msg.user_avatar,
        username: msg.user_username
      }
    }));

    return NextResponse.json({ messages: formattedMessages });
  } catch (error: any) {
    console.error('Critical error in GET messages:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
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
    const { content, replyToId } = body;

    if (!content) return NextResponse.json({ error: 'Content required' }, { status: 400 });

    // Insert message
    const result = await rawSql`
      INSERT INTO group_messages (group_id, user_id, content, message_type)
      VALUES (${groupId}, ${user.userId}, ${content}, 'text')
      RETURNING *
    `;
    
    const newMessage = result[0];

    // Update counts
    rawSql`UPDATE community_groups SET messages_count = COALESCE(messages_count, 0) + 1 WHERE id = ${groupId}`.catch(() => {});

    // Broadcast via Pusher
    try {
      const { pusherServer } = require('@/lib/realtime/chat');
      await pusherServer.trigger(`group-${groupId}`, 'new-message', {
        ...newMessage,
        user: {
          id: user.userId,
          name: user.name,
          avatar: user.avatar
        }
      });
    } catch (pError) {
      console.error('Pusher error:', pError);
    }

    return NextResponse.json({ success: true, message: newMessage });
  } catch (error: any) {
    console.error('Critical error in POST messages:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
