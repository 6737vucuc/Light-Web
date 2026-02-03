import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { lessons, users } from '@/lib/db/schema';
import { verifyAuth } from '@/lib/auth/verify';
import { eq, or, desc } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Get lessons filtered by user's religion
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's religion from database directly to ensure we have the latest info
    const userDetails = await db.query.users.findFirst({
      where: eq(users.id, user.userId),
    });

    // If user has no religion set, we can still show "all" religions lessons
    // or return a message. Based on user request, let's be more inclusive.
    const userReligion = userDetails?.religion || 'none';

    // Fetch lessons that match user's religion OR are for "all" religions
    const userLessons = await db.select().from(lessons).where(
      or(
        eq(lessons.religion, userReligion),
        eq(lessons.religion, 'all')
      )
    ).orderBy(desc(lessons.createdAt));

    return NextResponse.json({ 
      lessons: userLessons,
      userReligion: userReligion
    });
  } catch (error: any) {
    console.error('Get lessons error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lessons: ' + (error.message || 'Unknown error') },
      { status: 500 }
    );
  }
}
