// LiveKit Configuration for Voice Calls on Vercel
// This provides a production-ready WebRTC solution that works seamlessly on serverless platforms

export const LIVEKIT_CONFIG = {
  // Use LiveKit Cloud or self-hosted instance
  // For production, set these in environment variables
  url: process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://your-livekit-instance.livekit.cloud',
  apiKey: process.env.LIVEKIT_API_KEY || '',
  apiSecret: process.env.LIVEKIT_API_SECRET || '',
};

// Room configuration for voice calls
export const VOICE_CALL_CONFIG = {
  audio: true,
  video: false,
  audioBitrate: 20000, // 20kbps for voice
  dtx: true, // Discontinuous transmission for bandwidth efficiency
};

// Helper to generate room name for two users
export function getCallRoomName(userId1: number, userId2: number): string {
  const sortedIds = [userId1, userId2].sort((a, b) => a - b);
  return `voice-call-${sortedIds[0]}-${sortedIds[1]}`;
}

// Helper to generate participant identity
export function getParticipantIdentity(userId: number, userName: string): string {
  return `user-${userId}-${userName.replace(/\s+/g, '-')}`;
}
