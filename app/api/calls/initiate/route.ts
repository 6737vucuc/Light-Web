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
    const { receiverId, callerPeerId, offer, callerName, callerAvatar } = await request.json();

    if (!receiverId || !offer) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Send call notification to receiver
    await pusher.trigger(`user-${receiverId}`, 'incoming-call', {
      callerId: decoded.userId,
      callerPeerId,
      callerName,
      callerAvatar,
      offer,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error initiating call:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
