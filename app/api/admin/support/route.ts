import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { supportTickets, users } from '@/lib/db/schema';
import { verifyAuth } from '@/lib/auth/verify';
import { eq, desc } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Get all support tickets (admin only)
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all support tickets with user info
    const tickets = await db
      .select({
        id: supportTickets.id,
        userId: supportTickets.userId,
        subject: supportTickets.subject,
        message: supportTickets.message,
        status: supportTickets.status,
        priority: supportTickets.priority,
        type: supportTickets.category,
        createdAt: supportTickets.createdAt,
        updatedAt: supportTickets.updatedAt,
        user_name: users.name,
        user_email: users.email,
        user_avatar: users.avatar,
      })
      .from(supportTickets)
      .leftJoin(users, eq(supportTickets.userId, users.id))
      .orderBy(desc(supportTickets.createdAt));

    // Ensure dates are properly formatted as ISO strings
    const formattedTickets = tickets.map(ticket => ({
      ...ticket,
      createdAt: ticket.createdAt ? new Date(ticket.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: ticket.updatedAt ? new Date(ticket.updatedAt).toISOString() : new Date().toISOString(),
    }));

    return NextResponse.json({ tickets: formattedTickets });
  } catch (error) {
    console.error('Get support tickets error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch support tickets' },
      { status: 500 }
    );
  }
}
