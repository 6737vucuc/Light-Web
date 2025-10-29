import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import Pusher from 'pusher';

// Initialize Pusher
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_APP_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
});

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  
  if ('error' in authResult) {
    console.error('[Pusher Auth] Authentication failed:', authResult.error);
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  console.log('[Pusher Auth] User authenticated:', authResult.user.id);

  try {
    const body = await request.text();
    const params = new URLSearchParams(body);
    const socketId = params.get('socket_id');
    const channelName = params.get('channel_name');

    if (!socketId || !channelName) {
      console.error('[Pusher Auth] Missing parameters');
      return NextResponse.json(
        { error: 'Missing socket_id or channel_name' },
        { status: 400 }
      );
    }

    console.log('[Pusher Auth] Request:', { socketId, channelName, userId: authResult.user.id });

    // Verify user has access to this channel
    const userId = authResult.user.id;
    const expectedChannel = `private-user-${userId}`;

    if (channelName !== expectedChannel) {
      console.error('[Pusher Auth] Unauthorized channel access:', { channelName, userId, expectedChannel });
      return NextResponse.json(
        { error: 'Unauthorized channel access' },
        { status: 403 }
      );
    }

    console.log('[Pusher Auth] Channel authorized:', channelName);

    const authResponse = pusher.authorizeChannel(socketId, channelName);
    
    return NextResponse.json(authResponse);
  } catch (error) {
    console.error('[Pusher Auth] Error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}
