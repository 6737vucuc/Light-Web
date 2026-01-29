import { NextResponse } from 'next/server';
import { RealtimeChatService } from '@/lib/realtime/chat';
import { verifyAuth } from '@/lib/auth/verify';

export async function POST(req: Request) {
  try {
    const user = await verifyAuth(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { recipientId, callerPeerId, callerName, callerAvatar } = body;

    console.log(`[API-Call] Initiating call from ${user.userId} to ${recipientId} with PeerID ${callerPeerId}`);

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
