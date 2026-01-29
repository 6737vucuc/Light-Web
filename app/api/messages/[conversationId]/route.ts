import { NextRequest, NextResponse } from 'next/server';
import { db, sql as neonSql } from '@/lib/db';
import { verifyAuth } from '@/lib/auth/verify';
import { encrypt, decrypt } from '@/lib/crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * ROOT CAUSE FIX:
 * 1. Ensure table exists using raw SQL
 * 2. Use simple, direct SQL for all operations
 * 3. Handle data types correctly for PostgreSQL
 */

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
  } catch (e) {
    console.error('Table check failed:', e);
  }
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
      content: msg.isEncrypted ? decrypt(msg.content || '') : msg.content
    }));

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

    // Direct insert using neon client for maximum reliability
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
