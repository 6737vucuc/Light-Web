import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/verify';
import { getSupabaseAdmin } from '@/lib/supabase/client';

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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error ending call:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
