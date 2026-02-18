import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { supportTickets, testimonies, users } from '@/lib/db/schema';
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

    // 2. Get user info for religion
    const user = await db.query.users.findFirst({
      where: eq(users.id, ticket.userId),
    });

    // 3. Insert into the dedicated testimonies table
    await db.insert(testimonies).values({
      userId: ticket.userId,
      content: ticket.message,
      religion: user?.religion || 'Christian', // Default to Christian if not set
      isApproved: true,
      approvedAt: new Date(),
    });

    // 4. Update the support ticket with approval status
    await db.update(supportTickets).set({
      approved: true,
      approvedAt: new Date(),
      status: 'resolved',
      updatedAt: new Date(),
    }).where(eq(supportTickets.id, ticketId));

    return NextResponse.json({ message: 'Testimony approved and copied to dedicated table!' });
  } catch (error) {
    console.error('Error approving testimony:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
