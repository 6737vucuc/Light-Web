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
        category: supportTickets.category,
        type: supportTickets.type,
        approved: supportTickets.approved,
        created_at: supportTickets.createdAt,
        updated_at: supportTickets.updatedAt,
        user_name: users.name,
        user_email: users.email,
        user_avatar: users.avatar,
      })
      .from(supportTickets)
      .leftJoin(users, eq(supportTickets.userId, users.id))
      .orderBy(desc(supportTickets.createdAt));

    // Ensure dates are properly formatted as ISO strings
    const formattedTickets = tickets.map(ticket => {
      const formatDate = (dateVal: any) => {
        if (!dateVal) return new Date().toISOString();
        try {
          const d = new Date(dateVal);
          return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
        } catch (e) {
          return new Date().toISOString();
        }
      };
      
      // Ensure type is explicitly set for frontend logic
      const type = (ticket.type || ticket.category || 'technical').toLowerCase();
      
      return {
        ...ticket,
        type: type,
        approved: !!ticket.approved,
        category: (ticket.category || '').toLowerCase(),
        createdAt: formatDate(ticket.created_at),
        updatedAt: formatDate(ticket.updated_at),
      };
    });

    return NextResponse.json({ tickets: formattedTickets });
  } catch (error) {
    console.error('Get support tickets error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch support tickets' },
      { status: 500 }
    );
  }
}
