import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { verify } from 'jsonwebtoken';

// Initialize database connection
const sql = neon(process.env.DATABASE_URL!);

// Helper to initialize Pusher safely
function getPusher() {
  try {
    const appId = process.env.PUSHER_APP_ID;
    const key = process.env.PUSHER_KEY || process.env.NEXT_PUBLIC_PUSHER_APP_KEY;
    const secret = process.env.PUSHER_SECRET;
    const cluster = process.env.PUSHER_CLUSTER || process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

    if (appId && key && secret && cluster) {
      const Pusher = require('pusher');
      return new Pusher({
        appId,
        key,
        secret,
        cluster,
        useTLS: true,
      });
    }
  } catch (e) {
    console.error('Pusher initialization failed:', e);
  }
  return null;
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
    const rawMessages = await sql`
      SELECT 
        gm.id,
        gm.group_id,
        gm.user_id,
        gm.content,
        gm.message_type,
        gm.media_url,
        gm.reply_to_id,
        gm.is_deleted,
        gm.created_at,
        gm.updated_at,
        u.name as user_name,
        u.username as user_username,
        u.avatar as user_avatar
      FROM group_messages gm
      JOIN users u ON gm.user_id = u.id
      WHERE gm.group_id = ${groupId} AND (gm.is_deleted = false OR gm.is_deleted IS NULL)
      ORDER BY gm.created_at ASC
    `;

    const messages = rawMessages.map((msg: any) => ({
      ...msg,
      type: msg.message_type || 'text',
      imageUrl: msg.media_url,
      user: {
        id: msg.user_id,
        name: msg.user_name,
        username: msg.user_username,
        avatar: msg.user_avatar
      }
    }));

    return NextResponse.json({ messages: messages || [] });
  } catch (error: any) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ 
      error: 'DEBUG_ERROR: ' + error.message, 
      full_error: error,
      stack: error.stack
    }, { status: 500 });
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

    const contentType = request.headers.get('content-type') || '';
    let content: string | null = null;
    let messageType: string = 'text';
    let mediaUrl: string | null = null;
    let replyToId: number | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      content = formData.get('content') as string || null;
      const imageFile = formData.get('image') as File | null;
      const replyToIdStr = formData.get('replyToId') as string | null;
      
      if (replyToIdStr) replyToId = parseInt(replyToIdStr);

      if (imageFile) {
        try {
          const cloudinary = require('cloudinary').v2;
          cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
          });

          const bytes = await imageFile.arrayBuffer();
          const buffer = Buffer.from(bytes);

          const uploadResult = await new Promise<any>((resolve, reject) => {
            cloudinary.uploader.upload_stream(
              { folder: 'group-messages' },
              (error: any, result: any) => {
                if (error) reject(error);
                else resolve(result);
              }
            ).end(buffer);
          });

          mediaUrl = uploadResult.secure_url;
          messageType = 'image';
        } catch (cloudinaryError) {
          console.error('Cloudinary upload failed:', cloudinaryError);
          return NextResponse.json({ error: 'Image upload failed' }, { status: 500 });
        }
      }
    } else {
      const body = await request.json();
      content = body.content || null;
      messageType = body.messageType || 'text';
      mediaUrl = body.mediaUrl || null;
      replyToId = body.replyToId || null;
    }

    if (!content && !mediaUrl) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    // Insert message
    const result = await sql`
      INSERT INTO group_messages (group_id, user_id, content, message_type, media_url, reply_to_id)
      VALUES (${groupId}, ${decoded.userId}, ${content || null}, ${messageType || 'text'}, ${mediaUrl || null}, ${replyToId || null})
      RETURNING *
    `;
    const newMessage = result[0];

    // Update messages count (silent fail)
    try {
      await sql`
        UPDATE community_groups 
        SET messages_count = COALESCE(messages_count, 0) + 1
        WHERE id = ${groupId}
      `;
    } catch (e) {}

    // Get user info
    const users = await sql`SELECT name, username, avatar FROM users WHERE id = ${decoded.userId}`;
    const user = users[0] || { name: 'Unknown', username: null, avatar: null };

    const messageWithUser = {
      ...newMessage,
      type: newMessage.message_type || 'text',
      imageUrl: newMessage.media_url,
      user: {
        id: decoded.userId,
        name: user.name,
        username: user.username,
        avatar: user.avatar,
      }
    };

    // Broadcast via Pusher (silent fail)
    const pusher = getPusher();
    if (pusher) {
      try {
        await pusher.trigger(`group-${groupId}`, 'new-message', messageWithUser);
      } catch (e) {}
    }

    return NextResponse.json({ message: messageWithUser }, { status: 201 });
  } catch (error: any) {
    console.error('Error sending message:', error);
    return NextResponse.json({ 
      error: 'DEBUG_ERROR: ' + error.message, 
      full_error: error,
      stack: error.stack
    }, { status: 500 });
  }
}
