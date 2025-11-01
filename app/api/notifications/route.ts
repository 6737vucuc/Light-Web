export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { notifications, users } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth/middleware';
import { eq, desc } from 'drizzle-orm';

// GET user's notifications
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const userNotifications = await db
      .select({
        id: notifications.id,
        type: notifications.type,
        userId: notifications.fromUserId,
        userName: users.name,
        userAvatar: users.avatar,
        content: notifications.content,
        postId: notifications.postId,
        isRead: notifications.isRead,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .leftJoin(users, eq(notifications.fromUserId, users.id))
      .where(eq(notifications.userId, authResult.user.id))
      .orderBy(desc(notifications.createdAt))
      .limit(50);

    const unreadCount = userNotifications.filter(n => !n.isRead).length;

    return NextResponse.json({ 
      notifications: userNotifications,
      unreadCount
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

// POST create notification
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
    const { userId, type, content, postId } = body;

    if (!userId || !type || !content) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const [notification] = await db.insert(notifications).values({
      userId,
      fromUserId: authResult.user.id,
      type,
      content,
      postId: postId || null,
      isRead: false,
    }).returning();

    return NextResponse.json({ notification }, { status: 201 });
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    );
  }
}
