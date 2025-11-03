import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';
import Pusher from 'pusher';

const sql = neon(process.env.DATABASE_URL!);
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Initialize Pusher for real-time call updates
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_APP_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  useTLS: true,
});

// Update call status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ callId: string }> }
) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    const { callId: callIdStr } = await params;
    const callId = parseInt(callIdStr);
    const { status } = await request.json();

    if (isNaN(callId)) {
      return NextResponse.json({ error: 'Invalid call ID' }, { status: 400 });
    }

    if (!status || !['ongoing', 'ended', 'missed', 'declined'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Get call info
    const callResult = await sql`
      SELECT id, caller_id, receiver_id, started_at, room_id
      FROM calls
      WHERE id = ${callId}
    `;

    if (callResult.length === 0) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }

    const call = callResult[0];

    // Check if user is part of the call
    if (call.caller_id !== decoded.userId && call.receiver_id !== decoded.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Update call status
    let updateQuery;
    if (status === 'ended') {
      // Calculate duration
      const duration = Math.floor(
        (Date.now() - new Date(call.started_at).getTime()) / 1000
      );

      updateQuery = await sql`
        UPDATE calls
        SET status = ${status}, ended_at = NOW(), duration = ${duration}
        WHERE id = ${callId}
        RETURNING id, status, ended_at, duration
      `;
    } else {
      updateQuery = await sql`
        UPDATE calls
        SET status = ${status}
        WHERE id = ${callId}
        RETURNING id, status
      `;
    }

    // Send real-time notification via Pusher to both participants
    try {
      const otherUserId = call.caller_id === decoded.userId ? call.receiver_id : call.caller_id;
      
      // Notify the other participant about status change
      await pusher.trigger(`private-user-${otherUserId}`, 'call-status-changed', {
        callId: callId,
        status: status,
        roomId: call.room_id,
        updatedBy: decoded.userId,
        endedAt: updateQuery[0].ended_at || null,
        duration: updateQuery[0].duration || null,
      });

      // Also notify the current user
      await pusher.trigger(`private-user-${decoded.userId}`, 'call-status-changed', {
        callId: callId,
        status: status,
        roomId: call.room_id,
        updatedBy: decoded.userId,
        endedAt: updateQuery[0].ended_at || null,
        duration: updateQuery[0].duration || null,
      });

      console.log(`Call ${callId} status updated to ${status} and notified both participants`);
    } catch (pusherError) {
      console.error('Failed to send Pusher notification for call status update:', pusherError);
    }

    return NextResponse.json({
      success: true,
      call: updateQuery[0],
    });
  } catch (error) {
    console.error('Error updating call status:', error);
    return NextResponse.json(
      { error: 'Failed to update call status' },
      { status: 500 }
    );
  }
}

// Get call details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ callId: string }> }
) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    const { callId: callIdStr } = await params;
    const callId = parseInt(callIdStr);

    if (isNaN(callId)) {
      return NextResponse.json({ error: 'Invalid call ID' }, { status: 400 });
    }

    // Get call details
    const result = await sql`
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
        u1.name as caller_name,
        u1.username as caller_username,
        u1.avatar as caller_avatar,
        u2.name as receiver_name,
        u2.username as receiver_username,
        u2.avatar as receiver_avatar
      FROM calls c
      JOIN users u1 ON c.caller_id = u1.id
      JOIN users u2 ON c.receiver_id = u2.id
      WHERE c.id = ${callId}
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }

    const call = result[0];

    // Check if user is part of the call
    if (call.caller_id !== decoded.userId && call.receiver_id !== decoded.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      call: {
        id: call.id,
        callerId: call.caller_id,
        receiverId: call.receiver_id,
        callType: call.call_type,
        roomId: call.room_id,
        status: call.status,
        startedAt: call.started_at,
        endedAt: call.ended_at,
        duration: call.duration,
        caller: {
          name: call.caller_name,
          username: call.caller_username,
          avatar: call.caller_avatar,
        },
        receiver: {
          name: call.receiver_name,
          username: call.receiver_username,
          avatar: call.receiver_avatar,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching call details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch call details' },
      { status: 500 }
    );
  }
}
