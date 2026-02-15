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

    const { recipientId, content, messageType = 'text' } = await request.json();

    const [newMessage] = await db.insert(directMessages).values({
      senderId: user.userId,
      recipientId: parseInt(recipientId),
      content,
      messageType,
      isRead: false,
    }).returning();

    // Broadcast via Supabase Realtime
    try {
      const channelId = RealtimeChatService.getPrivateChannelName(user.userId, parseInt(recipientId));
      const supabaseAdmin = getSupabaseAdmin();
      const channel = supabaseAdmin.channel(channelId);

      const payload = {
        id: newMessage.id,
        senderId: user.userId,
        user_id: user.userId, // Duplicate for compatibility
        sender_id: user.userId, // Duplicate for compatibility
        recipientId: parseInt(recipientId),
        recipient_id: parseInt(recipientId), // Duplicate for compatibility
        senderName: user.name,
        sender_name: user.name, // Duplicate for compatibility
        senderAvatar: user.avatar,
        sender_avatar: user.avatar, // Duplicate for compatibility
        content: newMessage.content,
        messageType: newMessage.messageType,
        message_type: newMessage.messageType, // Duplicate for compatibility
        timestamp: newMessage.createdAt,
        createdAt: newMessage.createdAt,
        created_at: newMessage.createdAt, // Duplicate for compatibility
        isRead: false,
        is_read: false, // Duplicate for compatibility
      };

      await channel.send({
        type: 'broadcast',
        event: ChatEvent.NEW_MESSAGE,
        payload: payload,
      });
    } catch (broadcastError) {
      console.error('Realtime broadcast error:', broadcastError);
      // Continue even if broadcast fails, as message is saved in DB
    }

    return NextResponse.json({ success: true, message: newMessage });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
