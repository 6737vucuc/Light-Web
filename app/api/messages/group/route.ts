import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { groupMessages, users } from '@/lib/db/schema';
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
        id: groupMessages.id,
        userId: groupMessages.userId,
        userName: users.name,
        userAvatar: users.avatar,
        content: groupMessages.content,
        createdAt: groupMessages.createdAt,
      })
      .from(groupMessages)
      .leftJoin(users, eq(groupMessages.userId, users.id))
      .orderBy(desc(groupMessages.createdAt))
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
    const { content } = body;

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    const [newMessage] = await db.insert(groupMessages).values({
      userId: authResult.user.id,
      content,
    }).returning();

    // Trigger Pusher event
    await pusher.trigger('group-chat', 'new-message', {
      id: newMessage.id,
      userId: authResult.user.id,
      userName: authResult.user.name,
      userAvatar: authResult.user.avatar,
      content: newMessage.content,
      createdAt: newMessage.createdAt,
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

