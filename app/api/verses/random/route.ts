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
    
    // Create a numeric seed based on the date (YYYYMMDD)
    const dateSeed = parseInt(today.replace(/-/g, ''));

    // 1. Try to fetch verse explicitly scheduled for today
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

    // 2. If no verse scheduled for today, pick one deterministically based on the date seed
    if (targetVerse.length === 0) {
      // Get all available verses for this religion
      const allVerses = await db.select()
        .from(dailyVerses)
        .where(
          or(
            eq(dailyVerses.religion, userReligion),
            eq(dailyVerses.religion, 'all')
          )
        );

      if (allVerses.length > 0) {
        // Use the date seed to pick the same verse for everyone all day
        const index = dateSeed % allVerses.length;
        targetVerse = [allVerses[index]];
      }
    }

    if (targetVerse.length === 0) {
      // Fallback if no verses found in database at all
      return NextResponse.json({
        verse: {
          content: "Let your light shine before others.",
          reference: "Matthew 5:16",
          religion: "all"
        }
      });
    }

    const verse = targetVerse[0];
    return NextResponse.json({ 
      verse: {
        id: verse.id,
        content: verse.verseText,
        reference: verse.verseReference,
        religion: verse.religion,
        displayDate: verse.displayDate || today
      } 
    });
  } catch (error) {
    console.error('Daily verse error:', error);
    return NextResponse.json({ error: 'Failed to fetch daily verse' }, { status: 500 });
  }
}
