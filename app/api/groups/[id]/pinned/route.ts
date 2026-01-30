import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { groupMessagePinned } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { verifyAuth } from '@/lib/auth/verify';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyAuth(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const groupId = parseInt(params.id);

    // Get pinned messages
    const pinnedMessages = await db.query.groupMessagePinned.findMany({
      where: eq(groupMessagePinned.groupId, groupId),
      with: {
        message: {
          with: {
            user: true,
          },
        },
      },
      orderBy: (pinned, { desc }) => [desc(pinned.pinnedAt)],
      limit: 10,
    });

    return NextResponse.json({ pinnedMessages });
  } catch (error) {
    console.error('Error fetching pinned messages:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
