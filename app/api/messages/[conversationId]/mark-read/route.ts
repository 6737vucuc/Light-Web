import { NextRequest, NextResponse } from 'next/server';
import { sql as neonSql } from '@/lib/db';
import { verifyAuth } from '@/lib/auth/verify';
import { pusherServer } from '@/lib/realtime/chat';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const user = await verifyAuth(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { conversationId } = await params;
    const otherUserId = parseInt(conversationId);
    const userId = user.userId;

    // Get unread message IDs before marking as read
    const unreadMessages = await neonSql`
      SELECT id FROM direct_messages 
      WHERE sender_id = ${otherUserId} AND receiver_id = ${userId} AND is_read = false
    `;

    // Mark all messages from this user as read
    await neonSql`
      UPDATE direct_messages 
      SET is_read = true, read_at = NOW() 
      WHERE sender_id = ${otherUserId} AND receiver_id = ${userId} AND is_read = false
    `;

    // Trigger Pusher event for each message that was marked as read
    try {
      const channelId = `conversation-${Math.min(userId, otherUserId)}-${Math.max(userId, otherUserId)}`;
      for (const msg of unreadMessages) {
        await pusherServer.trigger(channelId, 'message-read', { messageId: msg.id });
      }
    } catch (pusherError) {
      // Pusher error shouldn't prevent the operation
    }

    return NextResponse.json({ success: true, markedCount: unreadMessages.length });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
