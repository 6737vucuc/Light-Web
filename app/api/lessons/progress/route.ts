import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { lessonProgress, lessons, users } from '@/lib/db/schema';
import { verifyAuth } from '@/lib/auth/verify';
import { eq, and, or, desc } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Get user's lesson progress and stats
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Get user details for religion filtering
    const userDetails = await db.query.users.findFirst({
      where: eq(users.id, user.userId),
    });
    const userReligion = userDetails?.religion || 'none';

    // 2. Get all applicable lessons for this user
    const userLessons = await db.select().from(lessons).where(
      or(
        eq(lessons.religion, userReligion),
        eq(lessons.religion, 'all')
      )
    );

    // 3. Get progress records
    const progressRecords = await db.select().from(lessonProgress)
      .where(eq(lessonProgress.userId, user.userId));

    // 4. Calculate Stats
    const totalLessons = userLessons.length;
    const completedCount = progressRecords.filter(p => p.completed).length;
    const inProgressCount = progressRecords.filter(p => !p.completed).length;
    const completionRate = totalLessons > 0 
      ? Math.round((completedCount / totalLessons) * 100) 
      : 0;

    // 5. Get recent activity with lesson titles
    const recentActivity = await db.select({
      id: lessonProgress.id,
      lessonId: lessonProgress.lessonId,
      completed: lessonProgress.completed,
      lastAccessedAt: lessonProgress.lastAccessedAt,
      lessonTitle: lessons.title
    })
    .from(lessonProgress)
    .innerJoin(lessons, eq(lessonProgress.lessonId, lessons.id))
    .where(eq(lessonProgress.userId, user.userId))
    .orderBy(desc(lessonProgress.lastAccessedAt))
    .limit(5);

    return NextResponse.json({ 
      stats: {
        totalLessons,
        completed: completedCount,
        inProgress: inProgressCount,
        completionRate
      },
      recentProgress: recentActivity 
    });
  } catch (error: any) {
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
    const { lessonId, progress: progressValue, completed } = body;

    if (!lessonId) {
      return NextResponse.json(
        { error: 'Lesson ID is required' },
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
      const updateData: any = {
        progress: progressValue !== undefined ? progressValue : (completed ? 100 : existingProgress.progress),
        lastAccessedAt: new Date(),
      };

      if (completed) {
        updateData.completed = true;
        updateData.completedAt = new Date();
      }

      [result] = await db
        .update(lessonProgress)
        .set(updateData)
        .where(eq(lessonProgress.id, existingProgress.id))
        .returning();
    } else {
      [result] = await db.insert(lessonProgress).values({
        userId: user.userId,
        lessonId: parseInt(lessonId.toString()),
        progress: progressValue || (completed ? 100 : 0),
        completed: completed || false,
        completedAt: completed ? new Date() : null,
      }).returning();
    }

    return NextResponse.json({
      message: 'Lesson progress updated successfully',
      progress: result,
    });
  } catch (error: any) {
    console.error('Update lesson progress error:', error);
    return NextResponse.json(
      { error: 'Failed to update lesson progress' },
      { status: 500 }
    );
  }
}
