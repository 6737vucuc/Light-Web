import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { testimonies, users } from '@/lib/db/schema';
import { eq, desc, and } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Get all testimonies
export async function GET(request: NextRequest) {
  try {
    // Get approved testimonies from the dedicated testimonies table
    const result = await db
      .select({
        id: testimonies.id,
        userId: testimonies.userId,
        userName: users.name,
        userAvatar: users.avatar,
        content: testimonies.content,
        createdAt: testimonies.createdAt,
        likes: testimonies.id, // We'll use id as a placeholder if likes field doesn't exist in testimonies table
      })
      .from(testimonies)
      .leftJoin(users, eq(testimonies.userId, users.id))
      .where(eq(testimonies.isApproved, true))
      .orderBy(desc(testimonies.createdAt));

    // Transform and filter out null testimonies
    const safeTestimonies = result
      .filter(t => t.content && t.content.trim().length > 0)
      .map(t => ({
        id: t.id,
        userId: t.userId,
        userName: t.userName || 'Anonymous User',
        userAvatar: t.userAvatar || null,
        content: t.content,
        createdAt: t.createdAt,
        likes: 0, // Default to 0 likes
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
