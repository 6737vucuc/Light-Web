import { NextRequest, NextResponse } from 'next/server';
import { verify } from 'jsonwebtoken';
import Pusher from 'pusher';

const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.PUSHER_CLUSTER!,
  useTLS: true,
});

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verify(token, process.env.JWT_SECRET!) as any;
    const { type, targetUserId, candidate, offer, answer } = await request.json();

    if (!targetUserId) {
      return NextResponse.json({ error: 'Missing targetUserId' }, { status: 400 });
    }

    // Send signal to target user
    await pusher.trigger(`private-calls-${targetUserId}`, type, {
      senderId: decoded.userId,
      candidate,
      offer,
      answer,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending signal:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
