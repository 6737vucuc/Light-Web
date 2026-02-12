import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { verifyAuth } from '@/lib/auth/verify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ----------------- GET MESSAGES -----------------
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const groupId = parseInt(id);

    const user = await verifyAuth(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabaseAdmin = getSupabaseAdmin();

    // تحقق من عضوية المستخدم
    const { data: isMember } = await supabaseAdmin
      .from('group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', user.userId)
      .maybeSingle();
    if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // pagination params
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const before = url.searchParams.get('before');

    let query = supabaseAdmin
      .from('group_messages')
      .select(`
        id,
        content,
        media_url,
        message_type,
        created_at,
        user_id,
        reply_to_id
      `)
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (before) {
      query = query.lt('id', parseInt(before));
    }

    const { data: messages, error } = await query;
    if (error) throw error;

    // جلب بيانات المستخدم لكل رسالة
    const userIds = [...new Set((messages || []).map((m: any) => m.user_id))];
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id, name, avatar')
      .in('id', userIds);

    // جلب بيانات الردود إذا موجودة
    const replyIds = [...new Set((messages || []).map((m: any) => m.reply_to_id).filter(Boolean))];
    let replies: any[] = [];
    if (replyIds.length > 0) {
      const { data } = await supabaseAdmin
        .from('group_messages')
        .select('id, content, user_id')
        .in('id', replyIds);
      replies = data || [];
    }

    const formattedMessages = (messages || []).map((msg: any) => {
      const user = users?.find(u => u.id === msg.user_id) || null;
      const reply = replies.find(r => r.id === msg.reply_to_id) || null;
      const replyUser = reply ? users?.find(u => u.id === reply.user_id) : null;

      return {
        id: msg.id,
        content: msg.content,
        media_url: msg.media_url,
        type: msg.message_type || 'text',
        timestamp: msg.created_at,
        created_at: msg.created_at,
        userId: msg.user_id,
        user,
        reply_to_id: msg.reply_to_id,
        reply_to_content: reply?.content || null,
        reply_to_user: replyUser || null
      };
    });

    return NextResponse.json({ messages: formattedMessages, limit });
  } catch (error: any) {
    console.error('GET Messages Error:', error);
    return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 });
  }
}

// ----------------- POST MESSAGE -----------------
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const groupId = parseInt(id);

    const user = await verifyAuth(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { content, messageType = 'text', mediaUrl = null, replyToId = null } = await request.json();

    const supabaseAdmin = getSupabaseAdmin();

    // تحقق من العضوية قبل الإرسال
    const { data: isMember } = await supabaseAdmin
      .from('group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', user.userId)
      .maybeSingle();
    if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // إدراج الرسالة
    const { data: newMessage, error } = await supabaseAdmin
      .from('group_messages')
      .insert({
        group_id: groupId,
        user_id: user.userId,
        content,
        message_type: messageType,
        media_url: mediaUrl,
        reply_to_id: replyToId
      })
      .select()
      .single();
    if (error) throw error;

    // جلب بيانات المستخدم
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('id, name, avatar')
      .eq('id', user.userId)
      .single();

    // جلب بيانات الرد لو موجود
    let replyMessage = null;
    let replyUser = null;
    if (replyToId) {
      const { data: replyData } = await supabaseAdmin
        .from('group_messages')
        .select('id, content, user_id')
        .eq('id', replyToId)
        .single();
      replyMessage = replyData;

      if (replyMessage?.user_id) {
        const { data: replyUserData } = await supabaseAdmin
          .from('users')
          .select('id, name, avatar')
          .eq('id', replyMessage.user_id)
          .single();
        replyUser = replyUserData;
      }
    }

    const formattedMessage = {
      id: newMessage.id,
      content: newMessage.content,
      media_url: newMessage.media_url,
      type: newMessage.message_type || 'text',
      timestamp: newMessage.created_at,
      created_at: newMessage.created_at,
      userId: user.userId,
      user_id: user.userId,
      user: userData,
      reply_to_id: replyToId,
      reply_to_content: replyMessage?.content || null,
      reply_to_user: replyUser || null
    };

    return NextResponse.json({ success: true, message: formattedMessage });
  } catch (error: any) {
    console.error('POST Message Error:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
