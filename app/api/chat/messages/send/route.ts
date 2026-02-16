import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { directMessages } from '@/lib/db/schema';
import { verifyAuth } from '@/lib/auth/verify';
import { RealtimeChatService, ChatEvent } from '@/lib/realtime/chat';
import { getSupabaseAdmin } from '@/lib/supabase/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { recipientId, content, messageType = 'text', tempId } = body;

    const [newMessage] = await db.insert(directMessages).values({
      senderId: user.userId,
      recipientId: parseInt(recipientId),
      content,
      messageType,
      isRead: false,
    }).returning();

    // Broadcast via Supabase Realtime
    const channelId = RealtimeChatService.getPrivateChannelName(user.userId, parseInt(recipientId));
    const supabaseAdmin = getSupabaseAdmin();
    
    const messagePayload = {
      id: newMessage.id,
      clientId: tempId,
      senderId: user.userId,
      senderName: user.name,
      senderAvatar: user.avatar,
      content: newMessage.content,
      messageType: newMessage.messageType,
      timestamp: newMessage.createdAt,
      createdAt: newMessage.createdAt,
      isRead: false,
    };

    // Broadcast to the private chat channel
    await supabaseAdmin.channel(channelId).send({
      type: 'broadcast',
      event: ChatEvent.NEW_MESSAGE,
      payload: messagePayload,
    });

    // Also broadcast to the recipient's global notification channel
    const notificationChannelName = `user-notifications:${recipientId}`;
    await supabaseAdmin.channel(notificationChannelName).send({
      type: 'broadcast',
      event: ChatEvent.NEW_MESSAGE,
      payload: messagePayload,
    });

    return NextResponse.json({ success: true, message: newMessage });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
