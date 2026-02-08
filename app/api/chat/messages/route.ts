import { NextRequest, NextResponse } from 'next/server';
import { db, sql as rawSql } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { verifyAuth } from '@/lib/auth/verify';
import { eq } from 'drizzle-orm';
import { encryptMessageMilitary } from '@/lib/security/military-encryption';
import { getSupabaseAdmin } from '@/lib/supabase/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { receiverId, content, messageType, mediaUrl } = await request.json();
    if (!receiverId || (!content && !mediaUrl)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Military Encryption for privacy
    const encryptedContent = content ? encryptMessageMilitary(content) : null;

    // Save to Database
    const [newMessage] = await rawSql`
      INSERT INTO direct_messages (sender_id, receiver_id, content, message_type, media_url, is_encrypted)
      VALUES (${user.userId}, ${receiverId}, ${encryptedContent}, ${messageType || 'text'}, ${mediaUrl || null}, true)
      RETURNING *
    `;

    // Real-time broadcast via Supabase
    const channelId = `chat-${Math.min(user.userId, receiverId)}-${Math.max(user.userId, receiverId)}`;
    const supabaseAdmin = getSupabaseAdmin();
    
    const broadcastMsg = {
      id: newMessage.id,
      senderId: user.userId,
      receiverId: receiverId,
      content: content, // Send unencrypted for immediate UI update
      messageType: newMessage.message_type,
      mediaUrl: newMessage.media_url,
      createdAt: newMessage.created_at,
      isRead: false
    };

    await supabaseAdmin.channel(channelId).send({
      type: 'broadcast',
      event: 'new-message',
      payload: broadcastMsg
    });

    return NextResponse.json({ message: broadcastMsg }, { status: 201 });
  } catch (error) {
    console.error('Send Message API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
