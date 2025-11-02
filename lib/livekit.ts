import { AccessToken } from 'livekit-server-sdk';

// LiveKit configuration
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || '';
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || '';
const LIVEKIT_URL = process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://your-livekit-server.com';

/**
 * Generate LiveKit access token for a user
 */
export async function generateLiveKitToken(
  roomName: string,
  participantName: string,
  participantIdentity: string,
  metadata?: string
): Promise<string> {
  if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
    throw new Error('LiveKit API credentials not configured');
  }

  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: participantIdentity,
    name: participantName,
    metadata: metadata,
  });

  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  return await at.toJwt();
}

/**
 * Generate LiveKit token for broadcasting (live streaming)
 */
export async function generateBroadcastToken(
  roomName: string,
  broadcasterName: string,
  broadcasterIdentity: string
): Promise<string> {
  if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
    throw new Error('LiveKit API credentials not configured');
  }

  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: broadcasterIdentity,
    name: broadcasterName,
    metadata: JSON.stringify({ role: 'broadcaster' }),
  });

  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
    roomAdmin: true, // Allow broadcaster to manage room
  });

  return await at.toJwt();
}

/**
 * Generate LiveKit token for viewing (live streaming viewer)
 */
export async function generateViewerToken(
  roomName: string,
  viewerName: string,
  viewerIdentity: string
): Promise<string> {
  if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
    throw new Error('LiveKit API credentials not configured');
  }

  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity: viewerIdentity,
    name: viewerName,
    metadata: JSON.stringify({ role: 'viewer' }),
  });

  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: false, // Viewers cannot publish
    canSubscribe: true,
    canPublishData: true, // Allow sending messages/reactions
  });

  return await at.toJwt();
}

export { LIVEKIT_URL };
