import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { groupMessages } from '@/lib/db/schema';
import { eq, like, ilike } from 'drizzle-orm';
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
    const searchQuery = request.nextUrl.searchParams.get('q') || '';

    if (!searchQuery.trim()) {
      return NextResponse.json({ results: [] });
    }

    // Search messages by content
    const results = await db.query.groupMessages.findMany({
      where: (messages, { and }) => and(
        eq(messages.groupId, groupId),
        ilike(messages.content, `%${searchQuery}%`)
      ),
      with: {
        user: true,
      },
      orderBy: (messages, { desc }) => [desc(messages.createdAt)],
      limit: 50,
    });

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error searching messages:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
