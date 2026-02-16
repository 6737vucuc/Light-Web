import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { directMessages } from '@/lib/db/schema';
import { verifyAuth } from '@/lib/auth/verify';
import { RealtimeChatService, ChatEvent } from '@/lib/realtime/chat';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { eq, and } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { recipientId } = body;

    if (!recipientId) {
      return NextResponse.json({ error: 'Recipient ID is required' }, { status: 400 });
    }

    // Update all unread messages from this recipient to the current user
    await db.update(directMessages)
      .set({ isRead: true })
      .where(
        and(
          eq(directMessages.senderId, parseInt(recipientId)),
          eq(directMessages.recipientId, user.userId),
          eq(directMessages.isRead, false)
        )
      );

    // Broadcast read status via Supabase Realtime
    const channelId = RealtimeChatService.getPrivateChannelName(user.userId, parseInt(recipientId));
    const supabaseAdmin = getSupabaseAdmin();
    
    await supabaseAdmin.channel(channelId).send({
      type: 'broadcast',
      event: ChatEvent.MESSAGE_READ,
      payload: {
        readerId: user.userId,
        senderId: parseInt(recipientId)
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
