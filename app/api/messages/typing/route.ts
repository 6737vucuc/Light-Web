export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { RealtimeChatService } from '@/lib/realtime/chat';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// Update typing status
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const { receiverId, isTyping } = await request.json();

    if (!receiverId) {
      return NextResponse.json(
        { error: 'Receiver ID is required' },
        { status: 400 }
      );
    }

    // Get current user info
    const currentUser = await db.query.users.findFirst({
      where: eq(users.id, authResult.user.id)
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Send typing indicator via Pusher to receiver's channel
    const receiverChannelId = RealtimeChatService.getPrivateChannelName(
      receiverId,
      authResult.user.id
    );

    await RealtimeChatService.sendTypingIndicator(receiverChannelId, {
      userId: authResult.user.id,
      userName: currentUser.name,
      isTyping,
    });

    return NextResponse.json({
      success: true,
      message: 'Typing status updated',
    });
  } catch (error) {
    console.error('Error updating typing status:', error);
    return NextResponse.json(
      { error: 'Failed to update typing status' },
      { status: 500 }
    );
  }
}
