export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { messages } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth/middleware';
import { eq, and } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const { messageId } = await request.json();

    if (!messageId) {
      return NextResponse.json({ error: 'Message ID required' }, { status: 400 });
    }

    // Mark message as read (only receiver can mark)
    await db
      .update(messages)
      .set({
        isRead: true,
        readAt: new Date(),
      })
      .where(
        and(
          eq(messages.id, messageId),
          eq(messages.receiverId, authResult.user.id)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Mark message read error:', error);
    return NextResponse.json({ error: 'Failed to mark message as read' }, { status: 500 });
  }
}

