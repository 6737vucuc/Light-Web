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
  receiverId: parseInt(recipientId),
  content,
  messageType,
  isRead: false,
  isDeleted: false,
}).returning();
    // Broadcast via Supabase Realtime
    try {
      const channelId = RealtimeChatService.getPrivateChannelName(user.userId, recipientId);
      const supabaseAdmin = getSupabaseAdmin();
      
      // Send broadcast event
      await supabaseAdmin.channel(channelId).send({
        type: 'broadcast',
        event: ChatEvent.NEW_MESSAGE,
        payload: {
          id: newMessage.id,
          senderId: user.userId,
          recipientId: parseInt(recipientId),
          content: newMessage.content,
          createdAt: newMessage.createdAt,
          messageType: newMessage.messageType,
          senderName: user.name,
          senderAvatar: user.avatar,
          isRead: false
        },
      });
    } catch (broadcastError) {
      console.error('Realtime broadcast error:', broadcastError);
    }

    return NextResponse.json({ success: true, message: newMessage });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
