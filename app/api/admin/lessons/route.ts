import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { lessons } from '@/lib/db/schema';
import { requireAdmin } from '@/lib/auth/middleware';
import { desc, eq } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Get all lessons (admin only)
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdmin(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Using lowercase 'createdat' as defined in schema.ts for the lessons table
    const allLessons = await db.select().from(lessons).orderBy(desc(lessons.createdat));

    return NextResponse.json({ lessons: allLessons });
  } catch (error: any) {
    console.error('Get lessons error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lessons' },
      { status: 500 }
    );
  }
}

// Create new lesson (admin only)
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAdmin(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const body = await request.json();
    const { title, content, imageUrl, videoUrl, religion } = body;

    if (!title || !content || !religion) {
      return NextResponse.json(
        { error: 'Title, content, and religion are required' },
        { status: 400 }
      );
    }

    // Insert into database with lowercase column names as defined in schema.ts
    const [newLesson] = await db.insert(lessons).values({
      title: title.trim(),
      content: content.trim(),
      imageurl: imageUrl && imageUrl.trim() !== '' ? imageUrl : null,
      videourl: videoUrl && videoUrl.trim() !== '' ? videoUrl : null,
      religion: religion,
      createdby: authResult.user.id,
      createdat: new Date(),
      updatedat: new Date(),
    }).returning();

    if (!newLesson) {
      return NextResponse.json({ error: 'Failed to save lesson to database' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Lesson created successfully',
      lesson: newLesson,
    });
  } catch (error: any) {
    console.error('Create lesson error:', error);
    return NextResponse.json(
      { error: 'Failed to create lesson: ' + (error.message || 'Unknown error') },
      { status: 500 }
    );
  }
}

// Update lesson (admin only)
export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireAdmin(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const body = await request.json();
    const { id, title, content, imageUrl, videoUrl, religion } = body;

    if (!id || !title || !content || !religion) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const [updatedLesson] = await db.update(lessons)
      .set({
        title: title.trim(),
        content: content.trim(),
        imageurl: imageUrl && imageUrl.trim() !== '' ? imageUrl : null,
        videourl: videoUrl && videoUrl.trim() !== '' ? videoUrl : null,
        religion: religion,
        updatedat: new Date(),
      })
      .where(eq(lessons.id, id))
      .returning();

    if (!updatedLesson) {
      return NextResponse.json({ error: 'Lesson not found or update failed' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Lesson updated successfully',
      lesson: updatedLesson,
    });
  } catch (error: any) {
    console.error('Update lesson error:', error);
    return NextResponse.json(
      { error: 'Failed to update lesson' },
      { status: 500 }
    );
  }
}

// Delete lesson (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireAdmin(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { searchParams } = new URL(request.url);
    const idStr = searchParams.get('id');

    if (!idStr) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const id = parseInt(idStr);
    await db.delete(lessons).where(eq(lessons.id, id));

    return NextResponse.json({
      message: 'Lesson deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete lesson error:', error);
    return NextResponse.json(
      { error: 'Failed to delete lesson' },
      { status: 500 }
    );
  }
}
