import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { supportTickets, users } from '@/lib/db/schema';
import { eq, desc, and, or } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Get all testimonies
export async function GET(request: NextRequest) {
  try {
    // Get approved testimonies from support tickets
    const testimonies = await db
      .select({
        id: supportTickets.id,
        userId: supportTickets.userId,
        userName: users.name,
        userAvatar: users.avatar,
        content: supportTickets.message,
        createdAt: supportTickets.createdAt,
        likes: supportTickets.likes,
      })
      .from(supportTickets)
      .leftJoin(users, eq(supportTickets.userId, users.id))
      .where(
        and(
          or(
            eq(supportTickets.type, 'testimony'),
            eq(supportTickets.type, 'Testimony'),
            eq(supportTickets.type, 'share testimony'),
            eq(supportTickets.category, 'testimony'),
            eq(supportTickets.category, 'Testimony'),
            eq(supportTickets.category, 'share testimony')
          ),
          eq(supportTickets.approved, true)
        )
      )
      .orderBy(desc(supportTickets.createdAt));

    // Transform and filter out null testimonies
    const safeTestimonies = testimonies
      .filter(t => t.content && t.content.trim().length > 0)
      .map(t => ({
        id: t.id,
        userId: t.userId,
        userName: t.userName || 'Anonymous User',
        userAvatar: t.userAvatar || null,
        content: t.content,
        createdAt: t.createdAt,
        likes: t.likes || 0,
      }));

    return NextResponse.json({ testimonies: safeTestimonies });
  } catch (error) {
    console.error('Get testimonies error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch testimonies', testimonies: [] },
      { status: 200 }
    );
  }
}
