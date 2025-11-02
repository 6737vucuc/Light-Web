import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';
import { generateLiveKitToken } from '@/lib/livekit';

const sql = neon(process.env.DATABASE_URL!);
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Generate LiveKit token for joining a call
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    const { callId } = await request.json();

    if (!callId) {
      return NextResponse.json({ error: 'Call ID is required' }, { status: 400 });
    }

    // Get call details
    const callResult = await sql`
      SELECT 
        c.id,
        c.caller_id,
        c.receiver_id,
        c.room_id,
        c.call_type,
        c.status,
        u.name as user_name,
        u.username
      FROM calls c
      JOIN users u ON u.id = ${decoded.userId}
      WHERE c.id = ${callId}
    `;

    if (callResult.length === 0) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }

    const call = callResult[0];

    // Check if user is part of the call
    if (call.caller_id !== decoded.userId && call.receiver_id !== decoded.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Check if call is active
    if (call.status === 'ended' || call.status === 'declined') {
      return NextResponse.json({ error: 'Call is not active' }, { status: 400 });
    }

    // Generate LiveKit token
    const livekitToken = await generateLiveKitToken(
      call.room_id,
      call.user_name || call.username,
      `user_${decoded.userId}`,
      JSON.stringify({
        userId: decoded.userId,
        callId: call.id,
        callType: call.call_type,
      })
    );

    return NextResponse.json({
      success: true,
      token: livekitToken,
      roomId: call.room_id,
      callType: call.call_type,
    });
  } catch (error) {
    console.error('Error generating LiveKit token:', error);
    return NextResponse.json(
      { error: 'Failed to generate token' },
      { status: 500 }
    );
  }
}
