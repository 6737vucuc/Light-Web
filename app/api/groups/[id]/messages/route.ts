import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { verify } from 'jsonwebtoken';

const sql = neon(process.env.DATABASE_URL!);

// Initialize Pusher only if credentials are available
let pusher: any = null;
try {
  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.PUSHER_KEY || process.env.NEXT_PUBLIC_PUSHER_APP_KEY || process.env.NEXT_PUBLIC_PUSHER_KEY;
  const secret = process.env.PUSHER_SECRET;
  const cluster = process.env.PUSHER_CLUSTER || process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

  if (appId && key && secret && cluster) {
    const Pusher = require('pusher');
    pusher = new Pusher({
      appId,
      key,
      secret,
      cluster,
      useTLS: true,
    });
  } else {
    console.warn('Pusher credentials incomplete:', { appId: !!appId, key: !!key, secret: !!secret, cluster: !!cluster });
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

    // Format messages to include user object as expected by Frontend
    const messages = rawMessages.map((msg: any) => ({
      ...msg,
      // Map database names to frontend expected names
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

    // Check content type to determine if it's JSON or FormData
    const contentType = request.headers.get('content-type') || '';
    let content: string | null = null;
    let messageType: string = 'text';
    let mediaUrl: string | null = null;
    let replyToId: number | null = null;

    if (contentType.includes('multipart/form-data')) {
      // Handle FormData (image upload)
      try {
        const formData = await request.formData();
        content = formData.get('content') as string || null;
        const imageFile = formData.get('image') as File | null;
        const replyToIdStr = formData.get('replyToId') as string | null;
        
        if (replyToIdStr) {
          replyToId = parseInt(replyToIdStr);
        }

        // Upload image to Cloudinary if present
        if (imageFile) {
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
        }
      } catch (formError) {
        console.error('Failed to parse FormData:', formError);
        return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
      }
    } else {
      // Handle JSON (text message)
      try {
        const body = await request.json();
        content = body.content || null;
        messageType = body.messageType || 'text';
        mediaUrl = body.mediaUrl || null;
        replyToId = body.replyToId || null;
      } catch (parseError) {
        console.error('Failed to parse JSON:', parseError);
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
      }
    }

    if (!content && !mediaUrl) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    // Insert message with correct column names from database
    let newMessage;
    try {
      // Based on the screenshot provided by the user:
      // columns are: group_id, user_id, content, message_type, media_url, reply_to_id
      const result = await sql`
        INSERT INTO group_messages (group_id, user_id, content, message_type, media_url, reply_to_id)
        VALUES (${groupId}, ${decoded.userId}, ${content || null}, ${messageType || 'text'}, ${mediaUrl || null}, ${replyToId || null})
        RETURNING *
      `;
      newMessage = result[0];
    } catch (dbError: any) {
      console.error('Database insert failed:', dbError);
      return NextResponse.json({ 
        error: 'Failed to save message', 
        details: dbError.message
      }, { status: 500 });
    }

    // Update messages count (don't fail if this fails)
    try {
      // Table name is community_groups based on schema.ts
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

    // Format message for clients to match Frontend expectations
    const messageWithUser = {
      ...newMessage,
      // Map database names to frontend expected names
      type: newMessage.message_type || 'text',
      imageUrl: newMessage.media_url,
      user: {
        id: decoded.userId,
        name: userName,
        username: userUsername,
        avatar: userAvatar,
      },
      // Keep flat fields for backward compatibility if needed
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
