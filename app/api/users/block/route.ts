import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { blockedUsers } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth/middleware';
import { eq, and } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { user } = authResult;

    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Check if already blocked
    const existing = await db
      .select()
      .from(blockedUsers)
      .where(
        and(
          eq(blockedUsers.userId, user.id),
          eq(blockedUsers.blockedUserId, userId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json({ error: 'User already blocked' }, { status: 400 });
    }

    // Block the user
    await db.insert(blockedUsers).values({
      userId: user.id,
      blockedUserId: userId,
    });

    return NextResponse.json({ success: true, message: 'User blocked successfully' });
  } catch (error) {
    console.error('Block user error:', error);
    return NextResponse.json({ error: 'Failed to block user' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { user } = authResult;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Unblock the user
    await db
      .delete(blockedUsers)
      .where(
        and(
          eq(blockedUsers.userId, user.id),
          eq(blockedUsers.blockedUserId, parseInt(userId))
        )
      );

    return NextResponse.json({ success: true, message: 'User unblocked successfully' });
  } catch (error) {
    console.error('Unblock user error:', error);
    return NextResponse.json({ error: 'Failed to unblock user' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { user } = authResult;

    // Get list of blocked users
    const blocked = await db
      .select()
      .from(blockedUsers)
      .where(eq(blockedUsers.userId, user.id));

    return NextResponse.json({ blockedUsers: blocked });
  } catch (error) {
    console.error('Get blocked users error:', error);
    return NextResponse.json({ error: 'Failed to get blocked users' }, { status: 500 });
  }
}
