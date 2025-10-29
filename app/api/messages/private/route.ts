import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { messages, users, friendships } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth/middleware';
import { eq, or, and, desc } from 'drizzle-orm';
import { encryptMessage, decryptMessage } from '@/lib/utils/server-encryption';

// Get messages with a specific user
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const friendId = searchParams.get('friendId');

    if (!friendId) {
      return NextResponse.json(
        { error: 'Friend ID is required' },
        { status: 400 }
      );
    }

    // Verify friendship exists
    const friendship = await db
      .select()
      .from(friendships)
      .where(
        and(
          or(
            and(
              eq(friendships.userId, authResult.user.id),
              eq(friendships.friendId, parseInt(friendId))
            ),
            and(
              eq(friendships.userId, parseInt(friendId)),
              eq(friendships.friendId, authResult.user.id)
            )
          ),
          eq(friendships.status, 'accepted')
        )
      )
      .limit(1);

    if (friendship.length === 0) {
      return NextResponse.json(
        { error: 'You are not friends with this user' },
        { status: 403 }
      );
    }

    // Get messages and filter by deletion status
    const allMessages = await db
      .select()
      .from(messages)
      .where(
        or(
          and(
            eq(messages.senderId, authResult.user.id),
            eq(messages.receiverId, parseInt(friendId))
          ),
          and(
            eq(messages.senderId, parseInt(friendId)),
            eq(messages.receiverId, authResult.user.id)
          )
        )
      )
      .orderBy(desc(messages.createdAt))
      .limit(100);

    // Filter messages based on deletion status and decrypt
    const messagesList = allMessages
      .filter((msg) => {
        // If user is sender, show only if not deleted by sender
        if (msg.senderId === authResult.user.id) {
          return !msg.deletedBySender;
        }
        // If user is receiver, show only if not deleted by receiver
        return !msg.deletedByReceiver;
      })
      .map((msg) => {
        // Decrypt message if encrypted
        if (msg.isEncrypted && msg.encryptedContent) {
          try {
            return {
              ...msg,
              content: decryptMessage(msg.encryptedContent),
            };
          } catch (error) {
            console.error('Decryption error:', error);
            return msg;
          }
        }
        return msg;
      });

    // Mark messages as read
    await db
      .update(messages)
      .set({ isRead: true })
      .where(
        and(
          eq(messages.receiverId, authResult.user.id),
          eq(messages.senderId, parseInt(friendId)),
          eq(messages.isRead, false)
        )
      );

    return NextResponse.json({ messages: messagesList.reverse() });
  } catch (error) {
    console.error('Get messages error:', error);
    return NextResponse.json(
      { error: 'Failed to get messages' },
      { status: 500 }
    );
  }
}

// Send a private message
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const body = await request.json();
    const { receiverId, content } = body;

    if (!receiverId || !content) {
      return NextResponse.json(
        { error: 'Receiver ID and content are required' },
        { status: 400 }
      );
    }

    // Verify friendship exists
    const friendship = await db
      .select()
      .from(friendships)
      .where(
        and(
          or(
            and(
              eq(friendships.userId, authResult.user.id),
              eq(friendships.friendId, receiverId)
            ),
            and(
              eq(friendships.userId, receiverId),
              eq(friendships.friendId, authResult.user.id)
            )
          ),
          eq(friendships.status, 'accepted')
        )
      )
      .limit(1);

    if (friendship.length === 0) {
      return NextResponse.json(
        { error: 'You are not friends with this user' },
        { status: 403 }
      );
    }

    // Encrypt the message
    const encryptedContent = encryptMessage(content);

    // Create message
    const [message] = await db
      .insert(messages)
      .values({
        senderId: authResult.user.id,
        receiverId,
        content: '[Encrypted]', // Store placeholder in content field
        encryptedContent,
        isEncrypted: true,
      })
      .returning();

    return NextResponse.json({
      message: 'Message sent successfully',
      data: message,
    });
  } catch (error) {
    console.error('Send message error:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}

