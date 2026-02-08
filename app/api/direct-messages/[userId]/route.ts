import { NextRequest, NextResponse } from 'next/server';
import { sql as rawSql } from '@/lib/db';
import { verifyAuth } from '@/lib/auth/verify';
import { encryptMessageMilitary, decryptMessageMilitary } from '@/lib/security/military-encryption';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET: Fetch messages between current user and specific user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: otherUserId } = await params;
    
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUserId = user.userId;

    // Get messages between the two users
    const messages = await rawSql`
      SELECT 
  dm.*,
  sender.name as sender_name,
  sender.avatar as sender_avatar,
  receiver.name as receiver_name,
  receiver.avatar as receiver_avatar
FROM direct_messages dm
JOIN users sender ON dm.sender_id = sender.id
JOIN users receiver ON dm.receiver_id = receiver.id
WHERE (dm.sender_id = ${currentUserId} AND dm.receiver_id = ${otherUserId})
   OR (dm.sender_id = ${otherUserId} AND dm.receiver_id = ${currentUserId})
ORDER BY dm.created_at ASC
`;

    // Mark messages as read
    await rawSql`
      UPDATE direct_messages
      SET is_read = true
      WHERE sender_id = ${otherUserId} AND receiver_id = ${currentUserId} AND is_read = false
    `;

    // Decrypt messages and ensure snake_case for frontend compatibility
    const decryptedMessages = messages.map((msg: any) => {
      let content = msg.content;
      try {
        if (msg.is_encrypted && msg.content) {
          content = decryptMessageMilitary(msg.content);
        }
      } catch (error) {
        console.error('Error decrypting message:', error);
        content = '[Encrypted message - decryption failed]';
      }

      return {
        id: msg.id,
        sender_id: msg.sender_id,
        receiver_id: msg.receiver_id,
        content: content,
        message_type: msg.message_type,
        media_url: msg.media_url,
        is_encrypted: msg.is_encrypted,
        is_read: msg.is_read,
        created_at: msg.created_at,
        sender_name: msg.sender_name,
        sender_avatar: msg.sender_avatar,
        receiver_name: msg.receiver_name,
        receiver_avatar: msg.receiver_avatar
      };
    });

    return NextResponse.json({ messages: decryptedMessages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
