import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { dailyVerses } from '@/lib/db/schema';
import { verifyAuth } from '@/lib/auth/verify';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Get all verses (admin only)
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allVerses = await db.query.dailyVerses.findMany({
      orderBy: (dailyVerses, { desc }) => [desc(dailyVerses.displayDate), desc(dailyVerses.createdAt)],
    });

    // Map fields to what frontend expects
    const mappedVerses = allVerses.map(v => ({
      id: v.id,
      content: v.verseText,
      reference: v.verseReference,
      religion: v.religion,
      displayDate: v.displayDate
    }));

    return NextResponse.json({ verses: mappedVerses });
  } catch (error) {
    console.error('Get verses error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch verses' },
      { status: 500 }
    );
  }
}

// Create new verse (admin only)
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { content, reference, religion, displayDate } = body;

    if (!content || !reference) {
      return NextResponse.json(
        { error: 'Content and reference are required' },
        { status: 400 }
      );
    }

    const [verseRecord] = await db.insert(dailyVerses).values({
      verseText: content,
      verseReference: reference,
      religion: religion || 'all',
      displayDate: displayDate || new Date().toISOString().split('T')[0],
    }).returning();

    return NextResponse.json({
      message: 'Verse created successfully',
      verse: verseRecord,
    });
  } catch (error) {
    console.error('Create verse error:', error);
    return NextResponse.json(
      { error: 'Failed to create verse' },
      { status: 500 }
    );
  }
}

// Update verse (admin only)
export async function PUT(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, content, reference, religion, displayDate } = body;

    if (!id || !content || !reference) {
      return NextResponse.json(
        { error: 'ID, content, and reference are required' },
        { status: 400 }
      );
    }

    const [verseRecord] = await db
      .update(dailyVerses)
      .set({
        verseText: content,
        verseReference: reference,
        religion: religion || 'all',
        displayDate: displayDate || new Date().toISOString().split('T')[0],
      })
      .where(eq(dailyVerses.id, id))
      .returning();

    return NextResponse.json({
      message: 'Verse updated successfully',
      verse: verseRecord,
    });
  } catch (error) {
    console.error('Update verse error:', error);
    return NextResponse.json(
      { error: 'Failed to update verse' },
      { status: 500 }
    );
  }
}

// Delete verse (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Verse ID is required' },
        { status: 400 }
      );
    }

    await db.delete(dailyVerses).where(eq(dailyVerses.id, parseInt(id)));

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
