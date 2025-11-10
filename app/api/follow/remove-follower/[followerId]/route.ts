import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { follows, users } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { verifyToken } from '@/lib/auth/jwt';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ followerId: string }> }
) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const decoded = await verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }
    const currentUserId = decoded.userId as number;
    const { followerId } = await params;
    const followerUserId = parseInt(followerId);

    // Find the follow record where followerUserId follows currentUserId
    const [existingFollow] = await db
      .select()
      .from(follows)
      .where(
        and(
          eq(follows.followerId, followerUserId),
          eq(follows.followingId, currentUserId)
        )
      )
      .limit(1);

    if (!existingFollow) {
      return NextResponse.json(
        { error: 'This user is not following you' },
        { status: 400 }
      );
    }

    // Delete the follow record
    await db
      .delete(follows)
      .where(eq(follows.id, existingFollow.id));

    // Update counts if follow was accepted
    if (existingFollow.status === 'accepted') {
      // Decrement following count for the follower
      await db
        .update(users)
        .set({
          followingCount: sql`GREATEST(${users.followingCount} - 1, 0)`,
        })
        .where(eq(users.id, followerUserId));

      // Decrement followers count for current user
      await db
        .update(users)
        .set({
          followersCount: sql`GREATEST(${users.followersCount} - 1, 0)`,
        })
        .where(eq(users.id, currentUserId));
    }

    return NextResponse.json({
      success: true,
      message: 'Follower removed successfully',
    });
  } catch (error) {
    console.error('Error removing follower:', error);
    return NextResponse.json(
      { error: 'Failed to remove follower' },
      { status: 500 }
    );
  }
}
