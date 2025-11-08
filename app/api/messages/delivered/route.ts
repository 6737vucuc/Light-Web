export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { messages } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth/middleware';
import { eq, and } from 'drizzle-orm';
import { RealtimeChatService } from '@/lib/realtime/chat';

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const { messageId } = await request.json();

    if (!messageId) {
      return NextResponse.json({ error: 'Message ID required' }, { status: 400 });
    }

    // Mark message as delivered (only receiver can mark)
    const [updatedMessage] = await db
      .update(messages)
      .set({
        isDelivered: true,
        deliveredAt: new Date(),
      })
      .where(
        and(
          eq(messages.id, messageId),
          eq(messages.receiverId, authResult.user.id),
          eq(messages.isDelivered, false)
        )
      )
      .returning();

    if (updatedMessage) {
      // Send delivery receipt via Pusher to sender
      const senderChannelId = RealtimeChatService.getPrivateChannelName(
        updatedMessage.senderId,
        authResult.user.id
      );
      await RealtimeChatService.sendDeliveryReceipt(senderChannelId, {
        messageId: updatedMessage.id,
        deliveredAt: updatedMessage.deliveredAt || new Date(),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Mark message delivered error:', error);
    return NextResponse.json({ error: 'Failed to mark message as delivered' }, { status: 500 });
  }
}
