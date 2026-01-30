import { NextRequest, NextResponse } from 'next/server';
import { db, sql as rawSql } from '@/lib/db';
import { groupMessages, communityGroups } from '@/lib/db/schema';
import { verifyAuth } from '@/lib/auth/verify';
import { eq, and, sql } from 'drizzle-orm';
import Pusher from 'pusher';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getPusher() {
  try {
    const appId = process.env.PUSHER_APP_ID;
    const key = process.env.PUSHER_KEY || process.env.NEXT_PUBLIC_PUSHER_APP_KEY;
    const secret = process.env.PUSHER_SECRET;
    const cluster = process.env.PUSHER_CLUSTER || process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

    if (appId && key && secret && cluster) {
      return new Pusher({
        appId,
        key,
        secret,
        cluster,
        useTLS: true,
      });
    }
  } catch (e) {
    console.error('Pusher initialization failed:', e);
  }
  return null;
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  try {
    const { id, messageId: msgId } = await params;
    
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const groupId = parseInt(id);
    const messageId = parseInt(msgId);

    // Get message details
    const message = await db.query.groupMessages.findFirst({
      where: and(
        eq(groupMessages.id, messageId),
        eq(groupMessages.groupId, groupId)
      ),
      columns: {
        userId: true,
        createdAt: true,
      }
    });

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // Check if message belongs to user
    if (message.userId !== user.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if message is within 1 hour (3600000 milliseconds)
    const messageTime = message.createdAt ? new Date(message.createdAt).getTime() : 0;
    const currentTime = new Date().getTime();
    const timeDifference = currentTime - messageTime;
    const oneHourInMs = 60 * 60 * 1000;

    if (timeDifference > oneHourInMs) {
      return NextResponse.json({ 
        error: 'لا يمكن حذف الرسالة بعد مرور ساعة',
        canDelete: false 
      }, { status: 400 });
    }

    // Delete message (from both sides)
    await db.delete(groupMessages).where(eq(groupMessages.id, messageId));

    // Update messages count
    await db.update(communityGroups)
      .set({ messagesCount: sql`GREATEST(messages_count - 1, 0)` })
      .where(eq(communityGroups.id, groupId));

    // Broadcast deletion to Pusher (for all users)
    const pusher = getPusher();
    if (pusher) {
      try {
        await pusher.trigger(`group-${groupId}`, 'delete-message', {
          messageId: messageId,
          deletedBy: user.userId,
        });
      } catch (e) {
        console.error('Pusher error:', e);
      }
    }

    return NextResponse.json({ 
      message: 'تم حذف الرسالة من الطرفين',
      deletedFromBothSides: true 
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
