import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import { verify } from 'jsonwebtoken';
import Pusher from 'pusher';

const sql = neon(process.env.DATABASE_URL!);

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
});

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  try {
    const { id, messageId: msgId } = await params;
    const token = request.cookies.get('token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verify(token, process.env.JWT_SECRET!) as any;
    const groupId = parseInt(id);
    const messageId = parseInt(msgId);

    // Get message details
    const [message] = await sql`
      SELECT user_id, created_at FROM group_messages 
      WHERE id = ${messageId} AND group_id = ${groupId}
    `;

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    // Check if message belongs to user
    if (message.user_id !== decoded.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if message is within 1 hour (3600000 milliseconds)
    const messageTime = new Date(message.created_at).getTime();
    const currentTime = new Date().getTime();
    const timeDifference = currentTime - messageTime;
    const oneHourInMs = 60 * 60 * 1000;

    if (timeDifference > oneHourInMs) {
      return NextResponse.json({ 
        error: 'لا يمكن حذف الرسالة بعد مرور ساعة',
        canDelete: false 
      }, { status: 400 });
    }

    // Delete message (from both sides)
    await sql`
      DELETE FROM group_messages 
      WHERE id = ${messageId}
    `;

    // Update messages count
    await sql`
      UPDATE community_groups 
      SET messages_count = GREATEST(messages_count - 1, 0)
      WHERE id = ${groupId}
    `;

    // Broadcast deletion to Pusher (for all users)
    await pusher.trigger(`group-${groupId}`, 'delete-message', {
      messageId: messageId,
      deletedBy: decoded.userId,
    });

    return NextResponse.json({ 
      message: 'تم حذف الرسالة من الطرفين',
      deletedFromBothSides: true 
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
