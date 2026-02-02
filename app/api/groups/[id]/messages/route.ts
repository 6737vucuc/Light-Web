import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
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

    // 1. Securely handle membership/auto-join using Supabase SDK
    const { data: existingMember } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', user.userId)
      .single();

    if (!existingMember) {
      await supabase
        .from('group_members')
        .insert({
          group_id: groupId,
          user_id: user.userId,
          role: 'member'
        });
      
      // Update members count safely
      const { count } = await supabase
        .from('group_members')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', groupId);
        
      await supabase
        .from('community_groups')
        .update({ members_count: count })
        .eq('id', groupId);
    }

    // 2. Fetch messages securely using Supabase SDK with relational join
    const { data: messages, error } = await supabase
      .from('group_messages')
      .select(`
        id, content, media_url, message_type, created_at, user_id,
        user:users(id, name, avatar, username)
      `)
      .eq('group_id', groupId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    const formattedMessages = messages.map((msg: any) => ({
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
    console.error('GET Messages SDK Error:', error);
    return NextResponse.json({ error: 'Failed to load messages securely' }, { status: 500 });
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

    // 1. Insert message securely using Supabase SDK
    const { data: newMessage, error } = await supabase
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

    // 2. Update group stats safely
    const { count } = await supabase
      .from('group_messages')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', groupId);

    await supabase
      .from('community_groups')
      .update({ messages_count: count })
      .eq('id', groupId);

    // 3. Broadcast via Pusher for real-time
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
    console.error('POST Message SDK Error:', error);
    return NextResponse.json({ error: 'Failed to send message securely' }, { status: 500 });
  }
}
