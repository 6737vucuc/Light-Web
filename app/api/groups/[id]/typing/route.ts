import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { verifyAuth } from '@/lib/auth/verify';

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

    // upsert حالة الكتابة في جدول typing_status
    await supabaseAdmin
      .from('typing_status')
      .upsert({
        group_id: groupId,
        user_id: user.userId,
        is_typing: isTyping,
        started_at: new Date()
      }, { onConflict: ['group_id', 'user_id'] });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Typing Status Error:', error);
    return NextResponse.json({ error: 'Failed to update typing status' }, { status: 500 });
  }
}
