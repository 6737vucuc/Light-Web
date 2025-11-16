export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, communityGroups, groupMembers, groupMessages } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth/middleware';
import { eq, desc, or } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    if (!authResult.user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const allUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        username: users.username,
        avatar: users.avatar,
        isAdmin: users.isAdmin,
        isBanned: users.isBanned,
        emailVerified: users.emailVerified,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    return NextResponse.json({ users: allUsers });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json({ error: 'Failed to get users' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    if (!authResult.user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const userIdNum = parseInt(userId);

    // Delete all related data in correct order
    try {
      // Delete group messages
      await db.delete(groupMessages).where(eq(groupMessages.userId, userIdNum));
      
      // Delete group members
      await db.delete(groupMembers).where(eq(groupMembers.userId, userIdNum));
      
      // Finally delete the user
      await db.delete(users).where(eq(users.id, userIdNum));

      return NextResponse.json({ message: 'User deleted successfully' });
    } catch (deleteError) {
      console.error('Delete cascade error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete user and related data' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
