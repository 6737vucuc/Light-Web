import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { testimonies, users } from '@/lib/db/schema';
import { verifyAuth } from '@/lib/auth/verify';
import { eq, desc } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Get all testimonies (admin only)
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allTestimonies = await db
      .select({
        id: testimonies.id,
        userId: testimonies.userId,
        content: testimonies.content,
        isApproved: testimonies.isApproved,
        createdAt: testimonies.createdAt,
        updatedAt: testimonies.updatedAt,
        userName: users.name,
        userEmail: users.email,
        userAvatar: users.avatar,
      })
      .from(testimonies)
      .leftJoin(users, eq(testimonies.userId, users.id))
      .orderBy(desc(testimonies.createdAt));

    // Format the response to match the expected structure
    const formattedTestimonies = allTestimonies.map((testimony: any) => ({
      ...testimony,
      userName: testimony.userName || 'Unknown User',
      userEmail: testimony.userEmail || '',
    }));

    return NextResponse.json({ testimonies: formattedTestimonies || [] });
  } catch (error) {
    console.error('Get testimonies error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch testimonies' },
      { status: 500 }
    );
  }
}
