import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { lessons, users } from '@/lib/db/schema';
import { verifyAuth } from '@/lib/auth/verify';
import { eq, or, and, desc } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Get lessons filtered by user's religion
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Get user's religion from database
    const userDetails = await db.query.users.findFirst({
      where: eq(users.id, user.userId),
    });

    if (!userDetails || !userDetails.religion) {
      // If user hasn't set a religion, we only show "all" religions lessons
      const publicLessons = await db.select().from(lessons)
        .where(eq(lessons.religion, 'all'))
        .orderBy(desc(lessons.createdat));
        
      return NextResponse.json({ 
        lessons: publicLessons,
        userReligion: 'none'
      });
    }

    const userReligion = userDetails.religion;

    // 2. Fetch lessons:
    // - That match the user's specific religion (islam, christianity, or judaism)
    // - OR that are set for "all" religions
    const filteredLessons = await db.select().from(lessons).where(
      or(
        eq(lessons.religion, userReligion),
        eq(lessons.religion, 'all')
      )
    ).orderBy(desc(lessons.createdat));

    return NextResponse.json({ 
      lessons: filteredLessons,
      userReligion: userReligion
    });
  } catch (error: any) {
    console.error('Get lessons error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lessons' },
      { status: 500 }
    );
  }
}
