import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { groupMessages, communityGroups } from '@/lib/db/schema';
import { verifyAuth } from '@/lib/auth/verify';
import { eq, and, sql } from 'drizzle-orm';
import { getSupabaseAdmin } from '@/lib/supabase/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  try {
    const { id, messageId: msgId } = await params;
    
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const groupId = parseInt(id);
    const messageId = parseInt(msgId);

    // Get request body for delete options
    let deleteForEveryone = true;
    try {
      const body = await request.json();
      deleteForEveryone = body.deleteForEveryone !== false;
    } catch {
      // Default to delete for everyone if no body
    }

    // Get message details
    const message = await db.query.groupMessages.findFirst({
      where: and(
        eq(groupMessages.id, messageId),
        eq(groupMessages.groupId, groupId)
      ),
      columns: {
        userId: true,
        createdAt: true,
        content: true,
      }
    });

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // Check if message belongs to user
    if (message.userId !== user.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (deleteForEveryone) {
      // Check if message is within 1 hour for delete for everyone
      const messageTime = message.createdAt ? new Date(message.createdAt).getTime() : 0;
      const currentTime = new Date().getTime();
      const timeDifference = currentTime - messageTime;
      const oneHourInMs = 60 * 60 * 1000;

      if (timeDifference > oneHourInMs) {
        return NextResponse.json({ 
          error: 'Cannot delete for everyone after 1 hour. You can still delete for yourself.',
          canDeleteForEveryone: false,
          canDeleteForMe: true
        }, { status: 400 });
      }

      // Delete message completely (for everyone)
      await db.delete(groupMessages).where(eq(groupMessages.id, messageId));

      // Update messages count
      await db.update(communityGroups)
        .set({ messagesCount: sql`GREATEST(messages_count - 1, 0)` })
        .where(eq(communityGroups.id, groupId));

      // Broadcast deletion to all users via Supabase Realtime
      try {
        const supabaseAdmin = getSupabaseAdmin();
        const channel = supabaseAdmin.channel(`group-${groupId}`);
        await channel.send({
          type: 'broadcast',
          event: 'message-deleted',
          payload: {
            messageId: messageId,
            deletedBy: user.userId,
            deleteForEveryone: true,
          }
        });
      } catch (e) {
        console.error('Supabase Broadcast error:', e);
      }

      return NextResponse.json({ 
        message: 'Message deleted for everyone',
        deletedForEveryone: true 
      });
    } else {
      // Mark message as deleted for this user only (soft delete)
      await db.update(groupMessages)
        .set({ 
          isDeleted: true,
          deletedAt: new Date(),
          content: '[This message was deleted]'
        })
        .where(eq(groupMessages.id, messageId));

      return NextResponse.json({ 
        message: 'Message deleted for you',
        deletedForEveryone: false 
      });
    }
  } catch (error) {
    console.error('Error deleting message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
