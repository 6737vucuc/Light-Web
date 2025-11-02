export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { messages } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth/middleware';
import { eq, and } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const { messageId: paramId } = await params;
  const authResult = await requireAuth(request);
  
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const messageId = parseInt(paramId);
    const { deleteForEveryone } = await request.json();

    // Get the message
    const message = await db.query.messages.findFirst({
      where: eq(messages.id, messageId),
    });

    if (!message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    // Check if user is the sender or receiver
    const isSender = message.senderId === authResult.user.id;
    const isReceiver = message.receiverId === authResult.user.id;

    if (!isSender && !isReceiver) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    if (deleteForEveryone) {
      // Only sender can delete for everyone
      if (!isSender) {
        return NextResponse.json(
          { error: 'Only sender can delete for everyone' },
          { status: 403 }
        );
      }

      // Mark as deleted for both
      await db
        .update(messages)
        .set({
          isDeleted: true,
          deletedAt: new Date(),
          deletedBySender: true,
          deletedByReceiver: true,
        })
        .where(eq(messages.id, messageId));
    } else {
      // Delete for self only
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete message error:', error);
    return NextResponse.json(
      { error: 'Failed to delete message' },
      { status: 500 }
    );
  }
}

