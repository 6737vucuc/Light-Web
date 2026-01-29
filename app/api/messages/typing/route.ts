import { NextResponse } from 'next/server';
import { RealtimeChatService } from '@/lib/realtime/chat';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    // Basic auth check if needed, though typing is lightweight
    const body = await req.json();
    const { recipientId, isTyping } = body;
    
    // Get current user from cookies/auth if possible to get sender ID
    // For now we'll assume the client sends its own ID or we extract it
    const authResponse = await fetch(`${new URL(req.url).origin}/api/auth/me`, {
      headers: { Cookie: cookies().toString() }
    });
    
    if (!authResponse.ok) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { user } = await authResponse.json();
    const senderId = user.id;

    const channelId = `conversation-${Math.min(senderId, recipientId)}-${Math.max(senderId, recipientId)}`;
    
    await RealtimeChatService.sendTypingIndicator(channelId, {
      userId: senderId,
      userName: user.name,
      isTyping: isTyping
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Typing indicator error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
