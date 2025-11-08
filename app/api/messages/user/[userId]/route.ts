import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';
import { decryptMessageMilitary } from '@/lib/security/military-encryption';

const sql = neon(process.env.DATABASE_URL!);
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// GET /api/messages/[userId] - Fetch messages with a specific user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    const resolvedParams = await params;
    const otherUserId = parseInt(resolvedParams.userId);

    if (isNaN(otherUserId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    // Fetch all messages between current user and the other user
    const messages = await sql`
      SELECT 
        id,
        sender_id,
        receiver_id,
        content,
        encrypted_content,
        is_encrypted,
        media_url,
        message_type,
        is_read,
        read_at,
        is_delivered,
        delivered_at,
        created_at
      FROM messages
      WHERE (sender_id = ${decoded.userId} AND receiver_id = ${otherUserId})
         OR (sender_id = ${otherUserId} AND receiver_id = ${decoded.userId})
      ORDER BY created_at ASC
    `;

    // Decrypt messages and format response
    const formattedMessages = messages.map((msg: any) => {
      // Decrypt the content if it's encrypted
      let decryptedContent = msg.content;
      if (msg.encrypted_content && msg.is_encrypted) {
        try {
          decryptedContent = decryptMessageMilitary(msg.encrypted_content);
        } catch (error) {
          console.error('Failed to decrypt message:', error);
          // Fallback to content if decryption fails
          decryptedContent = msg.content;
        }
      }

      return {
        id: msg.id,
        senderId: msg.sender_id,
        receiverId: msg.receiver_id,
        content: decryptedContent,
        mediaUrl: msg.media_url,
        messageType: msg.message_type,
        isRead: msg.is_read,
        readAt: msg.read_at,
        isDelivered: msg.is_delivered || false,
        deliveredAt: msg.delivered_at,
        createdAt: msg.created_at,
      };
    });

    return NextResponse.json({
      success: true,
      messages: formattedMessages,
    });
  } catch (error: any) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch messages',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}
