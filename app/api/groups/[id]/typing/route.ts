import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/verify';
import { pusherServer } from '@/lib/pusher/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const groupId = parseInt(id);
    
    const user = await verifyAuth(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { isTyping } = await request.json();

    await pusherServer.trigger(`chat-${groupId}`, 'typing', {
      userId: user.userId,
      userName: user.name,
      isTyping
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating typing status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
