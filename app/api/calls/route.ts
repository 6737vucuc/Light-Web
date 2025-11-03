import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';
import Pusher from 'pusher';

const sql = neon(process.env.DATABASE_URL!);
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Initialize Pusher for real-time call notifications
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_APP_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
});

// Initiate a call (video or voice)
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    const { receiverId, callType } = await request.json();

    if (!receiverId || !callType) {
      return NextResponse.json(
        { error: 'Receiver ID and call type are required' },
        { status: 400 }
      );
    }

    if (!['video', 'voice'].includes(callType)) {
      return NextResponse.json(
        { error: 'Invalid call type' },
        { status: 400 }
      );
    }

    // Check if receiver exists
    const receiverResult = await sql`
      SELECT id, name, username, avatar FROM users WHERE id = ${receiverId}
    `;

    if (receiverResult.length === 0) {
      return NextResponse.json({ error: 'Receiver not found' }, { status: 404 });
    }

    // Get caller info
    const callerResult = await sql`
      SELECT id, name, username, avatar FROM users WHERE id = ${decoded.userId}
    `;

    if (callerResult.length === 0) {
      return NextResponse.json({ error: 'Caller not found' }, { status: 404 });
    }

    const caller = callerResult[0];
    const receiver = receiverResult[0];

    // Check if blocked
    const blockCheck = await sql`
      SELECT id FROM blocked_users
      WHERE (user_id = ${receiverId} AND blocked_user_id = ${decoded.userId})
         OR (user_id = ${decoded.userId} AND blocked_user_id = ${receiverId})
    `;

    if (blockCheck.length > 0) {
      return NextResponse.json({ error: 'Cannot initiate call' }, { status: 403 });
    }

    // Generate room_id first
    const tempRoomId = `call_temp_${Date.now()}_${decoded.userId}`;

    // Create call record with room_id
    const result = await sql`
      INSERT INTO calls (
        caller_id,
        receiver_id,
        call_type,
        room_id,
        status,
        started_at
      )
      VALUES (
        ${decoded.userId},
        ${receiverId},
        ${callType},
        ${tempRoomId},
        'ringing',
        NOW()
      )
      RETURNING id, caller_id, receiver_id, call_type, room_id, status, started_at
    `;

    if (result.length === 0) {
      console.error('Database INSERT failed to return call ID');
      return NextResponse.json({ error: 'Failed to create call record' }, { status: 500 });
    }

    // Update the room_id with the actual call ID
    const finalCallId = result[0].id;
    const finalRoomId = `call_${finalCallId}`;
    
    await sql`
      UPDATE calls
      SET room_id = ${finalRoomId}
      WHERE id = ${finalCallId}
    `;

    console.log(`Call created successfully: ID=${finalCallId}, Room=${finalRoomId}`);

    // Create notification for receiver
    try {
      await sql`
        INSERT INTO notifications (
          user_id,
          type,
          content,
          related_user_id,
          related_id,
          created_at
        )
        VALUES (
          ${receiverId},
          'call',
          ${callType === 'video' ? 'Video call' : 'Voice call'},
          ${decoded.userId},
          ${finalCallId},
          NOW()
        )
      `;
    } catch (notifError) {
      console.error('Failed to create call notification:', notifError);
    }

    // Send real-time notification via Pusher to receiver
    try {
      await pusher.trigger(`private-user-${receiverId}`, 'incoming-call', {
        callId: finalCallId,
        callType: callType,
        roomId: finalRoomId,
        caller: {
          id: caller.id,
          name: caller.name,
          username: caller.username,
          avatar: caller.avatar,
        },
        status: 'ringing',
        startedAt: result[0].started_at,
      });
      console.log(`Pusher notification sent to user ${receiverId} for call ${finalCallId}`);
    } catch (pusherError) {
      console.error('Failed to send Pusher notification:', pusherError);
      // Don't fail the call if Pusher fails
    }

    return NextResponse.json({
      success: true,
      call: {
        id: finalCallId,
        callerId: result[0].caller_id,
        receiverId: result[0].receiver_id,
        callType: result[0].call_type,
        roomId: finalRoomId,
        status: result[0].status,
        startedAt: result[0].started_at,
      },
    });
  } catch (error: any) {
    console.error('Error initiating call:', error);
    return NextResponse.json(
      { 
        error: 'Failed to initiate call',
        details: error.message || 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// Get active calls
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };

    // Get active calls for user
    const calls = await sql`
      SELECT 
        c.id,
        c.caller_id,
        c.receiver_id,
        c.call_type,
        c.room_id,
        c.status,
        c.started_at,
        c.ended_at,
        c.duration,
        u.name as caller_name,
        u.username as caller_username,
        u.avatar as caller_avatar
      FROM calls c
      JOIN users u ON c.caller_id = u.id
      WHERE (c.caller_id = ${decoded.userId} OR c.receiver_id = ${decoded.userId})
        AND c.status IN ('ringing', 'ongoing')
      ORDER BY c.started_at DESC
    `;

    return NextResponse.json({
      success: true,
      calls: calls.map((c) => ({
        id: c.id,
        callerId: c.caller_id,
        receiverId: c.receiver_id,
        callType: c.call_type,
        roomId: c.room_id,
        status: c.status,
        startedAt: c.started_at,
        endedAt: c.ended_at,
        duration: c.duration,
        callerName: c.caller_name,
        callerUsername: c.caller_username,
        callerAvatar: c.caller_avatar,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching calls:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch calls',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}
