import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/verify';
import { RealtimeChatService } from '@/lib/realtime/chat';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { callerId } = await request.json();

    await RealtimeChatService.rejectCall(callerId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error rejecting call:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
