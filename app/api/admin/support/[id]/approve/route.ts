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

    // 3. Insert into the dedicated testimonies table with isApproved = true
    await db.insert(testimonies).values({
      userId: ticket.userId,
      content: ticket.message,
      religion: user?.religion || 'Christian',
      isApproved: true,
      approvedAt: new Date(),
    });

    // 4. Delete the support ticket from the database after approval
    await db.delete(supportTickets).where(eq(supportTickets.id, ticketId));

    return NextResponse.json({ message: 'Testimony approved and published successfully!' });
  } catch (error) {
    console.error('Error approving testimony:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
