import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { directMessages } from '@/lib/db/schema';
import { verifyAuth } from '@/lib/auth/verify';
import { RealtimeChatService } from '@/lib/realtime/chat';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { recipientId, content, messageType = 'text' } = await request.json();

    const [newMessage] = await db.insert(directMessages).values({
      senderId: user.userId,
      recipientId: parseInt(recipientId),
      content,
      messageType,
      isRead: false,
    }).returning();

    // Broadcast via Supabase Realtime
    const channelId = RealtimeChatService.getPrivateChannelName(user.userId, parseInt(recipientId));
    await RealtimeChatService.sendMessage(channelId, {
      id: newMessage.id,
      senderId: user.userId,
      senderName: user.name,
      senderAvatar: user.avatar,
      content: newMessage.content,
      messageType: newMessage.messageType,
      timestamp: newMessage.createdAt,
      isRead: false,
    });

    return NextResponse.json({ success: true, message: newMessage });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
