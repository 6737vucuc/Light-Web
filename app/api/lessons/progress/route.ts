import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { lessonProgress } from '@/lib/db/schema';
import { verifyAuth } from '@/lib/auth/verify';
import { eq, and } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Get user's lesson progress
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const progress = await db.query.lessonProgress.findMany({
      where: eq(lessonProgress.userId, user.userId),
      orderBy: (lessonProgress, { desc }) => [desc(lessonProgress.lastAccessedAt)],
    });

    return NextResponse.json({ progress });
  } catch (error) {
    console.error('Get lesson progress error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lesson progress' },
      { status: 500 }
    );
  }
}

// Update lesson progress
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { lessonId, lessonTitle, progress: progressValue, completed } = body;

    if (!lessonId || !lessonTitle) {
      return NextResponse.json(
        { error: 'Lesson ID and title are required' },
        { status: 400 }
      );
    }

    // Check if progress already exists
    const existingProgress = await db.query.lessonProgress.findFirst({
      where: and(
        eq(lessonProgress.userId, user.userId),
        eq(lessonProgress.lessonId, lessonId)
      ),
    });

    let result;

    if (existingProgress) {
      // Update existing progress
      const updateData: any = {
        progress: progressValue !== undefined ? progressValue : existingProgress.progress,
        lastAccessedAt: new Date(),
      };

      if (completed) {
        updateData.completed = true;
        updateData.completedAt = new Date();
        updateData.progress = 100;
      }

      [result] = await db
        .update(lessonProgress)
        .set(updateData)
        .where(eq(lessonProgress.id, existingProgress.id))
        .returning();
    } else {
      // Create new progress entry
      [result] = await db.insert(lessonProgress).values({
        userId: user.userId,
        lessonId,
        lessonTitle,
        progress: progressValue || 0,
        completed: completed || false,
        completedAt: completed ? new Date() : null,
      }).returning();
    }

    return NextResponse.json({
      message: 'Lesson progress updated successfully',
      progress: result,
    });
  } catch (error) {
    console.error('Update lesson progress error:', error);
    return NextResponse.json(
      { error: 'Failed to update lesson progress' },
      { status: 500 }
    );
  }
}
