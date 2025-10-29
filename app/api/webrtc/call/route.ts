import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { AccessToken } from 'livekit-server-sdk';
import { getCallRoomName } from '@/lib/webrtc/livekit-config';
import Pusher from 'pusher';

// Initialize Pusher
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_APP_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
});

// In-memory store for active calls
const activeCalls = new Map<string, {
  callerId: number;
  callerName: string;
  receiverId: number;
  receiverName: string;
  roomName: string;
  timestamp: number;
}>();

// Clean up old calls (older than 2 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, call] of activeCalls.entries()) {
    if (now - call.timestamp > 120000) {
      activeCalls.delete(key);
    }
  }
}, 30000);

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const body = await request.json();
    const { action, targetUserId, targetUserName, callerId } = body;

    const userId = authResult.user.id;
    const userName = authResult.user.name;

    switch (action) {
      case 'start': {
        if (!targetUserId || !targetUserName) {
          return NextResponse.json(
            { error: 'Target user ID and name are required' },
            { status: 400 }
          );
        }

        console.log('[Call API] Starting call from', userId, 'to', targetUserId);

        // Create room name
        const roomName = getCallRoomName(userId, targetUserId);

        // Store call info
        const callKey = `${userId}-${targetUserId}`;
        activeCalls.set(callKey, {
          callerId: userId,
          callerName: userName,
          receiverId: targetUserId,
          receiverName: targetUserName,
          roomName,
          timestamp: Date.now()
        });

        // Generate LiveKit token for caller
        const token = new AccessToken(
          process.env.LIVEKIT_API_KEY!,
          process.env.LIVEKIT_API_SECRET!,
          {
            identity: `user-${userId}`,
            name: userName,
            ttl: '10m'
          }
        );

        token.addGrant({
          room: roomName,
          roomJoin: true,
          canPublish: true,
          canSubscribe: true
        });

        const jwt = await token.toJwt();

        // Send Pusher notification to target user
        try {
          await pusher.trigger(`private-user-${targetUserId}`, 'incoming-call', {
            callerId: userId,
            callerName: userName,
            roomName
          });
          console.log('[Call API] Pusher notification sent to user', targetUserId);
        } catch (pusherError) {
          console.error('[Call API] Pusher error:', pusherError);
        }

        return NextResponse.json({ 
          success: true,
          roomName,
          token: jwt,
          message: 'Call started'
        });
      }

      case 'accept': {
        if (!callerId) {
          return NextResponse.json(
            { error: 'Caller ID is required' },
            { status: 400 }
          );
        }

        console.log('[Call API] User', userId, 'accepting call from', callerId);

        // Find the call
        const callKey = `${callerId}-${userId}`;
        const call = activeCalls.get(callKey);

        if (!call) {
          return NextResponse.json(
            { error: 'Call not found' },
            { status: 404 }
          );
        }

        // Generate LiveKit token for receiver
        const token = new AccessToken(
          process.env.LIVEKIT_API_KEY!,
          process.env.LIVEKIT_API_SECRET!,
          {
            identity: `user-${userId}`,
            name: userName,
            ttl: '10m'
          }
        );

        token.addGrant({
          room: call.roomName,
          roomJoin: true,
          canPublish: true,
          canSubscribe: true
        });

        const jwt = await token.toJwt();

        // Notify caller that call was accepted via Pusher
        try {
          await pusher.trigger(`private-user-${callerId}`, 'call-accepted', {
            userId,
            userName
          });
          console.log('[Call API] Call accepted notification sent to caller', callerId);
        } catch (pusherError) {
          console.error('[Call API] Pusher error:', pusherError);
        }

        return NextResponse.json({ 
          success: true,
          roomName: call.roomName,
          token: jwt,
          message: 'Call accepted'
        });
      }

      case 'reject': {
        if (!callerId) {
          return NextResponse.json(
            { error: 'Caller ID is required' },
            { status: 400 }
          );
        }

        console.log('[Call API] User', userId, 'rejecting call from', callerId);

        // Remove call
        const callKey = `${callerId}-${userId}`;
        activeCalls.delete(callKey);

        // Notify caller that call was rejected via Pusher
        try {
          await pusher.trigger(`private-user-${callerId}`, 'call-rejected', {
            userId,
            userName
          });
          console.log('[Call API] Call rejected notification sent to caller', callerId);
        } catch (pusherError) {
          console.error('[Call API] Pusher error:', pusherError);
        }

        return NextResponse.json({ 
          success: true,
          message: 'Call rejected'
        });
      }

      case 'end': {
        if (!targetUserId) {
          return NextResponse.json(
            { error: 'Target user ID is required' },
            { status: 400 }
          );
        }

        console.log('[Call API] Ending call between', userId, 'and', targetUserId);

        // Remove call from both directions
        activeCalls.delete(`${userId}-${targetUserId}`);
        activeCalls.delete(`${targetUserId}-${userId}`);

        // Notify other user that call ended via Pusher
        try {
          await pusher.trigger(`private-user-${targetUserId}`, 'call-ended', {
            userId,
            userName
          });
          console.log('[Call API] Call ended notification sent to user', targetUserId);
        } catch (pusherError) {
          console.error('[Call API] Pusher error:', pusherError);
        }

        return NextResponse.json({ 
          success: true,
          message: 'Call ended'
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('[Call API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process call action' },
      { status: 500 }
    );
  }
}
