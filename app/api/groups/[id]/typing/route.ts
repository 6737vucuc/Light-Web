import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { verifyAuth } from '@/lib/auth/verify';
import { RealtimeChatService, ChatEvent } from '@/lib/realtime/chat';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const groupId = parseInt(id);

    const user = await verifyAuth(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { isTyping } = await request.json();

    const supabaseAdmin = getSupabaseAdmin();

    // تحقق من العضوية
    const { data: isMember } = await supabaseAdmin
      .from('group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', user.userId)
      .maybeSingle();
    if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // بث حالة الكتابة عبر Supabase Realtime Broadcast
    const channelName = RealtimeChatService.getGroupChannelName(groupId);
    const channel = supabaseAdmin.channel(channelName);

    await channel.send({
      type: 'broadcast',
      event: ChatEvent.TYPING,
      payload: {
        userId: user.userId,
        userName: user.name,
        isTyping,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Typing indicator error:', error);
    return NextResponse.json({ error: 'Failed to update typing status' }, { status: 500 });
  }
}
