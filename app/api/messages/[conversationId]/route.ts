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

    const messages = rawMessages.map(msg => ({
      ...msg,
      content: msg.isEncrypted ? decrypt(msg.content || '') : msg.content
    }));

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
      // Silent fail for read status update
    }

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

    const encryptedContent = content ? encrypt(content) : '';

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
      throw new Error('Insert Failed');
    }

    const [sender] = await db
      .select({ name: users.name, avatar: users.avatar })
      .from(users)
      .where(eq(users.id, userId));

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
