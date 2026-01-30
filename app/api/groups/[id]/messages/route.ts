import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { verify } from 'jsonwebtoken';

const sql = neon(process.env.DATABASE_URL!);

// Initialize Pusher only if credentials are available
let pusher: any = null;
try {
  if (process.env.PUSHER_APP_ID && process.env.PUSHER_KEY && process.env.PUSHER_SECRET && process.env.PUSHER_CLUSTER) {
    const Pusher = require('pusher');
    pusher = new Pusher({
      appId: process.env.PUSHER_APP_ID,
      key: process.env.PUSHER_KEY,
      secret: process.env.PUSHER_SECRET,
      cluster: process.env.PUSHER_CLUSTER,
      useTLS: true,
    });
  }
} catch (e) {
  console.warn('Pusher initialization failed:', e);
}

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

    let decoded: any;
    try {
      decoded = verify(token, process.env.JWT_SECRET!) as any;
    } catch (jwtError) {
      console.error('JWT verification failed:', jwtError);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const groupId = parseInt(id);

    // Check if user is a member
    const members = await sql`
      SELECT id FROM group_members 
      WHERE group_id = ${groupId} AND user_id = ${decoded.userId}
    `;

    if (!members || members.length === 0) {
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

    return NextResponse.json({ messages: messages || [] });
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

    let decoded: any;
    try {
      decoded = verify(token, process.env.JWT_SECRET!) as any;
    } catch (jwtError) {
      console.error('JWT verification failed:', jwtError);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const groupId = parseInt(id);

    // Check if user is a member
    const members = await sql`
      SELECT id FROM group_members 
      WHERE group_id = ${groupId} AND user_id = ${decoded.userId}
    `;

    if (!members || members.length === 0) {
      return NextResponse.json({ error: 'Not a member' }, { status: 403 });
    }

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('Failed to parse request body:', parseError);
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { content, messageType, mediaUrl, replyToId } = body;

    if (!content && !mediaUrl) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    // Insert message with correct column names from database
    let newMessage;
    try {
      const result = await sql`
        INSERT INTO group_messages (group_id, user_id, content, message_type, media_url, reply_to_id)
        VALUES (${groupId}, ${decoded.userId}, ${content || null}, ${messageType || 'text'}, ${mediaUrl || null}, ${replyToId || null})
        RETURNING *
      `;
      newMessage = result[0];
    } catch (dbError) {
      console.error('Database insert failed:', dbError);
      return NextResponse.json({ error: 'Failed to save message' }, { status: 500 });
    }

    // Update messages count (don't fail if this fails)
    try {
      await sql`
        UPDATE community_groups 
        SET messages_count = COALESCE(messages_count, 0) + 1
        WHERE id = ${groupId}
      `;
    } catch (countError) {
      console.warn('Failed to update message count:', countError);
    }

    // Get user info for the message
    let userName = 'Unknown';
    let userUsername: string | null = null;
    let userAvatar: string | null = null;
    try {
      const users = await sql`
        SELECT name, username, avatar FROM users WHERE id = ${decoded.userId}
      `;
      if (users && users.length > 0) {
        userName = users[0].name || 'Unknown';
        userUsername = users[0].username || null;
        userAvatar = users[0].avatar || null;
      }
    } catch (userError) {
      console.warn('Failed to get user info:', userError);
    }

    // Format message for clients
    const messageWithUser = {
      ...newMessage,
      user_name: userName,
      user_username: userUsername,
      user_avatar: userAvatar,
    };

    // Broadcast to Pusher (don't fail if Pusher fails)
    if (pusher) {
      try {
        await pusher.trigger(`group-${groupId}`, 'new-message', {
          message: messageWithUser,
        });
      } catch (pusherError) {
        console.warn('Pusher broadcast failed:', pusherError);
        // Don't fail the request if Pusher fails
      }
    }

    return NextResponse.json({ message: messageWithUser }, { status: 201 });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
