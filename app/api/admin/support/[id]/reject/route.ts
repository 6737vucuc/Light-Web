import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { supportTickets } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const ticketId = parseInt(params.id);

    // Update the support ticket status to closed and ensure it's not approved
    await db.update(supportTickets).set({
      approved: false,
      status: 'closed',
      updatedAt: new Date(),
    }).where(eq(supportTickets.id, ticketId));

    return NextResponse.json({ message: 'Testimony rejected and ticket closed' });
  } catch (error) {
    console.error('Error rejecting testimony:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
