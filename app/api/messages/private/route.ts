export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { messages, users, friendships } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth/middleware';
import { eq, or, and, desc } from 'drizzle-orm';
import { RealtimeChatService } from '@/lib/realtime/chat';
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

    // Get messages directly between the two users
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

    // Filter messages based on deletion status and decrypt from database
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
        // Decrypt message from database if it's encrypted
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
        // Return plain text message
        return {
          ...msg,
          encryptedContent: undefined,
        };
      });

    // Mark messages as delivered and read
    const updatedMessages = await db
      .update(messages)
      .set({ 
        isDelivered: true,
        deliveredAt: new Date(),
        isRead: true,
        readAt: new Date()
      })
      .where(
        and(
          eq(messages.receiverId, authResult.user.id),
          eq(messages.senderId, parseInt(friendId)),
          eq(messages.isRead, false)
        )
      )
      .returning({ id: messages.id });

    // Send read receipt via Pusher
    if (updatedMessages.length > 0) {
      const senderChannelId = RealtimeChatService.getPrivateChannelName(parseInt(friendId), authResult.user.id);
      for (const msg of updatedMessages) {
        await RealtimeChatService.sendReadReceipt(senderChannelId, {
          messageId: msg.id,
          readAt: new Date(),
        });
      }
    }

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
  console.log('[MESSAGE API] POST request received');
  
  const authResult = await requireAuth(request);
  
  if ('error' in authResult) {
    console.log('[MESSAGE API] Auth failed:', authResult.error);
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  console.log('[MESSAGE API] Auth successful, user ID:', authResult.user.id);

  try {
    // Apply rate limiting for message sending
    const clientId = getClientIdentifier(request);
    const rateLimit = checkRateLimit(clientId, RateLimitConfigs.API);
    
    if (!rateLimit.allowed) {
      console.warn(`[MESSAGE API] Rate limit exceeded for: ${clientId}`);
      return createRateLimitResponse(rateLimit.resetTime);
    }

    const body = await request.json();
    let { receiverId, content, mediaUrl, messageType } = body;
    
    // Convert receiverId to number if it's a string
    receiverId = typeof receiverId === 'string' ? parseInt(receiverId) : receiverId;
    
    console.log('[MESSAGE API] Request body:', { receiverId, receiverIdType: typeof receiverId, contentLength: content?.length, hasMedia: !!mediaUrl, messageType });

    // Input validation
    if (!receiverId || isNaN(receiverId)) {
      console.log('[MESSAGE API] Invalid receiverId:', receiverId);
      return NextResponse.json(
        { error: 'Valid Receiver ID is required' },
        { status: 400 }
      );
    }

    // Content or media is required
    if (!content && !mediaUrl) {
      return NextResponse.json(
        { error: 'Message content or media is required' },
        { status: 400 }
      );
    }

    // Content length validation (if content exists)
    if (content && content.length > 10000) {
      return NextResponse.json(
        { error: 'Message is too long (max 10,000 characters)' },
        { status: 400 }
      );
    }

    // Sanitize content
    const sanitizedContent = content ? content.trim() : '';

    // Allow messaging to anyone (Instagram-style)
    // No friendship requirement

    // The message arrives as plain text from client
    // We encrypt it ONLY when storing in database
    // This avoids WAF blocking the API request

    // Simplified: No conversations table needed
    // Just store messages directly

    // Encrypt content if exists
    let encryptedContent = null;
    let isEncrypted = false;
    
    if (sanitizedContent) {
      try {
        encryptedContent = encryptMessageMilitary(sanitizedContent);
        isEncrypted = true;
        console.log('[MESSAGE API] Content encrypted successfully');
      } catch (encryptError) {
        console.error('[MESSAGE API] Encryption failed, storing plain text:', encryptError);
        // Fallback: store as plain text if encryption fails
        encryptedContent = null;
        isEncrypted = false;
      }
    }

    // Create message - store encrypted in DB only
    const [message] = await db
      .insert(messages)
      .values({
        conversationId: null, // Not using conversations table
        senderId: authResult.user.id,
        receiverId,
        content: isEncrypted ? null : sanitizedContent, // Store plain text only if encryption failed
        encryptedContent: encryptedContent,
        isEncrypted: isEncrypted,
        mediaUrl: mediaUrl || null,
        messageType: messageType || 'text',
        isDelivered: false,
        isRead: false,
      })
      .returning();

    // Log successful message sent
    console.log(`Message sent: User ${authResult.user.id} -> User ${receiverId}`);

    const response = NextResponse.json({
      message: 'Message sent successfully',
      data: {
        ...message,
        encryptedContent: undefined, // Don't send encrypted content back
      },
    });

    // Add rate limit headers
    response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString());

    // Send real-time no    // Get sender info for Pusher event
    try {
      const sender = await db.query.users.findFirst({ where: eq(users.id, authResult.user.id) });
      if (sender) {
        // Send message to the sender's channel (plain text)
        const senderChannelId = RealtimeChatService.getPrivateChannelName(authResult.user.id, receiverId);
        await RealtimeChatService.sendMessage(senderChannelId, {
          id: message.id,
          senderId: message.senderId,
          senderName: sender.name,
          senderAvatar: sender.avatar || undefined,
          content: sanitizedContent || '', // PLAIN TEXT - NOT ENCRYPTED
          mediaUrl: mediaUrl || undefined,
          messageType: messageType || 'text',
          timestamp: message.createdAt || new Date(),
          isRead: message.isRead || false,
          isDelivered: false,
        });

        // Send message to the receiver's channel (plain text)
        const receiverChannelId = RealtimeChatService.getPrivateChannelName(receiverId, authResult.user.id);
        await RealtimeChatService.sendMessage(receiverChannelId, {
          id: message.id,
          senderId: message.senderId,
          senderName: sender.name,
          senderAvatar: sender.avatar || undefined,
          content: sanitizedContent || '', // PLAIN TEXT - NOT ENCRYPTED
          mediaUrl: mediaUrl || undefined,
          messageType: messageType || 'text',
          timestamp: message.createdAt || new Date(),
          isRead: message.isRead || false,
          isDelivered: false, // Will be updated when receiver opens chat
        });
      }
    } catch (pusherError) {
      console.error('[MESSAGE API] Pusher error (non-fatal):', pusherError);
      // Continue - message was saved to database
    }
    response.headers.set('X-Encryption-Level', 'STORAGE-ONLY-AES-256-GCM');

    return response;
  } catch (error: any) {
    console.error('Send message error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return NextResponse.json(
      { 
        error: 'Failed to send message',
        details: error.message || 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
