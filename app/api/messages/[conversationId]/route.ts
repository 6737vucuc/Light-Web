import { NextRequest, NextResponse } from 'next/server';
import { db, sql as neonSql } from '@/lib/db';
import { verifyAuth } from '@/lib/auth/verify';
import { encrypt, decrypt } from '@/lib/crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function ensureTableExists() {
  try {
    await neonSql`
      CREATE TABLE IF NOT EXISTS direct_messages (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER NOT NULL,
        receiver_id INTEGER NOT NULL,
        content TEXT,
        message_type VARCHAR(20) DEFAULT 'text',
        media_url TEXT,
        is_encrypted BOOLEAN DEFAULT TRUE,
        is_read BOOLEAN DEFAULT FALSE,
        read_at TIMESTAMP,
        is_deleted BOOLEAN DEFAULT FALSE,
        deleted_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
  } catch (e) {}
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const user = await verifyAuth(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { conversationId } = await params;
    const otherUserId = parseInt(conversationId);
    const userId = user.userId;

    await ensureTableExists();

    const result = await neonSql`
      SELECT 
        dm.id, 
        dm.sender_id as "senderId", 
        dm.receiver_id as "receiverId", 
        dm.content, 
        dm.message_type as "messageType", 
        dm.media_url as "mediaUrl", 
        dm.is_read as "isRead", 
        dm.is_encrypted as "isEncrypted", 
        dm.is_deleted as "isDeleted",
        dm.created_at as "createdAt",
        u.name as "senderName",
        u.avatar as "senderAvatar"
      FROM direct_messages dm
      LEFT JOIN users u ON dm.sender_id = u.id
      WHERE (dm.sender_id = ${userId} AND dm.receiver_id = ${otherUserId})
         OR (dm.sender_id = ${otherUserId} AND dm.receiver_id = ${userId})
      ORDER BY dm.created_at ASC
    `;

    const messages = result.map((msg: any) => ({
      ...msg,
      content: msg.isDeleted ? 'تم حذف هذه الرسالة' : (msg.isEncrypted ? decrypt(msg.content || '') : msg.content)
    }));

    // Mark as read
    try {
      await neonSql`
        UPDATE direct_messages 
        SET is_read = true, read_at = NOW() 
        WHERE sender_id = ${otherUserId} AND receiver_id = ${userId} AND is_read = false
      `;
    } catch (e) {}

    return NextResponse.json({ messages });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const user = await verifyAuth(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { conversationId } = await params;
    const receiverId = parseInt(conversationId);
    const userId = user.userId;

    const body = await request.json();
    const { content, messageType, mediaUrl } = body;

    await ensureTableExists();

    const encryptedContent = content ? encrypt(content) : '';

    const result = await neonSql`
      INSERT INTO direct_messages (
        sender_id, 
        receiver_id, 
        content, 
        message_type, 
        media_url, 
        is_encrypted, 
        is_read
      ) VALUES (
        ${userId}, 
        ${receiverId}, 
        ${encryptedContent}, 
        ${messageType || 'text'}, 
        ${mediaUrl || null}, 
        true, 
        false
      ) RETURNING id, sender_id as "senderId", receiver_id as "receiverId", content, message_type as "messageType", media_url as "mediaUrl", is_encrypted as "isEncrypted", is_read as "isRead", created_at as "createdAt"
    `;

    const newMessage = result[0];
    const senderResult = await neonSql`SELECT name, avatar FROM users WHERE id = ${userId}`;
    const sender = senderResult[0];

    return NextResponse.json({
      message: {
        ...newMessage,
        content: content,
        senderName: sender?.name || 'User',
        senderAvatar: sender?.avatar || null,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}

// DELETE for "Delete for Everyone"
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const user = await verifyAuth(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('messageId');

    if (!messageId) return NextResponse.json({ error: 'Message ID required' }, { status: 400 });

    // Update message to be deleted for everyone
    await neonSql`
      UPDATE direct_messages 
      SET is_deleted = true, deleted_at = NOW(), content = NULL, media_url = NULL
      WHERE id = ${parseInt(messageId)} AND sender_id = ${user.userId}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
  }
}
