import { NextRequest, NextResponse } from 'next/server';
import { db, sql as rawSql } from '@/lib/db';
import { groupMessages, groupMembers, communityGroups, users } from '@/lib/db/schema';
import { verifyAuth } from '@/lib/auth/verify';
import { eq, and, asc, sql } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
    
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const groupId = parseInt(id);

    // Check if user is a member
    const member = await db.query.groupMembers.findFirst({
      where: and(
        eq(groupMembers.groupId, groupId),
        eq(groupMembers.userId, user.userId)
      ),
    });

    if (!member) {
      return NextResponse.json({ error: 'Not a member' }, { status: 403 });
    }

    // Get messages with user info using raw SQL for complex join
    const rawMessages = await rawSql`
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
      createdAt: msg.created_at,
      updatedAt: msg.updated_at,
      userId: msg.user_id,
      groupId: msg.group_id,
      replyToId: msg.reply_to_id,
      isDeleted: msg.is_deleted,
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
      error: 'Failed to fetch messages', 
      details: error.message 
    }, { status: 500 });
  }
}

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

    // Check if user is a member
    const member = await db.query.groupMembers.findFirst({
      where: and(
        eq(groupMembers.groupId, groupId),
        eq(groupMembers.userId, user.userId)
      ),
    });

    if (!member) {
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

    // Insert message using raw SQL to match actual database schema
    let newMessage;
    try {
      const result = await rawSql`
        INSERT INTO group_messages (group_id, user_id, content, message_type, media_url, reply_to_id)
        VALUES (${groupId}, ${user.userId}, ${content}, ${messageType}, ${mediaUrl}, ${replyToId})
        RETURNING *
      `;
      newMessage = result[0];

      // Update messages count (don't let this fail the whole request)
      rawSql`
        UPDATE community_groups 
        SET messages_count = COALESCE(messages_count, 0) + 1
        WHERE id = ${groupId}
      `.catch(e => console.error('Failed to update message count:', e));
    } catch (dbError: any) {
      console.error('Database insertion failed:', dbError);
      return NextResponse.json({ 
        error: 'Failed to save message to database', 
        details: dbError.message 
      }, { status: 500 });
    }

    // Use the user info already available from verifyAuth to save a DB query
    const messageWithUser = {
      ...newMessage,
      type: newMessage.message_type || 'text',
      imageUrl: newMessage.media_url,
      user: {
        id: user.userId,
        name: user.name || 'User',
        username: user.username || null,
        avatar: user.avatar || null,
      }
    };

    // Broadcast via Pusher (silent fail - DO NOT AWAIT)
    const pusher = getPusher();
    if (pusher) {
      pusher.trigger(`group-${groupId}`, 'new-message', messageWithUser)
        .catch((e: any) => console.error('Pusher error (background):', e));
    }

    return NextResponse.json({ 
      success: true,
      message: messageWithUser 
    }, { status: 201 });
  } catch (error: any) {
    console.error('CRITICAL Error sending message:', error);
    return NextResponse.json({ 
      error: 'Failed to send message', 
      details: error.message,
      message: 'Please check your connection and try again'
    }, { status: 500 });
  }
}
