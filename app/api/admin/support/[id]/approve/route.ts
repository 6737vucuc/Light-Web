import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { supportTickets, testimonies } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const ticketId = parseInt(params.id);

    // 1. Get the support ticket
    const ticket = await db.query.supportTickets.findFirst({
      where: eq(supportTickets.id, ticketId),
    });

    if (!ticket) {
      return new NextResponse('Ticket not found', { status: 404 });
    }

    // 2. Update the support ticket with approval status
    await db.update(supportTickets).set({
      approved: true,
      approvedAt: new Date(),
      status: 'resolved',
      updatedAt: new Date(),
    }).where(eq(supportTickets.id, ticketId));

    return NextResponse.json({ message: 'Testimony approved and published!' });
  } catch (error) {
    console.error('Error approving testimony:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
