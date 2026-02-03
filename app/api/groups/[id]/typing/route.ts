import { NextRequest, NextResponse } from 'next/server';
import { db, sql } from '@/lib/db';
import { verifyAuth } from '@/lib/auth/verify';
import Pusher from 'pusher';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await verifyAuth(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const groupId = parseInt(id);
    const { isTyping } = await request.json();

    // Get user info for broadcast
    const userInfo = await sql`SELECT name FROM users WHERE id = ${user.userId}`;

    const pusher = getPusher();
    if (pusher) {
      await pusher.trigger(`group-${groupId}`, 'user-typing', {
        userId: user.userId,
        name: userInfo[0]?.name || 'User',
        isTyping
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating typing status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
