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
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversationId } = await params;
    const receiverId = parseInt(conversationId);
    const userId = user.userId;

    if (isNaN(receiverId)) {
      return NextResponse.json({ error: 'Invalid receiver ID' }, { status: 400 });
    }

    const body = await request.json();
    const { content, messageType, mediaUrl } = body;

    if (!content && !mediaUrl) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      );
    }

    // Encrypt content before saving to DB
    const encryptedContent = content ? encrypt(content) : '';

    // Insert message using explicit field mapping to avoid any ORM issues
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
        createdAt: new Date(),
      })
      .returning();

    if (!newMessage) {
      throw new Error('Failed to insert message into database');
    }

    // Get sender info for immediate UI update
    const [sender] = await db
      .select({
        name: users.name,
        avatar: users.avatar,
      })
      .from(users)
      .where(eq(users.id, userId));

    return NextResponse.json({
      message: {
        ...newMessage,
        content: content, // Return original content to the sender's UI
        senderName: sender?.name || 'User',
        senderAvatar: sender?.avatar || null,
      },
    });
  } catch (error: any) {
    console.error('CRITICAL: Message send failed:', error);
    return NextResponse.json(
      { 
        error: 'Failed to send message', 
        details: error.message,
        hint: 'Please ensure the direct_messages table exists with correct columns.'
      }, 
      { status: 500 }
    );
  }
}
