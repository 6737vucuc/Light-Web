import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { directMessages } from '@/lib/db/schema';
import { verifyAuth } from '@/lib/auth/verify';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { eq, and } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { senderId } = await request.json();
    if (!senderId) {
      return NextResponse.json({ error: 'Missing senderId' }, { status: 400 });
    }

    const currentUserId = user.userId;

    // Update messages in database
    await db.update(directMessages)
      .set({ isRead: true })
      .where(
        and(
          eq(directMessages.senderId, parseInt(senderId)),
          eq(directMessages.receiverId, currentUserId),
          eq(directMessages.isRead, false)
        )
      );

    // Notify the sender via Supabase Realtime that their messages were read
    const supabaseAdmin = getSupabaseAdmin();
    const channel = supabaseAdmin.channel(`user-${senderId}`);
    
    await channel.send({
      type: 'broadcast',
      event: 'messages-read',
      payload: {
        readerId: currentUserId,
        timestamp: new Date().toISOString()
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
