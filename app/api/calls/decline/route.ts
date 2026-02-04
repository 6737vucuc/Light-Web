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

    const { receiverId } = await request.json();

    if (!receiverId) {
      return NextResponse.json({ error: 'Missing receiverId' }, { status: 400 });
    }

    // Notify caller that call was declined
    await pusher.trigger(`user-${receiverId}`, 'call-rejected', {});

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error declining call:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
