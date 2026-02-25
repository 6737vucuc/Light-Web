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
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 4. Update the support ticket status to 'resolved' and set approved to true
    // This keeps the ticket in the dashboard but marks it as Approved
    await db.update(supportTickets).set({
      approved: true,
      status: 'resolved',
      updatedAt: new Date(),
    }).where(eq(supportTickets.id, ticketId));

    return NextResponse.json({ 
      message: 'Testimony approved and published successfully!',
      success: true 
    });
  } catch (error) {
    console.error('Error approving testimony:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
