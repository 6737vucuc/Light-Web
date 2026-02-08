import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { directMessages } from '@/lib/db/schema';
import { verifyAuth } from '@/lib/auth/verify';
import { eq, or, and, asc } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ recipientId: string }> }
) {
  try {
    const user = await verifyAuth(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { recipientId } = await params;
    const targetId = parseInt(recipientId);

    const messages = await db.query.directMessages.findMany({
      where: or(
        and(eq(directMessages.senderId, user.userId), eq(directMessages.recipientId, targetId)),
        and(eq(directMessages.senderId, targetId), eq(directMessages.recipientId, user.userId))
      ),
      orderBy: [asc(directMessages.createdAt)],
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
