import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { lessons } from '@/lib/db/schema';
import { verifyAuth } from '@/lib/auth/verify';
import { eq, and } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Get lessons filtered by user's religion
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's religion from database
    const userDetails = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, user.userId),
    });

    if (!userDetails || !userDetails.religion) {
      return NextResponse.json({ 
        lessons: [],
        message: 'Please set your religion in profile settings to view lessons'
      });
    }

    // Fetch lessons for user's religion
    const userLessons = await db.query.lessons.findMany({
      where: eq(lessons.religion, userDetails.religion),
      orderBy: (lessons, { desc }) => [desc(lessons.createdAt)],
    });

    return NextResponse.json({ lessons: userLessons });
  } catch (error) {
    console.error('Get lessons error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lessons' },
      { status: 500 }
    );
  }
}
