import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/verify';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { db } from '@/lib/db';
import { calls } from '@/lib/db/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { receiverId, callerPeerId, callerName, callerAvatar } = await request.json();

    if (!receiverId || !callerPeerId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Broadcast via Supabase Realtime
    const supabaseAdmin = getSupabaseAdmin();
    const channel = supabaseAdmin.channel(`user-${receiverId}`);
    
    await channel.send({
      type: 'broadcast',
      event: 'incoming-call',
      payload: {
        callerId: user.userId,
        callerPeerId,
        callerName: callerName || 'Unknown',
        callerAvatar: callerAvatar || null
      }
    });

    // Record the call in the database
    try {
      await db.insert(calls).values({
        callerId: user.userId,
        receiverId: parseInt(receiverId),
        callerPeerId: callerPeerId,
        status: 'ringing',
        callType: 'voice',
        startedAt: new Date(),
      });
    } catch (dbError) {
      console.error('Error recording call in DB:', dbError);
      // Continue even if DB insert fails to not block the call
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error initiating call:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
