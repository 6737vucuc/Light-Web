export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { groupMessages } from '@/lib/db/schema';
import Pusher from 'pusher';

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_APP_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
});

export async function POST() {
  try {
    // Delete all group messages
    await db.delete(groupMessages);

    // Notify all clients that messages have been cleared
    await pusher.trigger('group-chat', 'messages-cleared', {
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ 
      success: true, 
      message: 'All group messages have been cleared',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error clearing group messages:', error);
    return NextResponse.json(
      { error: 'Failed to clear messages' },
      { status: 500 }
    );
  }
}
