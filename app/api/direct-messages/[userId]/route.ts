import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { verify } from 'jsonwebtoken';
import { encryptMessageMilitary, decryptMessageMilitary } from '@/lib/security/military-encryption';

const sql = neon(process.env.DATABASE_URL!);

// GET: Fetch messages between current user and specific user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: otherUserId } = await params;
    const token = request.cookies.get('token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verify(token, process.env.JWT_SECRET!) as any;
    const currentUserId = decoded.userId;

    // Get messages between the two users
    const messages = await sql`
      SELECT 
        dm.*,
        sender.name as sender_name,
        sender.username as sender_username,
        sender.avatar as sender_avatar,
        receiver.name as receiver_name,
        receiver.username as receiver_username,
        receiver.avatar as receiver_avatar
      FROM direct_messages dm
      JOIN users sender ON dm.sender_id = sender.id
      JOIN users receiver ON dm.receiver_id = receiver.id
      WHERE (dm.sender_id = ${currentUserId} AND dm.receiver_id = ${otherUserId})
         OR (dm.sender_id = ${otherUserId} AND dm.receiver_id = ${currentUserId})
      ORDER BY dm.created_at ASC
    `;

    // Mark messages as read
    await sql`
      UPDATE direct_messages
      SET is_read = true
      WHERE sender_id = ${otherUserId} AND receiver_id = ${currentUserId} AND is_read = false
    `;

    // Decrypt messages
    const decryptedMessages = messages.map(msg => {
      try {
        if (msg.is_encrypted && msg.content) {
          return {
            ...msg,
            content: decryptMessageMilitary(msg.content),
            is_encrypted: true
          };
        }
        return msg;
      } catch (error) {
        console.error('Error decrypting message:', error);
        return {
          ...msg,
          content: '[Encrypted message - decryption failed]',
          is_encrypted: true
        };
      }
    });

    return NextResponse.json({ messages: decryptedMessages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
