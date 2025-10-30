import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { messages, users } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth/middleware';
import { eq, and, desc } from 'drizzle-orm';
import { decryptMessageMilitary } from '@/lib/security/military-encryption';

// Get unread messages with sender info
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    // Get all unread messages for the current user
    const unreadMessages = await db
      .select({
        message: messages,
        sender: users,
      })
      .from(messages)
      .leftJoin(users, eq(messages.senderId, users.id))
      .where(
        and(
          eq(messages.receiverId, authResult.user.id),
          eq(messages.isRead, false),
          eq(messages.deletedByReceiver, false)
        )
      )
      .orderBy(desc(messages.createdAt))
      .limit(50);

    // Decrypt messages and format response
    const formattedMessages = unreadMessages.map(({ message, sender }) => {
      let content = message.content;
      
      // Decrypt if encrypted
      if (message.isEncrypted && message.encryptedContent) {
        try {
          content = decryptMessageMilitary(message.encryptedContent);
        } catch (error) {
          console.error('Decryption failed for message:', message.id);
          content = '[Encrypted]';
        }
      }

      return {
        id: message.id,
        senderId: message.senderId,
        senderName: sender?.name || 'Unknown',
        senderAvatar: sender?.avatar || null,
        content: content,
        createdAt: message.createdAt,
      };
    });

    // Group by sender and get latest message from each
    const groupedBySender = formattedMessages.reduce((acc: any, msg: any) => {
      if (!acc[msg.senderId]) {
        acc[msg.senderId] = {
          senderId: msg.senderId,
          senderName: msg.senderName,
          senderAvatar: msg.senderAvatar,
          lastMessage: msg.content,
          lastMessageTime: msg.createdAt,
          unreadCount: 1,
        };
      } else {
        acc[msg.senderId].unreadCount++;
      }
      return acc;
    }, {});

    const notifications = Object.values(groupedBySender);

    return NextResponse.json({ 
      notifications,
      totalUnread: formattedMessages.length 
    });
  } catch (error) {
    console.error('Get unread messages error:', error);
    return NextResponse.json(
      { error: 'Failed to get unread messages' },
      { status: 500 }
    );
  }
}
