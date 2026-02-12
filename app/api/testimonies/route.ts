import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { supportTickets, users } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Get all testimonies
export async function GET(request: NextRequest) {
  try {
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
      .where(eq(supportTickets.type, 'testimony'))
      .orderBy(desc(supportTickets.createdAt));

    // حماية من null أو undefined عند المستخدمين
    const safeTestimonies = testimonies.map(t => ({
      ...t,
      userName: t.userName ?? null,
      userAvatar: t.userAvatar ?? null,
    }));

    return NextResponse.json({ testimonies: safeTestimonies });
  } catch (error) {
    console.error('Get testimonies error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch testimonies' },
      { status: 500 }
    );
  }
}
