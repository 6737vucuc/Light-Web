import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { dailyVerses } from '@/lib/db/schema';
import { verifyAuth } from '@/lib/auth/verify';
import { eq, and } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Get today's verse
export async function GET(request: NextRequest) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const verse = await db.query.dailyVerses.findFirst({
      where: and(
        eq(dailyVerses.displayDate, today.toISOString().split('T')[0]),
        eq(dailyVerses.isActive, true)
      ),
    });

    if (!verse) {
      // Return a default verse if none is set for today
      return NextResponse.json({
        verse: {
          verseText: 'For God so loved the world that he gave his one and only Son',
          verseReference: 'John 3:16',
          language: 'en',
        },
      });
    }

    return NextResponse.json({ verse });
  } catch (error) {
    console.error('Get daily verse error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch daily verse' },
      { status: 500 }
    );
  }
}

// Create a new daily verse (admin only)
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { verseText, verseReference, language, displayDate } = body;

    if (!verseText || !verseReference || !displayDate) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    const [verse] = await db.insert(dailyVerses).values({
      verseText,
      verseReference,
      language: language || 'en',
      religion: 'all', // Set default value for existing schema
      displayDate,
      isActive: true,
      createdBy: user.userId,
    }).returning();

    return NextResponse.json({
      message: 'Daily verse created successfully',
      verse,
    });
  } catch (error) {
    console.error('Create daily verse error:', error);
    return NextResponse.json(
      { error: 'Failed to create daily verse' },
      { status: 500 }
    );
  }
}
