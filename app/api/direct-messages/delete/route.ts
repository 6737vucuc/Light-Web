import { NextRequest, NextResponse } from 'next/server';
import { db, sql as rawSql } from '@/lib/db';
import { directMessages } from '@/lib/db/schema';
import { verifyAuth } from '@/lib/auth/verify';
import { eq, and, or } from 'drizzle-orm';
import Pusher from 'pusher';

export const runtime = 'nodejs';

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

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messageId } = await request.json();
    if (!messageId) {
      return NextResponse.json({ error: 'Message ID is required' }, { status: 400 });
    }

    // Check if message exists and belongs to user
    const [message] = await rawSql`
      SELECT * FROM direct_messages WHERE id = ${messageId}
    `;

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    if (message.sender_id !== user.userId) {
      return NextResponse.json({ error: 'You can only delete your own messages' }, { status: 403 });
    }

    // Update message as deleted
    await rawSql`
      UPDATE direct_messages 
      SET is_deleted = true, content = NULL, media_url = NULL, deleted_at = NOW()
      WHERE id = ${messageId}
    `;

    // Notify via Pusher
    const pusher = getPusher();
    if (pusher) {
      const otherUserId = message.receiver_id;
      await pusher.trigger(`user-${otherUserId}`, 'message-deleted', {
        messageId: messageId,
        conversationId: user.userId
      });
    }

    return NextResponse.json({ message: 'Message deleted for everyone' });
  } catch (error) {
    console.error('Delete message error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
