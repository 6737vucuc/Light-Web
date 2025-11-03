import { NextRequest, NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';
import { requireAuth } from '@/lib/auth/middleware';

// Do not cache endpoint result
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);

  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  const { searchParams } = new URL(req.url);
  const room = searchParams.get('room');
  const isPublisher = searchParams.get('publisher') === 'true';

  if (!room) {
    return NextResponse.json({ error: 'Missing "room" query parameter' }, { status: 400 });
  }

  // Use the authenticated user's ID and name
  const identity = authResult.user.id.toString();
  const name = authResult.user.name;

  // Environment variables for LiveKit
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    return NextResponse.json({ error: 'LiveKit server misconfigured: Missing API Key or Secret' }, { status: 500 });
  }

  // Create a new AccessToken
  const at = new AccessToken(apiKey, apiSecret, {
    identity: identity,
    name: name,
    ttl: '10m', // Token expires in 10 minutes
  });

  // Grant permissions for the room
  at.addGrant({
    room: room,
    roomJoin: true,
    canPublish: isPublisher, // Only the caller should be able to publish initially
    canSubscribe: true,
    canPublishData: true,
  });

  try {
    const token = await at.toJwt();
    return NextResponse.json(
      { token: token, identity: identity, name: name },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error('LiveKit token generation error:', error);
    return NextResponse.json({ error: 'Failed to generate LiveKit token' }, { status: 500 });
  }
}
