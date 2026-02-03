import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { lessonRatings } from '@/lib/db/schema';
import { verifyAuth } from '@/lib/auth/verify';
import { eq, and } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Submit a rating for a lesson
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { lessonId, rating, comment } = await request.json();

    if (!lessonId || !rating) {
      return NextResponse.json({ error: 'Lesson ID and rating are required' }, { status: 400 });
    }

    // Check if user already rated this lesson
    const existingRating = await db.query.lessonRatings.findFirst({
      where: and(
        eq(lessonRatings.userId, user.userId),
        eq(lessonRatings.lessonId, lessonId)
      ),
    });

    if (existingRating) {
      await db.update(lessonRatings)
        .set({
          rating,
          comment: comment || existingRating.comment,
          updatedAt: new Date(),
        })
        .where(eq(lessonRatings.id, existingRating.id));
    } else {
      await db.insert(lessonRatings).values({
        userId: user.userId,
        lessonId,
        rating,
        comment: comment || null,
      });
    }

    return NextResponse.json({ message: 'Rating submitted successfully' });
  } catch (error: any) {
    console.error('Rate lesson error:', error);
    return NextResponse.json({ error: 'Failed to submit rating' }, { status: 500 });
  }
}
