import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { verifyAuth } from '@/lib/auth/verify';
import { pusherServer } from '@/lib/pusher/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

    // 1. Ensure membership
    const { data: existingMember } = await supabaseAdmin
      .from('group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', user.userId)
      .maybeSingle();

    if (!existingMember) {
      await supabaseAdmin
        .from('group_members')
        .insert({
          group_id: groupId,
          user_id: user.userId,
          role: 'member'
        });
    }

    // 2. Fetch messages
    const { data: messages, error } = await supabaseAdmin
      .from('group_messages')
      .select(`
        id, content, media_url, message_type, created_at, user_id,
        user:users!group_messages_user_id_fkey(id, name, avatar),
        reply_to_id, reply_to_content, reply_to_user_name
      `)
      .eq('group_id', groupId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    const formattedMessages = (messages || []).map((msg: any) => ({
      id: msg.id,
      content: msg.content,
      media_url: msg.media_url,
      type: msg.message_type || 'text',
      timestamp: msg.created_at,
      created_at: msg.created_at,
      userId: msg.user_id,
      user_id: msg.user_id,
      user: msg.user,
      reply_to_id: msg.reply_to_id,
      reply_to_content: msg.reply_to_content,
      reply_to_user_name: msg.reply_to_user_name
    }));

    return NextResponse.json({ messages: formattedMessages });
  } catch (error: any) {
    console.error('GET Messages Error:', error);
    return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const groupId = parseInt(id);
    
    const user = await verifyAuth(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { content, messageType = 'text', mediaUrl = null, replyToId = null, replyToContent = null, replyToUserName = null } = body;

    const supabaseAdmin = getSupabaseAdmin();

    // 1. Insert message
    const { data: newMessage, error } = await supabaseAdmin
      .from('group_messages')
      .insert({
        group_id: groupId,
        user_id: user.userId,
        content,
        message_type: messageType,
        media_url: mediaUrl,
        reply_to_id: replyToId,
        reply_to_content: replyToContent,
        reply_to_user_name: replyToUserName
      })
      .select()
      .single();

    if (error) throw error;

    // 2. Fetch user data
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('id, name, avatar')
      .eq('id', user.userId)
      .single();

    // 3. Broadcast via Pusher - Use a public channel for maximum reliability
    const formattedMessage = {
      id: newMessage.id,
      content: newMessage.content,
      media_url: newMessage.media_url,
      type: newMessage.message_type || 'text',
      timestamp: newMessage.created_at,
      created_at: newMessage.created_at,
      userId: user.userId,
      user_id: user.userId,
      user: userData || {
        id: user.userId,
        name: user.name,
        avatar: user.avatar
      },
      reply_to_id: replyToId,
      reply_to_content: replyToContent,
      reply_to_user_name: replyToUserName
    };

    try {
      await pusherServer.trigger(`chat-${groupId}`, 'new-message', formattedMessage);
    } catch (pusherError) {
      console.error('Pusher Broadcast Error:', pusherError);
    }

    return NextResponse.json({ success: true, message: formattedMessage });
  } catch (error: any) {
    console.error('POST Message Error:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
