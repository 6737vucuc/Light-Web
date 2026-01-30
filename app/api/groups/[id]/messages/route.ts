import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { verify } from 'jsonwebtoken';
import Pusher from 'pusher';
import { encryptMessageMilitary, decryptMessageMilitary } from '@/lib/security/military-encryption';

const sql = neon(process.env.DATABASE_URL!);

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.cookies.get('token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verify(token, process.env.JWT_SECRET!) as any;
    const groupId = parseInt(id);

    // Check if user is a member
    const [member] = await sql`
      SELECT id FROM group_members 
      WHERE group_id = ${groupId} AND user_id = ${decoded.userId}
    `;

    if (!member) {
      return NextResponse.json({ error: 'Not a member' }, { status: 403 });
    }

    // Get messages with user info
    const messages = await sql`
      SELECT 
        gm.*,
        u.name as user_name,
        u.username as user_username,
        u.avatar as user_avatar,
        u.id as user_id
      FROM group_messages gm
      JOIN users u ON gm.user_id = u.id
      WHERE gm.group_id = ${groupId} AND (gm.is_deleted = false OR gm.is_deleted IS NULL)
      ORDER BY gm.created_at ASC
    `;

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.cookies.get('token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verify(token, process.env.JWT_SECRET!) as any;
    const groupId = parseInt(id);

    // Check if user is a member
    const [member] = await sql`
      SELECT id FROM group_members 
      WHERE group_id = ${groupId} AND user_id = ${decoded.userId}
    `;

    if (!member) {
      return NextResponse.json({ error: 'Not a member' }, { status: 403 });
    }

    const { content, messageType, mediaUrl, replyToId } = await request.json();

    if (!content && !mediaUrl) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    // Insert message with correct column names from database
    const [newMessage] = await sql`
      INSERT INTO group_messages (group_id, user_id, content, message_type, media_url, reply_to_id)
      VALUES (${groupId}, ${decoded.userId}, ${content || null}, ${messageType || 'text'}, ${mediaUrl || null}, ${replyToId || null})
      RETURNING *
    `;

    // Update messages count
    await sql`
      UPDATE community_groups 
      SET messages_count = messages_count + 1
      WHERE id = ${groupId}
    `;

    // Get user info for the message
    const [user] = await sql`
      SELECT name, username, avatar FROM users WHERE id = ${decoded.userId}
    `;

    // Format message for clients
    const messageWithUser = {
      ...newMessage,
      user_name: user.name,
      user_username: user.username,
      user_avatar: user.avatar,
    };

    // Broadcast to Pusher
    await pusher.trigger(`group-${groupId}`, 'new-message', {
      message: messageWithUser,
    });

    return NextResponse.json({ message: messageWithUser }, { status: 201 });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
