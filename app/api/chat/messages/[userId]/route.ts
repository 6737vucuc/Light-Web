import { NextRequest, NextResponse } from 'next/server';
import { sql as rawSql } from '@/lib/db';
import { verifyAuth } from '@/lib/auth/verify';
import { decryptMessageMilitary } from '@/lib/security/military-encryption';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: otherUserId } = await params;
    const user = await verifyAuth(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const currentUserId = user.userId;

    // Fetch messages with sender info and reply info
    const messages = await rawSql`
      SELECT 
        dm.*,
        u.name as sender_name,
        u.avatar as sender_avatar,
        rm.content as reply_content,
        rm.message_type as reply_type
      FROM direct_messages dm
      JOIN users u ON dm.sender_id = u.id
      LEFT JOIN direct_messages rm ON dm.reply_to_id = rm.id
      WHERE (dm.sender_id = ${currentUserId} AND dm.receiver_id = ${otherUserId})
         OR (dm.sender_id = ${otherUserId} AND dm.receiver_id = ${currentUserId})
      ORDER BY dm.created_at ASC
    `;

    // Mark messages as read in background
    await rawSql`
      UPDATE direct_messages SET is_read = true
      WHERE sender_id = ${otherUserId} AND receiver_id = ${currentUserId} AND is_read = false
    `;

    const decryptedMessages = messages.map((msg: any) => {
      let content = msg.content;
      if (msg.is_encrypted && content) {
        try { content = decryptMessageMilitary(content); } catch { content = '🔒 Encrypted'; }
      }

      let replyTo = null;
      if (msg.reply_to_id) {
        let replyContent = msg.reply_content;
        if (replyContent) {
          try { replyContent = decryptMessageMilitary(replyContent); } catch { replyContent = '🔒 Encrypted'; }
        }
        replyTo = {
          id: msg.reply_to_id,
          content: replyContent || 'Original message',
          messageType: msg.reply_type
        };
      }

      return {
        id: msg.id,
        senderId: msg.sender_id,
        receiverId: msg.receiver_id,
        content,
        messageType: msg.message_type,
        mediaUrl: msg.media_url,
        createdAt: msg.created_at,
        isRead: msg.is_read,
        senderName: msg.sender_name,
        senderAvatar: msg.sender_avatar,
        replyTo
      };
    });

    return NextResponse.json({ messages: decryptedMessages });
  } catch (error) {
    console.error('Messages API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
