import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { groupMessagePinned, groupMessages } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { verifyAuth } from '@/lib/auth/verify';
import Pusher from 'pusher';

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const groupId = parseInt((await params).id);
    const { messageId } = await request.json();

    // Check if message exists
    const message = await db.query.groupMessages.findFirst({
      where: and(
        eq(groupMessages.id, messageId),
        eq(groupMessages.groupId, groupId)
      ),
    });

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // Check if already pinned
    const existingPin = await db.query.groupMessagePinned.findFirst({
      where: and(
        eq(groupMessagePinned.messageId, messageId),
        eq(groupMessagePinned.groupId, groupId)
      ),
    });

    if (existingPin) {
      // Unpin message
      await db.delete(groupMessagePinned)
        .where(and(
          eq(groupMessagePinned.messageId, messageId),
          eq(groupMessagePinned.groupId, groupId)
        ));

      // Trigger real-time update
      try {
        await pusher.trigger(`group-${groupId}`, 'message-unpinned', {
          messageId,
          timestamp: new Date().toISOString(),
        });
      } catch (e) {}

      return NextResponse.json({ message: 'Message unpinned' });
    } else {
      // Pin message
      await db.insert(groupMessagePinned).values({
        messageId: messageId,
        groupId: groupId,
        pinnedBy: user.userId,
        pinnedAt: new Date(),
      });

      // Trigger real-time update
      try {
        await pusher.trigger(`group-${groupId}`, 'message-pinned', {
          messageId,
          timestamp: new Date().toISOString(),
        });
      } catch (e) {}

      return NextResponse.json({ message: 'Message pinned' });
    }
  } catch (error) {
    console.error('Error pinning message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
