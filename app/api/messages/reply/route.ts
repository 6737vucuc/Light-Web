import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { groupMessages } from '@/lib/db/schema';
import { verifyAuth } from '@/lib/auth/verify';
import Pusher from 'pusher';

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
});

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { groupId, content, replyToId, mediaUrl } = await request.json();

    if (!content?.trim() && !mediaUrl) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    // Create the reply message
    const message = await db.insert(groupMessages).values({
      groupId: parseInt(groupId),
      userId: user.userId,
      content: content || '',
      messageType: mediaUrl ? 'image' : 'text',
      mediaUrl: mediaUrl || null,
      replyToId: replyToId ? parseInt(replyToId) : null,
      createdAt: new Date(),
    }).returning();

    // Fetch the created message with user info
    const createdMessage = await db.query.groupMessages.findFirst({
      where: (msg) => msg.id === message[0].id,
      with: {
        user: true,
        replyTo: {
          with: {
            user: true,
          },
        },
      },
    });

    // Trigger real-time update
    await pusher.trigger(`group-${groupId}`, 'new-message', createdMessage);

    return NextResponse.json({ message: createdMessage });
  } catch (error) {
    console.error('Error sending reply:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
