import { NextRequest, NextResponse } from 'next/server';
import { RealtimeChatService } from '@/lib/realtime/chat';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { recipientId } = body;

    if (!recipientId) {
      return NextResponse.json({ error: 'Missing recipientId' }, { status: 400 });
    }

    await RealtimeChatService.endCall(recipientId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Call end error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
