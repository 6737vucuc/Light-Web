import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { testimonies, supportTickets } from '@/lib/db/schema';
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

    // Try to find in testimonies table first
    const testimonyData = await db
      .select({ id: testimonies.id, likes: testimonies.likes })
      .from(testimonies)
      .where(eq(testimonies.id, testimonyId))
      .limit(1);

    if (testimonyData.length > 0) {
      const currentLikes = testimonyData[0].likes || 0;
      await db
        .update(testimonies)
        .set({ likes: currentLikes + 1 })
        .where(eq(testimonies.id, testimonyId));

      return NextResponse.json({
        message: 'Testimony liked successfully',
        likes: currentLikes + 1,
      });
    }

    // Fallback to supportTickets table for backward compatibility
    const ticketData = await db
      .select({ id: supportTickets.id, likes: supportTickets.likes })
      .from(supportTickets)
      .where(eq(supportTickets.id, testimonyId))
      .limit(1);

    if (ticketData.length > 0) {
      const currentLikes = ticketData[0].likes || 0;
      await db
        .update(supportTickets)
        .set({ likes: currentLikes + 1 })
        .where(eq(supportTickets.id, testimonyId));

      return NextResponse.json({
        message: 'Testimony liked successfully',
        likes: currentLikes + 1,
      });
    }

    return NextResponse.json(
      { error: 'Testimony not found' },
      { status: 404 }
    );
  } catch (error) {
    console.error('Like testimony error:', error);
    return NextResponse.json(
      { error: 'Failed to like testimony' },
      { status: 500 }
    );
  }
}
