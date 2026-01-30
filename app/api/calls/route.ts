import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifyAuth } from '@/lib/auth/verify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST - Initiate a call
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { receiverId, callerPeerId, callType = 'audio' } = await request.json();

    if (!receiverId || !callerPeerId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if receiver exists
    const receiver = await sql`
      SELECT id, name, avatar FROM users WHERE id = ${receiverId}
    `;

    if (receiver.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Create call record
    const [call] = await sql`
      INSERT INTO calls (caller_id, receiver_id, caller_peer_id, call_type, status)
      VALUES (${user.userId}, ${receiverId}, ${callerPeerId}, ${callType}, 'ringing')
      RETURNING *
    `;

    return NextResponse.json({ 
      success: true,
      call,
      receiver: receiver[0]
    });
  } catch (error: any) {
    console.error('Error initiating call:', error);
    return NextResponse.json({ error: 'Failed to initiate call', details: error.message }, { status: 500 });
  }
}

// GET - Get call history
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');

    const calls = await sql`
      SELECT 
        c.*,
        caller.name as caller_name,
        caller.avatar as caller_avatar,
        receiver.name as receiver_name,
        receiver.avatar as receiver_avatar
      FROM calls c
      JOIN users caller ON c.caller_id = caller.id
      JOIN users receiver ON c.receiver_id = receiver.id
      WHERE c.caller_id = ${user.userId} OR c.receiver_id = ${user.userId}
      ORDER BY c.created_at DESC
      LIMIT ${limit}
    `;

    return NextResponse.json({ calls });
  } catch (error: any) {
    console.error('Error fetching calls:', error);
    return NextResponse.json({ error: 'Failed to fetch calls', details: error.message }, { status: 500 });
  }
}
