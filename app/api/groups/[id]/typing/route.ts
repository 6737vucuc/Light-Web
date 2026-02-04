import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifyAuth } from '@/lib/auth/verify';
import { getSupabaseAdmin } from '@/lib/supabase/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

    // Broadcast via Supabase Realtime
    const supabaseAdmin = getSupabaseAdmin();
    const channel = supabaseAdmin.channel(`group-${groupId}`);
    
    await channel.send({
      type: 'broadcast',
      event: 'user-typing',
      payload: {
        userId: user.userId,
        name: userInfo[0]?.name || 'User',
        isTyping
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating typing status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
