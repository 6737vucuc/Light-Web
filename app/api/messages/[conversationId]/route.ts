import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { directMessages, users } from '@/lib/db/schema';
import { verifyAuth } from '@/lib/auth/verify';
import { eq, or, and } from 'drizzle-orm';
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

    // Get messages between the two users
    const rawMessages = await db
      .select({
        id: directMessages.id,
        senderId: directMessages.senderId,
        receiverId: directMessages.receiverId,
        content: directMessages.content,
        messageType: directMessages.messageType,
        mediaUrl: directMessages.mediaUrl,
        isRead: directMessages.isRead,
        isEncrypted: directMessages.isEncrypted,
        createdAt: directMessages.createdAt,
        senderName: users.name,
        senderAvatar: users.avatar,
      })
      .from(directMessages)
      .leftJoin(users, eq(directMessages.senderId, users.id))
      .where(
        or(
          and(
            eq(directMessages.senderId, userId),
            eq(directMessages.receiverId, otherUserId)
          ),
          and(
            eq(directMessages.senderId, otherUserId),
            eq(directMessages.receiverId, userId)
          )
        )
      )
      .orderBy(directMessages.createdAt);

    // Decrypt messages for the UI
    const messages = rawMessages.map(msg => ({
      ...msg,
      content: msg.isEncrypted ? decrypt(msg.content || '') : msg.content
    }));

    // Mark messages as read
    try {
      await db
        .update(directMessages)
        .set({ isRead: true, readAt: new Date() })
        .where(
          and(
            eq(directMessages.senderId, otherUserId),
            eq(directMessages.receiverId, userId),
            eq(directMessages.isRead, false)
          )
        );
    } catch (e) {
      console.error('Non-critical: Failed to update read status', e);
    }

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

// Send a message to a specific user
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  console.log('--- START MESSAGE SEND PROCESS ---');
  try {
    // 1. Auth Check
    const user = await verifyAuth(request);
    if (!user) {
      console.log('Auth failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log('Auth success for user:', user.userId);

    // 2. Params Check
    const { conversationId } = await params;
    const receiverId = parseInt(conversationId);
    const userId = user.userId;

    if (isNaN(receiverId)) {
      console.log('Invalid receiverId:', conversationId);
      return NextResponse.json({ error: 'Invalid receiver ID' }, { status: 400 });
    }
    console.log('Sending from', userId, 'to', receiverId);

    // 3. Body Check
    const body = await request.json();
    const { content, messageType, mediaUrl } = body;
    console.log('Message content length:', content?.length || 0);

    // 4. Encryption
    let encryptedContent = '';
    try {
      encryptedContent = content ? encrypt(content) : '';
      console.log('Encryption success');
    } catch (e: any) {
      console.error('Encryption failed:', e.message);
      encryptedContent = content; // Fallback
    }

    // 5. Database Insert
    console.log('Attempting DB insert...');
    try {
      const [newMessage] = await db
        .insert(directMessages)
        .values({
          senderId: userId,
          receiverId: receiverId,
          content: encryptedContent,
          messageType: messageType || 'text',
          mediaUrl: mediaUrl || null,
          isEncrypted: true,
          isRead: false,
        })
        .returning();

      if (!newMessage) {
        console.log('DB insert returned no result');
        throw new Error('No message returned from database');
      }
      console.log('DB insert success, ID:', newMessage.id);

      // 6. Get Sender Info
      const [sender] = await db
        .select({ name: users.name, avatar: users.avatar })
        .from(users)
        .where(eq(users.id, userId));

      console.log('--- END MESSAGE SEND PROCESS SUCCESS ---');
      return NextResponse.json({
        message: {
          ...newMessage,
          content: content,
          senderName: sender?.name || 'User',
          senderAvatar: sender?.avatar || null,
        },
      });
    } catch (dbError: any) {
      console.error('DATABASE ERROR DURING INSERT:', dbError);
      return NextResponse.json({
        error: 'Database Error',
        details: dbError.message,
        code: dbError.code,
        hint: 'Check if table direct_messages exists and has correct columns.'
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('GENERAL ERROR DURING SEND:', error);
    return NextResponse.json(
      { error: 'Failed to send message', details: error.message },
      { status: 500 }
    );
  }
}
