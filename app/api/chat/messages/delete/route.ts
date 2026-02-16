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
    const { messageId, recipientId } = body;

    if (!messageId) {
      return NextResponse.json({ error: 'Message ID is required' }, { status: 400 });
    }

    // Delete from database (only if sender is the current user)
    await db.delete(directMessages).where(
      and(
        eq(directMessages.id, parseInt(messageId)),
        eq(directMessages.senderId, user.userId)
      )
    );

    // Broadcast deletion via Supabase Realtime
    const channelId = RealtimeChatService.getPrivateChannelName(user.userId, parseInt(recipientId));
    const supabaseAdmin = getSupabaseAdmin();
    
    await supabaseAdmin.channel(channelId).send({
      type: 'broadcast',
      event: ChatEvent.MESSAGE_DELETED,
      payload: {
        messageId: messageId,
        deletedBy: user.userId
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
