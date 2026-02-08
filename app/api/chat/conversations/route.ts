import { NextRequest, NextResponse } from 'next/server';
import { sql as rawSql } from '@/lib/db';
import { verifyAuth } from '@/lib/auth/verify';
import { decryptMessageMilitary } from '@/lib/security/military-encryption';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = user.userId;

    // Fetch conversations with advanced SQL for performance and accuracy
    const conversations = await rawSql`
      WITH last_messages AS (
        SELECT DISTINCT ON (
          CASE WHEN sender_id = ${userId} THEN receiver_id ELSE sender_id END
        )
        id, sender_id, receiver_id, content, created_at, is_read, is_encrypted, message_type
        FROM direct_messages
        WHERE sender_id = ${userId} OR receiver_id = ${userId}
        ORDER BY CASE WHEN sender_id = ${userId} THEN receiver_id ELSE sender_id END, created_at DESC
      )
      SELECT 
        u.id as other_user_id,
        u.name,
        u.avatar,
        u.is_online,
        u.last_seen,
        lm.content as last_message,
        lm.created_at as last_message_time,
        lm.is_encrypted,
        lm.message_type,
        (
          SELECT COUNT(*)::int 
          FROM direct_messages 
          WHERE sender_id = u.id AND receiver_id = ${userId} AND is_read = false
        ) as unread_count
      FROM last_messages lm
      JOIN users u ON u.id = (CASE WHEN lm.sender_id = ${userId} THEN lm.receiver_id ELSE lm.sender_id END)
      ORDER BY lm.created_at DESC
    `;

    const formattedConversations = conversations.map((conv: any) => {
      let lastMsg = conv.last_message;
      if (conv.is_encrypted && lastMsg) {
        try { lastMsg = decryptMessageMilitary(lastMsg); } catch { lastMsg = '🔒 Encrypted Message'; }
      }
      
      // Handle different message types for preview
      if (conv.message_type === 'image') lastMsg = '📷 Photo';
      else if (conv.message_type === 'voice') lastMsg = '🎤 Voice message';
      else if (conv.message_type === 'file') lastMsg = '📁 File';

      return {
        id: conv.other_user_id,
        name: conv.name,
        avatar: conv.avatar,
        isOnline: conv.is_online,
        lastSeen: conv.last_seen,
        lastMessage: lastMsg,
        lastMessageTime: conv.last_message_time,
        unreadCount: conv.unread_count
      };
    });

    return NextResponse.json({ conversations: formattedConversations });
  } catch (error) {
    console.error('Conversations API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
