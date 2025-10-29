import Pusher from 'pusher';
import PusherClient from 'pusher-js';

// Server-side Pusher instance
let pusherServer: Pusher | null = null;

export function getPusherServer() {
  if (!pusherServer) {
    pusherServer = new Pusher({
      appId: process.env.PUSHER_APP_ID!,
      key: process.env.NEXT_PUBLIC_PUSHER_APP_KEY!,
      secret: process.env.PUSHER_SECRET!,
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      useTLS: true
    });
  }
  return pusherServer;
}

// Client-side Pusher instance
export function getPusherClient() {
  return new PusherClient(process.env.NEXT_PUBLIC_PUSHER_APP_KEY!, {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  });
}

// WebRTC Signaling Events
export const WEBRTC_EVENTS = {
  CALL_REQUEST: 'call-request',
  CALL_ACCEPTED: 'call-accepted',
  CALL_REJECTED: 'call-rejected',
  OFFER: 'webrtc-offer',
  ANSWER: 'webrtc-answer',
  ICE_CANDIDATE: 'ice-candidate',
  CALL_ENDED: 'call-ended',
} as const;

// Helper function to get user's private channel
export function getUserChannel(userId: number) {
  return `private-user-${userId}`;
}

// Helper function to get call channel between two users
export function getCallChannel(userId1: number, userId2: number) {
  const sortedIds = [userId1, userId2].sort((a, b) => a - b);
  return `private-call-${sortedIds[0]}-${sortedIds[1]}`;
}

// Server-side: Send WebRTC signal
export async function sendWebRTCSignal(
  targetUserId: number,
  event: string,
  data: any
) {
  const pusher = getPusherServer();
  const channel = getUserChannel(targetUserId);
  
  try {
    await pusher.trigger(channel, event, data);
    return { success: true };
  } catch (error) {
    console.error('Error sending WebRTC signal:', error);
    return { success: false, error };
  }
}

// Server-side: Send signal to call channel
export async function sendToCallChannel(
  userId1: number,
  userId2: number,
  event: string,
  data: any
) {
  const pusher = getPusherServer();
  const channel = getCallChannel(userId1, userId2);
  
  try {
    await pusher.trigger(channel, event, data);
    return { success: true };
  } catch (error) {
    console.error('Error sending to call channel:', error);
    return { success: false, error };
  }
}
