export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { groupChatMessages, users } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth/middleware';
import { desc, eq } from 'drizzle-orm';
import Pusher from 'pusher';

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_APP_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
});

// GET group messages
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const messages = await db
      .select({
        id: groupChatMessages.id,
        userId: groupChatMessages.userId,
        content: groupChatMessages.content,
        createdAt: groupChatMessages.createdAt,
        user: {
          id: users.id,
          name: users.name,
          avatar: users.avatar,
        },
      })
      .from(groupChatMessages)
      .leftJoin(users, eq(groupChatMessages.userId, users.id))
      .where(eq(groupChatMessages.isDeleted, false))
      .orderBy(desc(groupChatMessages.createdAt))
      .limit(100);

    return NextResponse.json({ messages: messages.reverse() });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

// POST new group message
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
    const { content, groupId } = body;

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    if (content.length > 500) {
      return NextResponse.json(
        { error: 'Message is too long (max 500 characters)' },
        { status: 400 }
      );
    }

    const [newMessage] = await db.insert(groupChatMessages).values({
      userId: authResult.user.id,
      groupId: parseInt(groupId),
      content: content.trim(),
    }).returning();

    // Trigger Pusher event
    await pusher.trigger('group-chat', 'new-message', {
      id: newMessage.id,
      userId: authResult.user.id,
      content: newMessage.content,
      createdAt: newMessage.createdAt,
      user: {
        id: authResult.user.id,
        name: authResult.user.name,
        avatar: authResult.user.avatar,
      },
    });

    return NextResponse.json({ message: newMessage }, { status: 201 });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
