import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth/verify';
import { sql } from 'drizzle-orm';
import { encrypt, decrypt } from '@/lib/crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Get messages with a specific user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversationId } = await params;
    const otherUserId = parseInt(conversationId);
    const userId = user.userId;

    if (isNaN(otherUserId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    // Use Raw SQL to fetch messages to avoid any ORM mapping issues
    const query = sql`
      SELECT 
        dm.id, 
        dm.sender_id as "senderId", 
        dm.receiver_id as "receiverId", 
        dm.content, 
        dm.message_type as "messageType", 
        dm.media_url as "mediaUrl", 
        dm.is_read as "isRead", 
        dm.is_encrypted as "isEncrypted", 
        dm.created_at as "createdAt",
        u.name as "senderName",
        u.avatar as "senderAvatar"
      FROM direct_messages dm
      LEFT JOIN users u ON dm.sender_id = u.id
      WHERE (dm.sender_id = ${userId} AND dm.receiver_id = ${otherUserId})
         OR (dm.sender_id = ${otherUserId} AND dm.receiver_id = ${userId})
      ORDER BY dm.created_at ASC
    `;

    const result = await db.execute(query);
    const rawMessages = result.rows as any[];

    // Decrypt messages for the UI
    const messages = rawMessages.map(msg => ({
      ...msg,
      content: msg.isEncrypted ? decrypt(msg.content || '') : msg.content
    }));

    // Mark messages as read (Silent update)
    try {
      await db.execute(sql`
        UPDATE direct_messages 
        SET is_read = true, read_at = NOW() 
        WHERE sender_id = ${otherUserId} AND receiver_id = ${userId} AND is_read = false
      `);
    } catch (e) {}

    return NextResponse.json({ messages });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Send a message to a specific user
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversationId } = await params;
    const receiverId = parseInt(conversationId);
    const userId = user.userId;

    if (isNaN(receiverId)) {
      return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
    }

    const body = await request.json();
    const { content, messageType, mediaUrl } = body;

    if (!content && !mediaUrl) {
      return NextResponse.json({ error: 'Content Required' }, { status: 400 });
    }

    // Encrypt content with Intelligence Grade AES-256-GCM
    const encryptedContent = content ? encrypt(content) : '';

    // Use Raw SQL for INSERT to bypass any ORM/Schema conflicts
    const insertQuery = sql`
      INSERT INTO direct_messages (
        sender_id, 
        receiver_id, 
        content, 
        message_type, 
        media_url, 
        is_encrypted, 
        is_read, 
        created_at
      ) VALUES (
        ${userId}, 
        ${receiverId}, 
        ${encryptedContent}, 
        ${messageType || 'text'}, 
        ${mediaUrl || null}, 
        true, 
        false, 
        NOW()
      ) RETURNING id, sender_id as "senderId", receiver_id as "receiverId", content, message_type as "messageType", media_url as "mediaUrl", is_encrypted as "isEncrypted", is_read as "isRead", created_at as "createdAt"
    `;

    const result = await db.execute(insertQuery);
    const newMessage = result.rows[0] as any;

    if (!newMessage) {
      throw new Error('Insert Failed');
    }

    // Get sender info
    const senderResult = await db.execute(sql`SELECT name, avatar FROM users WHERE id = ${userId}`);
    const sender = senderResult.rows[0] as any;

    return NextResponse.json({
      message: {
        ...newMessage,
        content: content, // Return original content to sender
        senderName: sender?.name || 'User',
        senderAvatar: sender?.avatar || null,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
