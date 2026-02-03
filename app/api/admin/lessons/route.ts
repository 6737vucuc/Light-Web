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

    // Fetch all lessons ordered by creation date
    const allLessons = await db.select().from(lessons).orderBy(desc(lessons.createdAt));

    return NextResponse.json({ lessons: allLessons });
  } catch (error: any) {
    console.error('Get lessons error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lessons: ' + (error.message || 'Unknown error') },
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

    // Basic validation
    if (!title || !content || !religion) {
      return NextResponse.json(
        { error: 'Title, content, and religion are required' },
        { status: 400 }
      );
    }

    // Using Drizzle to insert - this correctly maps camelCase to snake_case as defined in schema.ts
    // imageUrl maps to image_url, videoUrl maps to video_url
    const [newLesson] = await db.insert(lessons).values({
      title,
      content,
      imageUrl: imageUrl || null,
      videoUrl: videoUrl || null,
      religion,
      createdBy: authResult.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    if (!newLesson) {
      throw new Error('Database failed to return the created lesson');
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
        { error: 'ID, title, content, and religion are required' },
        { status: 400 }
      );
    }

    const [updatedLesson] = await db.update(lessons)
      .set({
        title,
        content,
        imageUrl: imageUrl || null,
        videoUrl: videoUrl || null,
        religion,
        updatedAt: new Date(),
      })
      .where(eq(lessons.id, id))
      .returning();

    if (!updatedLesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Lesson updated successfully',
      lesson: updatedLesson,
    });
  } catch (error: any) {
    console.error('Update lesson error:', error);
    return NextResponse.json(
      { error: 'Failed to update lesson: ' + (error.message || 'Unknown error') },
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
      return NextResponse.json(
        { error: 'Lesson ID is required' },
        { status: 400 }
      );
    }

    const id = parseInt(idStr);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    await db.delete(lessons).where(eq(lessons.id, id));

    return NextResponse.json({
      message: 'Lesson deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete lesson error:', error);
    return NextResponse.json(
      { error: 'Failed to delete lesson: ' + (error.message || 'Unknown error') },
      { status: 500 }
    );
  }
}
