import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { verify } from 'jsonwebtoken';
import { encryptMessageMilitary, decryptMessageMilitary } from '@/lib/security/military-encryption';

const sql = neon(process.env.DATABASE_URL!);

// GET: Fetch all conversations for the current user
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verify(token, process.env.JWT_SECRET!) as any;
    const userId = decoded.userId;

    // Get all conversations (unique users the current user has messaged with)
    const conversations = await sql`
      SELECT DISTINCT
        CASE 
          WHEN dm.sender_id = ${userId} THEN dm.receiver_id
          ELSE dm.sender_id
        END as other_user_id,
        u.name,
        u.username,
        u.avatar,
        u.last_seen,
        u.is_online,
        (
          SELECT content 
          FROM direct_messages 
          WHERE (sender_id = ${userId} AND receiver_id = other_user_id)
             OR (sender_id = other_user_id AND receiver_id = ${userId})
          ORDER BY created_at DESC 
          LIMIT 1
        ) as last_message,
        (
          SELECT created_at 
          FROM direct_messages 
          WHERE (sender_id = ${userId} AND receiver_id = other_user_id)
             OR (sender_id = other_user_id AND receiver_id = ${userId})
          ORDER BY created_at DESC 
          LIMIT 1
        ) as last_message_time,
        (
          SELECT COUNT(*) 
          FROM direct_messages 
          WHERE sender_id = other_user_id 
            AND receiver_id = ${userId} 
            AND is_read = false
        ) as unread_count
      FROM direct_messages dm
      JOIN users u ON u.id = CASE 
        WHEN dm.sender_id = ${userId} THEN dm.receiver_id
        ELSE dm.sender_id
      END
      WHERE dm.sender_id = ${userId} OR dm.receiver_id = ${userId}
      ORDER BY last_message_time DESC
    `;

    // Decrypt last messages
    const decryptedConversations = conversations.map(conv => {
      try {
        if (conv.last_message) {
          return {
            ...conv,
            last_message: decryptMessageMilitary(conv.last_message)
          };
        }
        return conv;
      } catch (error) {
        return {
          ...conv,
          last_message: '[Encrypted]'
        };
      }
    });

    return NextResponse.json({ conversations: decryptedConversations });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Send a new direct message
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verify(token, process.env.JWT_SECRET!) as any;
    const { receiverId, content, messageType, mediaUrl } = await request.json();

    if (!receiverId) {
      return NextResponse.json({ error: 'Receiver ID is required' }, { status: 400 });
    }

    if (!content && !mediaUrl) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    // Check if receiver exists
    const [receiver] = await sql`
      SELECT id FROM users WHERE id = ${receiverId}
    `;

    if (!receiver) {
      return NextResponse.json({ error: 'Receiver not found' }, { status: 404 });
    }

    // Encrypt message content
    const encryptedContent = content ? encryptMessageMilitary(content) : null;

    // Insert encrypted message
    const [newMessage] = await sql`
      INSERT INTO direct_messages (sender_id, receiver_id, content, message_type, media_url, is_encrypted)
      VALUES (${decoded.userId}, ${receiverId}, ${encryptedContent}, ${messageType || 'text'}, ${mediaUrl || null}, ${true})
      RETURNING *
    `;

    // Return decrypted message
    return NextResponse.json({ 
      message: {
        ...newMessage,
        content: content, // Send original content
        is_encrypted: true
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
