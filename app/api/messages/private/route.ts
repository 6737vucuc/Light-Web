export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { messages, users, friendships, conversations } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth/middleware';
import { eq, or, and, desc } from 'drizzle-orm';
import { encryptMessageMilitary, decryptMessageMilitary } from '@/lib/security/military-encryption';
import { checkRateLimit, getClientIdentifier, createRateLimitResponse, RateLimitConfigs } from '@/lib/security/rate-limit';

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

    // Filter messages based on deletion status and decrypt with military-grade encryption
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
        // Decrypt message with military-grade encryption
        if (msg.isEncrypted && msg.encryptedContent) {
          try {
            return {
              ...msg,
              content: decryptMessageMilitary(msg.encryptedContent),
              encryptedContent: undefined, // Don't send encrypted content to client
            };
          } catch (error) {
            console.error('SECURITY: Decryption failed for message ID:', msg.id, error);
            return {
              ...msg,
              content: '[Encrypted - Unable to decrypt]',
              encryptedContent: undefined,
            };
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

// Send a private message with military-grade encryption
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    // Apply rate limiting for message sending
    const clientId = getClientIdentifier(request);
    const rateLimit = checkRateLimit(clientId, RateLimitConfigs.API);
    
    if (!rateLimit.allowed) {
      console.warn(`Rate limit exceeded for message sending from: ${clientId}`);
      return createRateLimitResponse(rateLimit.resetTime);
    }

    const body = await request.json();
    const { receiverId, content } = body;

    // Input validation
    if (!receiverId || !content) {
      return NextResponse.json(
        { error: 'Receiver ID and content are required' },
        { status: 400 }
      );
    }

    // Content length validation
    if (content.length > 10000) {
      return NextResponse.json(
        { error: 'Message is too long (max 10,000 characters)' },
        { status: 400 }
      );
    }

    // Sanitize content
    const sanitizedContent = content.trim();
    if (sanitizedContent.length === 0) {
      return NextResponse.json(
        { error: 'Message cannot be empty' },
        { status: 400 }
      );
    }

    // Allow messaging to anyone (Instagram-style)
    // No friendship requirement

    // Encrypt the message with MILITARY-GRADE encryption
    // Same level as NSA, CIA, WhatsApp, Signal
    const encryptedContent = encryptMessageMilitary(sanitizedContent);

    // Get or create conversation
    let conversation = await db
      .select()
      .from(conversations)
      .where(
        or(
          and(
            eq(conversations.participant1Id, authResult.user.id),
            eq(conversations.participant2Id, receiverId)
          ),
          and(
            eq(conversations.participant1Id, receiverId),
            eq(conversations.participant2Id, authResult.user.id)
          )
        )
      )
      .limit(1);

    if (conversation.length === 0) {
      // Create new conversation
      const [newConv] = await db
        .insert(conversations)
        .values({
          participant1Id: authResult.user.id,
          participant2Id: receiverId,
        })
        .returning();
      conversation = [newConv];
    }

    // Create message
    const [message] = await db
      .insert(messages)
      .values({
        conversationId: conversation[0].id,
        senderId: authResult.user.id,
        receiverId,
        content: '[🔒 Military-Grade Encrypted]', // Placeholder in database
        encryptedContent,
        isEncrypted: true,
      })
      .returning();

    // Log successful message encryption (without content)
    console.log(`Military-encrypted message sent: User ${authResult.user.id} -> User ${receiverId}`);

    const response = NextResponse.json({
      message: 'Message sent successfully with military-grade encryption',
      data: {
        ...message,
        encryptedContent: undefined, // Don't send encrypted content back
      },
    });

    // Add rate limit headers
    response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString());
    response.headers.set('X-Encryption-Level', 'MILITARY-GRADE-AES-256-GCM');

    return response;
  } catch (error) {
    console.error('Send message error:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
