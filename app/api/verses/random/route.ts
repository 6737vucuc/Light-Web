import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { dailyVerses, users } from '@/lib/db/schema';
import { verifyAuth } from '@/lib/auth/verify';
import { eq, or } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    let userReligion = 'all';

    if (user) {
      const userDetails = await db.query.users.findFirst({
        where: eq(users.id, user.userId),
      });
      userReligion = userDetails?.religion || 'all';
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // Get all verses from admin panel filtered by user's religion
    const verses = await db.select()
      .from(dailyVerses)
      .where(
        or(
          eq(dailyVerses.religion, userReligion),
          eq(dailyVerses.religion, 'all')
        )
      );

    if (verses.length === 0) {
      // Fallback if no verses available
      return NextResponse.json({
        verse: {
          content: "Let your light shine before others.",
          reference: "Matthew 5:16",
          religion: "all"
        }
      });
    }

    // Deterministic daily verse using date as seed
    const dateSeed = parseInt(todayStr.replace(/-/g, ''));
    const index = dateSeed % verses.length;
    const verse = verses[index];

    return NextResponse.json({ 
      verse: {
        id: verse.id,
        content: verse.verseText,
        reference: verse.verseReference,
        religion: verse.religion,
        displayDate: todayStr
      } 
    });
  } catch (error) {
    console.error('Daily verse error:', error);
    return NextResponse.json({ error: 'Failed to fetch daily verse' }, { status: 500 });
  }
}
