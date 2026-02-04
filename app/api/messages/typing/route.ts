import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/verify';
import Pusher from 'pusher';

export const runtime = 'nodejs';

function getPusher() {
  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.PUSHER_KEY || process.env.NEXT_PUBLIC_PUSHER_APP_KEY;
  const secret = process.env.PUSHER_SECRET;
  const cluster = process.env.PUSHER_CLUSTER || process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

  if (appId && key && secret && cluster) {
    return new Pusher({ appId, key, secret, cluster, useTLS: true });
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { receiverId, recipientId, isTyping } = body;
    const targetId = receiverId || recipientId;

    if (!targetId) return NextResponse.json({ error: 'Target ID required' }, { status: 400 });

    const pusher = getPusher();
    if (pusher) {
      // Trigger on user's main channel for consistency
      await pusher.trigger(`user-${targetId}`, 'typing', {
        senderId: user.userId,
        isTyping
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Typing indicator error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
