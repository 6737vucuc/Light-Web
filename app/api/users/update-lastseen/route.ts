export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth/middleware';
import { eq, sql as rawSql } from 'drizzle-orm';
import Pusher from 'pusher';

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
  const authResult = await requireAuth(request);
  
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    // Update lastSeen to current time
    await db
      .update(users)
      .set({ lastSeen: new Date() })
      .where(eq(users.id, authResult.user.id));

    // Notify contacts about online status
    const pusher = getPusher();
    if (pusher) {
      // Find all users this user has messaged with
      const conversations = await db.execute(rawSql`
        SELECT DISTINCT
          CASE 
            WHEN sender_id = ${authResult.user.id} THEN receiver_id
            ELSE sender_id
          END as other_user_id
        FROM direct_messages
        WHERE sender_id = ${authResult.user.id} OR receiver_id = ${authResult.user.id}
      `);

      // Notify each contact
      for (const conv of (conversations as any)) {
        await pusher.trigger(`user-${conv.other_user_id}`, 'online-status', {
          userId: authResult.user.id,
          isOnline: true,
          lastSeen: new Date().toISOString()
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update lastSeen error:', error);
    return NextResponse.json(
      { error: 'Failed to update lastSeen' },
      { status: 500 }
    );
  }
}

