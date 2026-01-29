import { NextResponse } from 'next/server';
import { RealtimeChatService } from '@/lib/realtime/chat';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { recipientId } = body;

    if (!recipientId) {
      return NextResponse.json({ error: 'Missing recipientId' }, { status: 400 });
    }

    await RealtimeChatService.rejectCall(recipientId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Call reject error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
