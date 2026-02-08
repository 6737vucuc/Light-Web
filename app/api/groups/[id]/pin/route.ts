import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { groupMessagePinned, groupMessages } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { verifyAuth } from '@/lib/auth/verify';
import { getSupabaseAdmin } from '@/lib/supabase/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const groupId = parseInt(id);
    const { messageId } = await request.json();

    // Check if message exists
    const message = await db.query.groupMessages.findFirst({
      where: and(
        eq(groupMessages.id, messageId),
        eq(groupMessages.groupId, groupId)
      ),
    });

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    const supabase = getSupabaseAdmin();
    const channel = supabase.channel(`group-${groupId}`);

    // Check if already pinned
    const existingPin = await db.query.groupMessagePinned.findFirst({
      where: and(
        eq(groupMessagePinned.messageId, messageId),
        eq(groupMessagePinned.groupId, groupId)
      ),
    });

    if (existingPin) {
      // Unpin message
      await db.delete(groupMessagePinned)
        .where(and(
          eq(groupMessagePinned.messageId, messageId),
          eq(groupMessagePinned.groupId, groupId)
        ));

      // Trigger real-time update via Supabase
      await channel.send({
        type: 'broadcast',
        event: 'message-unpinned',
        payload: { messageId, timestamp: new Date().toISOString() },
      });

      return NextResponse.json({ message: 'Message unpinned' });
    } else {
      // Pin message
      await db.insert(groupMessagePinned).values({
        messageId: messageId,
        groupId: groupId,
        pinnedBy: user.userId,
        pinnedAt: new Date(),
      });

      // Trigger real-time update via Supabase
      await channel.send({
        type: 'broadcast',
        event: 'message-pinned',
        payload: { messageId, timestamp: new Date().toISOString() },
      });

      return NextResponse.json({ message: 'Message pinned' });
    }
  } catch (error) {
    console.error('Error pinning message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
