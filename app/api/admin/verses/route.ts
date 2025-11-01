export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { dailyVerses, users } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth/middleware';
import { eq, desc, gte } from 'drizzle-orm';

// Get all verses (only future and today)
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  // Check if user is admin
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, authResult.user.id))
    .limit(1);

  if (!user || !user.isAdmin) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 403 }
    );
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const verses = await db
      .select()
      .from(dailyVerses)
      .where(gte(dailyVerses.scheduledDate, today))
      .orderBy(desc(dailyVerses.scheduledDate));

    return NextResponse.json({ verses });
  } catch (error) {
    console.error('Get verses error:', error);
    return NextResponse.json(
      { error: 'Failed to get verses' },
      { status: 500 }
    );
  }
}

// Create new daily verse
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  // Check if user is admin
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, authResult.user.id))
    .limit(1);

  if (!user || !user.isAdmin) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { verse, reference, imageUrl, scheduledDate } = body;

    if (!verse || !reference || !scheduledDate) {
      return NextResponse.json(
        { error: 'Verse, reference, and scheduled date are required' },
        { status: 400 }
      );
    }

    const [dailyVerse] = await db
      .insert(dailyVerses)
      .values({
        verse,
        reference,
        imageUrl: imageUrl || null,
        scheduledDate: new Date(scheduledDate),
        createdBy: authResult.user.id,
      })
      .returning();

    return NextResponse.json({
      message: 'Daily verse created successfully',
      verse: dailyVerse,
    });
  } catch (error) {
    console.error('Create verse error:', error);
    return NextResponse.json(
      { error: 'Failed to create verse' },
      { status: 500 }
    );
  }
}

// Delete verse
export async function DELETE(request: NextRequest) {
  const authResult = await requireAuth(request);
  
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  // Check if user is admin
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, authResult.user.id))
    .limit(1);

  if (!user || !user.isAdmin) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Verse ID is required' },
        { status: 400 }
      );
    }

    await db
      .delete(dailyVerses)
      .where(eq(dailyVerses.id, parseInt(id)));

    return NextResponse.json({
      message: 'Verse deleted successfully',
    });
  } catch (error) {
    console.error('Delete verse error:', error);
    return NextResponse.json(
      { error: 'Failed to delete verse' },
      { status: 500 }
    );
  }
}

