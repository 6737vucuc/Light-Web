import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifyAuth } from '@/lib/auth/verify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST - Mark messages as read
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const groupId = parseInt(id);
    const { messageIds } = await request.json();

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return NextResponse.json({ error: 'No message IDs provided' }, { status: 400 });
    }

    // Insert read receipts for each message
    for (const messageId of messageIds) {
      await sql`
        INSERT INTO group_message_read_receipts (message_id, user_id, read_at)
        VALUES (${messageId}, ${user.id}, NOW())
        ON CONFLICT DO NOTHING
      `;

      // Update read count on message
      await sql`
        UPDATE group_messages 
        SET read_count = (
          SELECT COUNT(*) FROM group_message_read_receipts WHERE message_id = ${messageId}
        )
        WHERE id = ${messageId}
      `;
    }

    return NextResponse.json({ success: true, markedCount: messageIds.length });
  } catch (error: any) {
    console.error('Error marking messages as read:', error);
    return NextResponse.json({ 
      error: 'Failed to mark messages as read',
      details: error.message 
    }, { status: 500 });
  }
}

// GET - Get read receipts for a message
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('messageId');

    if (!messageId) {
      return NextResponse.json({ error: 'Message ID required' }, { status: 400 });
    }

    const readReceipts = await sql`
      SELECT 
        r.user_id,
        r.read_at,
        u.name,
        u.avatar
      FROM group_message_read_receipts r
      JOIN users u ON r.user_id = u.id
      WHERE r.message_id = ${parseInt(messageId)}
      ORDER BY r.read_at DESC
    `;

    return NextResponse.json({ 
      readBy: readReceipts.map((r: any) => ({
        userId: r.user_id,
        name: r.name,
        avatar: r.avatar,
        readAt: r.read_at
      })),
      readCount: readReceipts.length
    });
  } catch (error: any) {
    console.error('Error getting read receipts:', error);
    return NextResponse.json({ 
      error: 'Failed to get read receipts',
      details: error.message 
    }, { status: 500 });
  }
}
