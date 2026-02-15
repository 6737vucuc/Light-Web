import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { testimonies, users } from '@/lib/db/schema';
import { verifyAuth } from '@/lib/auth/verify';
import { eq, desc } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Get all approved testimonies
export async function GET(request: NextRequest) {
  try {
    const approvedTestimonies = await db
      .select({
        id: testimonies.id,
        userId: testimonies.userId,
        userName: users.name,
        userAvatar: users.avatar,
        content: testimonies.content,
        createdAt: testimonies.createdAt,
        likes: testimonies.likes,
      })
      .from(testimonies)
      .leftJoin(users, eq(testimonies.userId, users.id))
      .where(eq(testimonies.isApproved, true))
      .orderBy(desc(testimonies.createdAt));

    return NextResponse.json({ testimonies: approvedTestimonies });
  } catch (error) {
    console.error('Get testimonies error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch testimonies' },
      { status: 500 }
    );
  }
}

// Create a new testimony (from support ticket approval)
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { content, religion, userId } = body;

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    const [newTestimony] = await db.insert(testimonies).values({
      userId: userId || user.userId,
      content,
      religion: religion || 'Christianity',
      isApproved: false,
    }).returning();

    return NextResponse.json({
      message: 'Testimony created successfully',
      testimony: newTestimony,
    });
  } catch (error) {
    console.error('Create testimony error:', error);
    return NextResponse.json(
      { error: 'Failed to create testimony' },
      { status: 500 }
    );
  }
}
