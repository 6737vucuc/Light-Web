export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { lessonProgress, lessons } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth/middleware';
import { eq, and } from 'drizzle-orm';

// GET user's lesson progress
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const progress = await db
      .select({
        lessonId: lessonProgress.lessonId,
        completed: lessonProgress.completed,
        progress: lessonProgress.progress,
        lastWatchedAt: lessonProgress.lastWatchedAt,
        completedAt: lessonProgress.completedAt,
        lesson: {
          id: lessons.id,
          title: lessons.title,
          content: lessons.content,
          imageUrl: lessons.imageUrl,
          createdAt: lessons.createdAt,
        },
      })
      .from(lessonProgress)
      .leftJoin(lessons, eq(lessonProgress.lessonId, lessons.id))
      .where(eq(lessonProgress.userId, authResult.user.id));

    return NextResponse.json({ progress });
  } catch (error) {
    console.error('Error fetching lesson progress:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lesson progress' },
      { status: 500 }
    );
  }
}

// POST update lesson progress
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const body = await request.json();
    const { lessonId, progress: progressValue, completed } = body;

    if (!lessonId) {
      return NextResponse.json(
        { error: 'Lesson ID is required' },
        { status: 400 }
      );
    }

    // Check if progress record exists
    const [existingProgress] = await db
      .select()
      .from(lessonProgress)
      .where(
        and(
          eq(lessonProgress.userId, authResult.user.id),
          eq(lessonProgress.lessonId, lessonId)
        )
      );

    if (existingProgress) {
      // Update existing progress
      await db
        .update(lessonProgress)
        .set({
          progress: progressValue !== undefined ? progressValue : existingProgress.progress,
          completed: completed !== undefined ? completed : existingProgress.completed,
          completedAt: completed ? new Date() : existingProgress.completedAt,
          lastWatchedAt: new Date(),
        })
        .where(
          and(
            eq(lessonProgress.userId, authResult.user.id),
            eq(lessonProgress.lessonId, lessonId)
          )
        );
    } else {
      // Create new progress record
      await db.insert(lessonProgress).values({
        userId: authResult.user.id,
        lessonId,
        progress: progressValue || 0,
        completed: completed || false,
        completedAt: completed ? new Date() : null,
        lastWatchedAt: new Date(),
      });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Progress updated successfully' 
    });
  } catch (error) {
    console.error('Error updating lesson progress:', error);
    return NextResponse.json(
      { error: 'Failed to update lesson progress' },
      { status: 500 }
    );
  }
}
