import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { dailyVerses } from '@/lib/db/schema';
import { verifyAuth } from '@/lib/auth/verify';
import { eq, and, lte, gte } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Get today's verse
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
        verse: null,
        message: 'Please set your religion in profile settings to view daily verses'
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const verse = await db.query.dailyVerses.findFirst({
      where: and(
        eq(dailyVerses.displayDate, today.toISOString().split('T')[0]),
        eq(dailyVerses.religion, userDetails.religion),
        eq(dailyVerses.isActive, true)
      ),
    });

    if (!verse) {
      // Return a default verse based on user's religion
      const defaultVerses: Record<string, any> = {
        islam: {
          verseText: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
          verseReference: 'القرآن الكريم',
          language: 'ar',
          religion: 'islam',
        },
        christianity: {
          verseText: 'For God so loved the world that he gave his one and only Son',
          verseReference: 'John 3:16',
          language: 'en',
          religion: 'christianity',
        },
        judaism: {
          verseText: 'Hear, O Israel: The LORD our God, the LORD is one',
          verseReference: 'Deuteronomy 6:4',
          language: 'en',
          religion: 'judaism',
        },
      };

      return NextResponse.json({
        verse: defaultVerses[userDetails.religion] || defaultVerses.christianity,
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
    const { verseText, verseReference, language, religion, displayDate } = body;

    if (!verseText || !verseReference || !religion || !displayDate) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    const [verse] = await db.insert(dailyVerses).values({
      verseText,
      verseReference,
      language: language || 'ar',
      religion,
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
