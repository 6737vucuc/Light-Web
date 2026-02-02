import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { verifyAuth } from '@/lib/auth/verify';

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

    // 1. Ensure membership using Admin Client
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

    // 2. Fetch messages using Admin Client to bypass RLS
    const { data: messages, error } = await supabaseAdmin
      .from('group_messages')
      .select(`
        id, content, media_url, message_type, created_at, user_id,
        user:users(id, name, avatar, username)
      `)
      .eq('group_id', groupId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Supabase Admin Fetch Error:', error);
      throw error;
    }

    const formattedMessages = (messages || []).map((msg: any) => ({
      id: msg.id,
      content: msg.content,
      media_url: msg.media_url,
      type: msg.message_type || 'text',
      timestamp: msg.created_at,
      userId: msg.user_id,
      user: msg.user
    }));

    return NextResponse.json({ messages: formattedMessages });
  } catch (error: any) {
    console.error('GET Messages Admin Error:', error);
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
    const { content, messageType = 'text', mediaUrl = null } = body;

    const supabaseAdmin = getSupabaseAdmin();

    // 1. Insert message using Admin Client
    const { data: newMessage, error } = await supabaseAdmin
      .from('group_messages')
      .insert({
        group_id: groupId,
        user_id: user.userId,
        content,
        message_type: messageType,
        media_url: mediaUrl
      })
      .select()
      .single();

    if (error) throw error;

    // 2. Broadcast via Pusher
    try {
      const { pusherServer } = require('@/lib/realtime/chat');
      await pusherServer.trigger(`group-${groupId}`, 'new-message', {
        ...newMessage,
        type: newMessage.message_type,
        timestamp: newMessage.created_at,
        userId: user.userId,
        user: {
          id: user.userId,
          name: user.name,
          avatar: user.avatar,
          username: user.username
        }
      });
    } catch (pError) {
      console.error('Pusher Broadcast Error:', pError);
    }

    return NextResponse.json({ success: true, message: newMessage });
  } catch (error: any) {
    console.error('POST Message Admin Error:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
