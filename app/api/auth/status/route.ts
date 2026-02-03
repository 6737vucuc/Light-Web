import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { verifyAuth } from '@/lib/auth/verify';
import { RealtimeChatService } from '@/lib/realtime/chat';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { isOnline } = await request.json();

    // Update database
    await db.update(users)
      .set({ 
        isOnline: isOnline,
        lastSeen: new Date()
      })
      .where(eq(users.id, user.userId));

    // Broadcast status change via Pusher
    try {
      await RealtimeChatService.updateOnlineStatus(user.userId, {
        userId: user.userId,
        isOnline,
        lastSeen: new Date()
      });
    } catch (pError) {
      console.error('Pusher status broadcast error:', pError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Status update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
