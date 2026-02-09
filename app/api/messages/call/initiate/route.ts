import { NextRequest, NextResponse } from 'next/server';
import { RealtimeChatService } from '@/lib/realtime/chat';
import { verifyAuth } from '@/lib/auth/verify';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  try {
    const authUser = await verifyAuth(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch full user details from database to get name and avatar
    const user = await db.query.users.findFirst({
      where: eq(users.id, authUser.userId),
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await req.json();
    const { recipientId, callerPeerId, callerName, callerAvatar } = body;

    console.log(`[API-Call] Initiating call from ${user.id} to ${recipientId} with PeerID ${callerPeerId}`);

    if (!recipientId || !callerPeerId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Trigger Pusher event to recipient
    await RealtimeChatService.initiateCall(Number(recipientId), {
      callerPeerId,
      callerName: callerName || user.name || 'User',
      callerAvatar: callerAvatar || user.avatar || null
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API-Call] Call initiate error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
