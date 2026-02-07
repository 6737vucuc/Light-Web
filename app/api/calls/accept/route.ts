import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/verify';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { db } from '@/lib/db';
import { calls } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { receiverId, receiverPeerId } = await request.json();
    if (!receiverId) return NextResponse.json({ error: 'Missing receiverId' }, { status: 400 });

    // ✅ Notify caller that المكالمة قُبلت
    const supabaseAdmin = getSupabaseAdmin();
    const channel = supabaseAdmin.channel(`user-${receiverId}`);
    await channel.send({
      type: 'broadcast',
      event: 'call-accepted',
      payload: {
        acceptorId: user.userId,
        receiverPeerId: receiverPeerId || null
      }
    });

    // ✅ تحديث حالة المكالمة في DB
    try {
      const existingCall = await db.query.calls.findFirst({
        where: and(
          eq(calls.callerId, parseInt(receiverId)),
          eq(calls.receiverId, user.userId),
          eq(calls.status, 'ringing')
        ),
        orderBy: [desc(calls.createdAt)]
      });

      if (existingCall) {
        await db.update(calls)
          .set({
            status: 'connected',
            receiverPeerId: receiverPeerId,
            startedAt: new Date()
          })
          .where(eq(calls.id, existingCall.id));
      }
    } catch (dbError) {
      console.error('Error updating call in DB:', dbError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error accepting call:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}