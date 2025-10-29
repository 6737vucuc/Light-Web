import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { sendWebRTCSignal, sendToCallChannel, WEBRTC_EVENTS } from '@/lib/webrtc/pusher-signaling';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// Initiate a call
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
    const { action, targetUserId, signal } = body;

    if (!targetUserId) {
      return NextResponse.json(
        { error: 'Target user ID is required' },
        { status: 400 }
      );
    }

    const callerId = authResult.user.id;
    const callerName = authResult.user.name;

    switch (action) {
      case 'start': {
        // Send call request to target user
        await sendWebRTCSignal(targetUserId, WEBRTC_EVENTS.CALL_REQUEST, {
          callerId,
          callerName,
          timestamp: Date.now()
        });

        return NextResponse.json({ 
          success: true,
          message: 'Call request sent'
        });
      }

      case 'accept': {
        // Notify caller that call was accepted
        await sendWebRTCSignal(targetUserId, WEBRTC_EVENTS.CALL_ACCEPTED, {
          userId: callerId,
          timestamp: Date.now()
        });

        return NextResponse.json({ 
          success: true,
          message: 'Call accepted'
        });
      }

      case 'reject': {
        // Notify caller that call was rejected
        await sendWebRTCSignal(targetUserId, WEBRTC_EVENTS.CALL_REJECTED, {
          userId: callerId,
          timestamp: Date.now()
        });

        return NextResponse.json({ 
          success: true,
          message: 'Call rejected'
        });
      }

      case 'offer': {
        if (!signal) {
          return NextResponse.json(
            { error: 'Signal is required for offer' },
            { status: 400 }
          );
        }

        // Send WebRTC offer
        await sendToCallChannel(callerId, targetUserId, WEBRTC_EVENTS.OFFER, {
          from: callerId,
          signal,
          timestamp: Date.now()
        });

        return NextResponse.json({ 
          success: true,
          message: 'Offer sent'
        });
      }

      case 'answer': {
        if (!signal) {
          return NextResponse.json(
            { error: 'Signal is required for answer' },
            { status: 400 }
          );
        }

        // Send WebRTC answer
        await sendToCallChannel(callerId, targetUserId, WEBRTC_EVENTS.ANSWER, {
          from: callerId,
          signal,
          timestamp: Date.now()
        });

        return NextResponse.json({ 
          success: true,
          message: 'Answer sent'
        });
      }

      case 'ice-candidate': {
        if (!signal) {
          return NextResponse.json(
            { error: 'ICE candidate is required' },
            { status: 400 }
          );
        }

        // Send ICE candidate
        await sendToCallChannel(callerId, targetUserId, WEBRTC_EVENTS.ICE_CANDIDATE, {
          from: callerId,
          candidate: signal,
          timestamp: Date.now()
        });

        return NextResponse.json({ 
          success: true,
          message: 'ICE candidate sent'
        });
      }

      case 'end': {
        // Notify other user that call ended
        await sendWebRTCSignal(targetUserId, WEBRTC_EVENTS.CALL_ENDED, {
          userId: callerId,
          timestamp: Date.now()
        });

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
    console.error('WebRTC call error:', error);
    return NextResponse.json(
      { error: 'Failed to process call action' },
      { status: 500 }
    );
  }
}
