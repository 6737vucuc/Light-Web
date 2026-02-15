import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { supportTickets } from '@/lib/db/schema';
import { verifyAuth } from '@/lib/auth/verify';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Approve testimonial
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
        approved: true, 
        approvedAt: new Date(),
        approvedBy: user.id,
        updatedAt: new Date() 
      })
      .where(eq(supportTickets.id, ticketId));

    return NextResponse.json({
      message: 'Testimonial approved successfully',
    });
  } catch (error) {
    console.error('Approve testimonial error:', error);
    return NextResponse.json(
      { error: 'Failed to approve testimonial' },
      { status: 500 }
    );
  }
}
