import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { conversationParticipants } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { verifyAuth } from '@/lib/auth/verify';

// POST /api/conversations/[id]/read - Mark conversation as read
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await verifyAuth(req);
    if (!authResult.valid || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const conversationId = parseInt(params.id);
    const userId = authResult.user.id;

    // Update last_read_at timestamp
    await db
      .update(conversationParticipants)
      .set({ lastReadAt: new Date() })
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.userId, userId)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error marking as read:', error);
    return NextResponse.json({ error: 'Failed to mark as read' }, { status: 500 });
  }
}
