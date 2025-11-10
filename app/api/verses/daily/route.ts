export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { dailyVerses } from '@/lib/db/schema';
import { eq, lte, gte, and } from 'drizzle-orm';

// Get today's daily verse
export async function GET(request: NextRequest) {
  try {
    // Get today's date at midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get tomorrow's date at midnight
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find verse scheduled for today
    const [todayVerse] = await db
      .select()
      .from(dailyVerses)
      .where(
        and(
          gte(dailyVerses.scheduledDate, today),
          lte(dailyVerses.scheduledDate, tomorrow)
        )
      )
      .limit(1);

    if (!todayVerse) {
      return NextResponse.json({
        verse: null,
        message: 'No verse scheduled for today',
      });
    }

    return NextResponse.json({
      verse: todayVerse,
    });
  } catch (error) {
    console.error('Error fetching daily verse:', error);
    return NextResponse.json(
      { error: 'Failed to fetch daily verse' },
      { status: 500 }
    );
  }
}
