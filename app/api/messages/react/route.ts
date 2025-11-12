export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { messageReactions } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth/middleware';
import { eq, and } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const { messageId, reaction } = await request.json();

    if (!messageId || !reaction) {
      return NextResponse.json({ error: 'Message ID and reaction are required' }, { status: 400 });
    }

    // Check if user already reacted to this message
    const existingReaction = await db
      .select()
      .from(messageReactions)
      .where(
        and(
          eq(messageReactions.messageId, messageId),
          eq(messageReactions.userId, authResult.user.id)
        )
      )
      .limit(1);

    if (existingReaction.length > 0) {
      // Update existing reaction
      await db
        .update(messageReactions)
        .set({ reaction })
        .where(
          and(
            eq(messageReactions.messageId, messageId),
            eq(messageReactions.userId, authResult.user.id)
          )
        );
    } else {
      // Add new reaction
      await db
        .insert(messageReactions)
        .values({
          messageId,
          userId: authResult.user.id,
          reaction,
        });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('React to message error:', error);
    return NextResponse.json({ error: 'Failed to add reaction' }, { status: 500 });
  }
}

// Remove reaction
export async function DELETE(request: NextRequest) {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('messageId');

    if (!messageId) {
      return NextResponse.json({ error: 'Message ID is required' }, { status: 400 });
    }

    await db
      .delete(messageReactions)
      .where(
        and(
          eq(messageReactions.messageId, parseInt(messageId)),
          eq(messageReactions.userId, authResult.user.id)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Remove reaction error:', error);
    return NextResponse.json({ error: 'Failed to remove reaction' }, { status: 500 });
  }
}
