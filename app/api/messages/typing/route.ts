import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/verify';
import { getSupabaseAdmin } from '@/lib/supabase/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { receiverId, recipientId, isTyping } = body;
    const targetId = receiverId || recipientId;

    if (!targetId) return NextResponse.json({ error: 'Target ID required' }, { status: 400 });

    // Broadcast via Supabase Realtime
    const supabaseAdmin = getSupabaseAdmin();
    const channel = supabaseAdmin.channel(`user-${targetId}`);
    
    await channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        senderId: user.userId,
        isTyping
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Typing indicator error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
