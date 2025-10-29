import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// In-memory store for call notifications (in production, use Redis or database)
const callNotifications = new Map<number, {
  callerId: number;
  callerName: string;
  timestamp: number;
}>();

// Clean up old notifications (older than 30 seconds)
setInterval(() => {
  const now = Date.now();
  for (const [userId, notification] of callNotifications.entries()) {
    if (now - notification.timestamp > 30000) {
      callNotifications.delete(userId);
    }
  }
}, 10000);

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
    const { action, targetUserId } = body;

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
        // Store call notification for target user
        callNotifications.set(targetUserId, {
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
        // Remove notification when call is accepted
        callNotifications.delete(callerId);

        return NextResponse.json({ 
          success: true,
          message: 'Call accepted'
        });
      }

      case 'reject': {
        // Remove notification when call is rejected
        callNotifications.delete(callerId);

        return NextResponse.json({ 
          success: true,
          message: 'Call rejected'
        });
      }

      case 'end': {
        // Clean up any notifications
        callNotifications.delete(targetUserId);
        callNotifications.delete(callerId);

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

// GET endpoint to check for incoming calls
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  const userId = authResult.user.id;
  const incomingCall = callNotifications.get(userId);

  return NextResponse.json({
    incomingCall: incomingCall || null
  });
}
