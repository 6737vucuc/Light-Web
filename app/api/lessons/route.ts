export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { lessons } from '@/lib/db/schema';
import { requireAdmin } from '@/lib/auth/middleware';
import { desc } from 'drizzle-orm';

// GET all lessons
export async function GET(request: NextRequest) {
  try {
    const allLessons = await db.query.lessons.findMany({
      orderBy: [desc(lessons.createdAt)],
    });

    return NextResponse.json({ lessons: allLessons });
  } catch (error) {
    console.error('Error fetching lessons:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lessons' },
      { status: 500 }
    );
  }
}

// POST create new lesson (admin only)
export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request);
  
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
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

    const [newLesson] = await db.insert(lessons).values({
      title,
      content,
      imageUrl,
      createdBy: authResult.user.id,
    }).returning();

    return NextResponse.json({ lesson: newLesson }, { status: 201 });
  } catch (error) {
    console.error('Error creating lesson:', error);
    return NextResponse.json(
      { error: 'Failed to create lesson' },
      { status: 500 }
    );
  }
}

