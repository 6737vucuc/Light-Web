export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { messages, groupChatMessages } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth/middleware';
import { eq, and } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const { messageId, isGroupMessage } = await request.json();

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
      // Delete private message (sender can delete for everyone)
      await db
        .update(messages)
        .set({
          isDeleted: true,
          deletedAt: new Date(),
          content: '[Message deleted]',
          encryptedContent: null,
        })
        .where(
          and(
            eq(messages.id, messageId),
            eq(messages.senderId, authResult.user.id)
          )
        );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete message error:', error);
    return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 });
  }
}

