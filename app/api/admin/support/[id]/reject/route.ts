import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { supportTickets } from '@/lib/db/schema';
import { verifyAuth } from '@/lib/auth/verify';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Reject testimonial
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth(request);
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const ticketId = parseInt(id);

    await db
      .update(supportTickets)
      .set({ 
        approved: false,
        approvedAt: null,
        approvedBy: null,
        status: 'closed',
        updatedAt: new Date() 
      })
      .where(eq(supportTickets.id, ticketId));

    return NextResponse.json({
      message: 'Testimonial rejected successfully',
    });
  } catch (error) {
    console.error('Reject testimonial error:', error);
    return NextResponse.json(
      { error: 'Failed to reject testimonial' },
      { status: 500 }
    );
  }
}
