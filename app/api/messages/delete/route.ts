export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { messages } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth/middleware';
import { eq, and } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const { messageId, isGroupMessage, deleteFor } = await request.json();

    if (!messageId) {
      return NextResponse.json({ error: 'Message ID required' }, { status: 400 });
    }

    if (isGroupMessage) {
      // Delete group message (only sender can delete)
      await db
        .update(groupChatMessages)
        .set({
          isDeleted: true,
          deletedAt: new Date(),
          content: '[Message deleted]',
          encryptedContent: null,
        })
        .where(
          and(
            eq(groupChatMessages.id, messageId),
            eq(groupChatMessages.userId, authResult.user.id)
          )
        );
    } else {
      // Get the message to check sender/receiver
      const [message] = await db
        .select()
        .from(messages)
        .where(eq(messages.id, messageId))
        .limit(1);

      if (!message) {
        return NextResponse.json({ error: 'Message not found' }, { status: 404 });
      }

      const isSender = message.senderId === authResult.user.id;
      const isReceiver = message.receiverId === authResult.user.id;

      if (!isSender && !isReceiver) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }

      if (deleteFor === 'everyone') {
        // Only sender can delete for everyone
        if (!isSender) {
          return NextResponse.json({ error: 'Only sender can delete for everyone' }, { status: 403 });
        }

        await db
          .update(messages)
          .set({
            isDeleted: true,
            deletedAt: new Date(),
            content: '[Message deleted]',
            encryptedContent: null,
          })
          .where(eq(messages.id, messageId));
      } else {
        // Delete for me only
        if (isSender) {
          await db
            .update(messages)
            .set({ deletedBySender: true })
            .where(eq(messages.id, messageId));
        } else {
          await db
            .update(messages)
            .set({ deletedByReceiver: true })
            .where(eq(messages.id, messageId));
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete message error:', error);
    return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
  }
}

