import { NextRequest, NextResponse } from 'next/server';
import { db, sql as rawSql } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { verifyAuth } from '@/lib/auth/verify';
import { eq } from 'drizzle-orm';
import { encryptMessageMilitary, decryptMessageMilitary } from '@/lib/security/military-encryption';
import Pusher from 'pusher';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getPusher() {
  try {
    const appId = process.env.PUSHER_APP_ID;
    const key = process.env.PUSHER_KEY || process.env.NEXT_PUBLIC_PUSHER_APP_KEY;
    const secret = process.env.PUSHER_SECRET;
    const cluster = process.env.PUSHER_CLUSTER || process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

    if (appId && key && secret && cluster) {
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

// GET: Fetch all conversations for the current user
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.userId;

    // Get all conversations (unique users the current user has messaged with)
    const conversations = await rawSql`
      WITH conversation_users AS (
        SELECT DISTINCT
          CASE 
            WHEN dm.sender_id = ${userId} THEN dm.receiver_id
            ELSE dm.sender_id
          END as other_user_id
        FROM direct_messages dm
        WHERE dm.sender_id = ${userId} OR dm.receiver_id = ${userId}
      )
      SELECT 
        cu.other_user_id,
        u.name,
        u.avatar,
        u.last_seen,
        u.is_online,
        (
          SELECT content 
          FROM direct_messages 
          WHERE (sender_id = ${userId} AND receiver_id = cu.other_user_id)
             OR (sender_id = cu.other_user_id AND receiver_id = ${userId})
          ORDER BY created_at DESC 
          LIMIT 1
        ) as last_message,
        (
          SELECT created_at 
          FROM direct_messages 
          WHERE (sender_id = ${userId} AND receiver_id = cu.other_user_id)
             OR (sender_id = cu.other_user_id AND receiver_id = ${userId})
          ORDER BY created_at DESC 
          LIMIT 1
        ) as last_message_time,
        (
          SELECT COUNT(*) 
          FROM direct_messages 
          WHERE sender_id = cu.other_user_id 
            AND receiver_id = ${userId} 
            AND is_read = false
        ) as unread_count
      FROM conversation_users cu
      JOIN users u ON u.id = cu.other_user_id
      ORDER BY last_message_time DESC
    `;

    // Decrypt last messages
    const decryptedConversations = conversations.map((conv: any) => {
      try {
        if (conv.last_message) {
          return {
            ...conv,
            last_message: decryptMessageMilitary(conv.last_message)
          };
        }
        return conv;
      } catch (error) {
        return {
          ...conv,
          last_message: '[Encrypted]'
        };
      }
    });

    return NextResponse.json({ conversations: decryptedConversations });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Send a new direct message
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { receiverId, content, messageType, mediaUrl } = await request.json();

    if (!receiverId) {
      return NextResponse.json({ error: 'Receiver ID is required' }, { status: 400 });
    }

    if (!content && !mediaUrl) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    // Check if receiver exists
    const receiver = await db.query.users.findFirst({
      where: eq(users.id, receiverId),
      columns: { id: true }
    });

    if (!receiver) {
      return NextResponse.json({ error: 'Receiver not found' }, { status: 404 });
    }

    // Encrypt message content
    const encryptedContent = content ? encryptMessageMilitary(content) : null;

    // Insert encrypted message
    const [newMessage] = await rawSql`
      INSERT INTO direct_messages (sender_id, receiver_id, content, message_type, media_url, is_encrypted)
      VALUES (${user.userId}, ${receiverId}, ${encryptedContent}, ${messageType || 'text'}, ${mediaUrl || null}, ${true})
      RETURNING *
    `;

    // Get sender info for real-time display
    const sender = await db.query.users.findFirst({
      where: eq(users.id, user.userId),
      columns: { name: true, avatar: true }
    });

    // Broadcast via Pusher for real-time delivery
    const pusher = getPusher();
    if (pusher) {
      try {
        await pusher.trigger(`user-${receiverId}`, 'private-message', {
          message: {
            ...newMessage,
            content: content,
            is_encrypted: true,
            sender_name: sender?.name,
            sender_avatar: sender?.avatar
          }
        });
      } catch (e) {
        console.error('Pusher trigger error:', e);
      }
    }

    // Return decrypted message
    return NextResponse.json({ 
      message: {
        ...newMessage,
        content: content, // Send original content
        is_encrypted: true
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
