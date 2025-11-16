import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { supportReplies, supportTickets } from '@/lib/db/schema';
import { verifyAuth } from '@/lib/auth/verify';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Add a reply to a support ticket
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { ticketId, message } = body;

    if (!ticketId || !message) {
      return NextResponse.json(
        { error: 'Ticket ID and message are required' },
        { status: 400 }
      );
    }

    // Verify ticket exists
    const ticket = await db.query.supportTickets.findFirst({
      where: eq(supportTickets.id, ticketId),
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Check authorization
    if (!user.isAdmin && ticket.userId !== user.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create reply
    const [reply] = await db.insert(supportReplies).values({
      ticketId,
      userId: user.userId,
      message,
      isAdmin: user.isAdmin,
    }).returning();

    // Update ticket status if it was closed
    if (ticket.status === 'closed' || ticket.status === 'resolved') {
      await db
        .update(supportTickets)
        .set({ status: 'in_progress' })
        .where(eq(supportTickets.id, ticketId));
    }

    return NextResponse.json({
      message: 'Reply added successfully',
      reply,
    });
  } catch (error) {
    console.error('Reply creation error:', error);
    return NextResponse.json(
      { error: 'Failed to add reply' },
      { status: 500 }
    );
  }
}
