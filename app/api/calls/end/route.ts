import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/verify';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { db } from '@/lib/db';
import { calls } from '@/lib/db/schema';
import { eq, and, or, desc } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { receiverId } = await request.json();

    if (!receiverId) {
      return NextResponse.json({ error: 'Missing receiverId' }, { status: 400 });
    }

    // Notify other party via Supabase Realtime
    const supabaseAdmin = getSupabaseAdmin();
    const channel = supabaseAdmin.channel(`user-${receiverId}`);
    
    await channel.send({
      type: 'broadcast',
      event: 'call-ended',
      payload: {}
    });

    // Update the call status in the database
    try {
      // Find the most recent active call between these two users
      const existingCall = await db.query.calls.findFirst({
        where: and(
          or(
            and(eq(calls.callerId, user.userId), eq(calls.receiverId, parseInt(receiverId))),
            and(eq(calls.callerId, parseInt(receiverId)), eq(calls.receiverId, user.userId))
          ),
          or(eq(calls.status, 'connected'), eq(calls.status, 'ringing'))
        ),
        orderBy: [desc(calls.createdAt)]
      });

      if (existingCall) {
        const endedAt = new Date();
        let duration = 0;
        if (existingCall.startedAt) {
          duration = Math.floor((endedAt.getTime() - new Date(existingCall.startedAt).getTime()) / 1000);
        }

        await db.update(calls)
          .set({ 
            status: 'ended',
            endedAt: endedAt,
            duration: duration > 0 ? duration : 0
          })
          .where(eq(calls.id, existingCall.id));
      }
    } catch (dbError) {
      console.error('Error updating call end in DB:', dbError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error ending call:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
