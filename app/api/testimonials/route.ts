import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { supportTickets, users } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Get approved testimonials
export async function GET(request: NextRequest) {
  try {
    const testimonials = await db
      .select({
        id: supportTickets.id,
        message: supportTickets.message,
        likes: supportTickets.likes,
        createdAt: supportTickets.createdAt,
        approvedAt: supportTickets.approvedAt,
        userId: supportTickets.userId,
        userName: users.name,
        userAvatar: users.avatar,
      })
      .from(supportTickets)
      .leftJoin(users, eq(supportTickets.userId, users.id))
      .where(
        and(
          eq(supportTickets.type, 'testimonial'),
          eq(supportTickets.approved, true)
        )
      )
      .orderBy(desc(supportTickets.approvedAt))
      .limit(10);

    return NextResponse.json({ testimonials });
  } catch (error) {
    console.error('Get testimonials error:', error);
    return NextResponse.json(
      { error: 'Failed to get testimonials' },
      { status: 500 }
    );
  }
}
