import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { supportTickets } from '@/lib/db/schema';
import { verifyAuth } from '@/lib/auth/verify';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Create a new support ticket
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { subject, message, category } = body;

    if (!subject || !message || !category) {
      return NextResponse.json(
        { error: 'Subject, message, and category are required' },
        { status: 400 }
      );
    }

    // Create ticket
    const [ticket] = await db.insert(supportTickets).values({
      userId: user.userId,
      subject,
      message,
      category,
      status: 'open',
      priority: 'normal',
    }).returning();

    return NextResponse.json({
      message: 'Support ticket created successfully',
      ticket,
    });
  } catch (error) {
    console.error('Ticket creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create support ticket' },
      { status: 500 }
    );
  }
}

// Get support tickets
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let tickets;

    if (user.isAdmin) {
      // Admins can see all tickets
      tickets = await db.query.supportTickets.findMany({
        with: {
          user: {
            columns: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
        },
        orderBy: (supportTickets, { desc }) => [desc(supportTickets.createdAt)],
      });
    } else {
      // Users can only see their own tickets
      tickets = await db.query.supportTickets.findMany({
        where: eq(supportTickets.userId, user.userId),
        orderBy: (supportTickets, { desc }) => [desc(supportTickets.createdAt)],
      });
    }

    return NextResponse.json({ tickets });
  } catch (error) {
    console.error('Get tickets error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch support tickets' },
      { status: 500 }
    );
  }
}
