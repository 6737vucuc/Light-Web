import { NextResponse } from 'next/server';
import { RealtimeChatService } from '@/lib/realtime/chat';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { recipientId, callerPeerId, callerName, callerAvatar } = body;

    if (!recipientId || !callerPeerId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await RealtimeChatService.initiateCall(recipientId, {
      callerPeerId,
      callerName,
      callerAvatar
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Call initiate error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
