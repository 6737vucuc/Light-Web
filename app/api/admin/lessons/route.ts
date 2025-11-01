export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { lessons, users } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth/middleware';
import { eq, desc } from 'drizzle-orm';

// Get all lessons
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
    const allLessons = await db
      .select()
      .from(lessons)
      .orderBy(desc(lessons.createdAt));

    return NextResponse.json({ lessons: allLessons });
  } catch (error) {
    console.error('Get lessons error:', error);
    return NextResponse.json(
      { error: 'Failed to get lessons' },
      { status: 500 }
    );
  }
}

// Create new lesson
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
    const { title, content, imageUrl } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      );
    }

    const [lesson] = await db
      .insert(lessons)
      .values({
        title,
        content,
        imageUrl: imageUrl || null,
        createdBy: authResult.user.id,
      })
      .returning();

    return NextResponse.json({
      message: 'Lesson created successfully',
      lesson,
    });
  } catch (error) {
    console.error('Create lesson error:', error);
    return NextResponse.json(
      { error: 'Failed to create lesson' },
      { status: 500 }
    );
  }
}

// Update lesson
export async function PUT(request: NextRequest) {
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
    const { id, title, content, imageUrl } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Lesson ID is required' },
        { status: 400 }
      );
    }

    await db
      .update(lessons)
      .set({
        title,
        content,
        imageUrl: imageUrl || null,
        updatedAt: new Date(),
      })
      .where(eq(lessons.id, id));

    return NextResponse.json({
      message: 'Lesson updated successfully',
    });
  } catch (error) {
    console.error('Update lesson error:', error);
    return NextResponse.json(
      { error: 'Failed to update lesson' },
      { status: 500 }
    );
  }
}

// Delete lesson
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
        { error: 'Lesson ID is required' },
        { status: 400 }
      );
    }

    await db
      .delete(lessons)
      .where(eq(lessons.id, parseInt(id)));

    return NextResponse.json({
      message: 'Lesson deleted successfully',
    });
  } catch (error) {
    console.error('Delete lesson error:', error);
    return NextResponse.json(
      { error: 'Failed to delete lesson' },
      { status: 500 }
    );
  }
}

