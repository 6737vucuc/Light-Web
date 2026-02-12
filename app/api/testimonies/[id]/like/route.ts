import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { supportTickets } from '@/lib/db/schema';
import { verifyAuth } from '@/lib/auth/verify';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Like a testimony
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const testimonyId = parseInt(id);

    // Get current testimony
    const testimony = await db
      .select({ likes: supportTickets.likes })
      .from(supportTickets)
      .where(eq(supportTickets.id, testimonyId))
      .limit(1);

    if (testimony.length === 0) {
      return NextResponse.json(
        { error: 'Testimony not found' },
        { status: 404 }
      );
    }

    const currentLikes = testimony[0].likes || 0;

    // Update likes
    await db
      .update(supportTickets)
      .set({ likes: currentLikes + 1 })
      .where(eq(supportTickets.id, testimonyId));

    return NextResponse.json({
      message: 'Testimony liked successfully',
      likes: currentLikes + 1,
    });
  } catch (error) {
    console.error('Like testimony error:', error);
    return NextResponse.json(
      { error: 'Failed to like testimony' },
      { status: 500 }
    );
  }
}
