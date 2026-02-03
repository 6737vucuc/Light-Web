import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { dailyVerses, users } from '@/lib/db/schema';
import { verifyAuth } from '@/lib/auth/verify';
import { eq, or, sql, and } from 'drizzle-orm';

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

    const today = new Date().toISOString().split('T')[0];

    // 1. Try to fetch verse scheduled for today matching user religion or 'all'
    let targetVerse = await db.select()
      .from(dailyVerses)
      .where(
        and(
          eq(dailyVerses.displayDate, today),
          or(
            eq(dailyVerses.religion, userReligion),
            eq(dailyVerses.religion, 'all')
          )
        )
      )
      .limit(1);

    // 2. If no verse for today, get a random one from dailyVerses
    if (targetVerse.length === 0) {
      targetVerse = await db.select()
        .from(dailyVerses)
        .where(
          or(
            eq(dailyVerses.religion, userReligion),
            eq(dailyVerses.religion, 'all')
          )
        )
        .orderBy(sql`RANDOM()`)
        .limit(1);
    }

    if (targetVerse.length === 0) {
      // Fallback if no verses found in dailyVerses
      return NextResponse.json({
        verse: {
          content: "Let your light shine before others.",
          reference: "Matthew 5:16",
          religion: "all"
        }
      });
    }

    // Map daily_verses fields to what the frontend expects (content, reference)
    const verse = targetVerse[0];
    return NextResponse.json({ 
      verse: {
        id: verse.id,
        content: verse.verseText,
        reference: verse.verseReference,
        religion: verse.religion,
        displayDate: verse.displayDate
      } 
    });
  } catch (error) {
    console.error('Random verse error:', error);
    return NextResponse.json({ error: 'Failed to fetch daily verse' }, { status: 500 });
  }
}
