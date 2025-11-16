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
  { params }: { params: { id: string; messageId: string } }
) {
  try {
    const token = request.cookies.get('token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verify(token, process.env.JWT_SECRET!) as any;
    const groupId = parseInt(params.id);
    const messageId = parseInt(params.messageId);

    // Check if message belongs to user
    const [message] = await sql`
      SELECT user_id FROM group_messages 
      WHERE id = ${messageId} AND group_id = ${groupId}
    `;

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    if (message.user_id !== decoded.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete message
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

    // Broadcast deletion to Pusher
    await pusher.trigger(`group-${groupId}`, 'delete-message', {
      messageId: messageId,
    });

    return NextResponse.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Error deleting message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
