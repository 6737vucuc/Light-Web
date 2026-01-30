import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { verifyAuth } from '@/lib/auth/verify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// PATCH - Update call status (accept, reject, end)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ callId: string }> }
) {
  try {
    const { callId } = await params;
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { status, receiverPeerId } = await request.json();

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    const validStatuses = ['connected', 'rejected', 'ended', 'missed'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Get call details
    const [call] = await sql`
      SELECT * FROM calls WHERE id = ${parseInt(callId)}
    `;

    if (!call) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }

    // Verify user is part of the call
    if (call.caller_id !== user.userId && call.receiver_id !== user.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update call based on status
    let updateData: any = { status };

    if (status === 'connected') {
      updateData.started_at = new Date();
      if (receiverPeerId) {
        updateData.receiver_peer_id = receiverPeerId;
      }
    } else if (status === 'ended' || status === 'rejected') {
      updateData.ended_at = new Date();
      if (call.started_at) {
        const startTime = new Date(call.started_at).getTime();
        const endTime = new Date().getTime();
        updateData.duration = Math.floor((endTime - startTime) / 1000);
      }
    }

    const [updatedCall] = await sql`
      UPDATE calls 
      SET 
        status = ${updateData.status},
        started_at = COALESCE(${updateData.started_at || null}, started_at),
        ended_at = COALESCE(${updateData.ended_at || null}, ended_at),
        duration = COALESCE(${updateData.duration || null}, duration),
        receiver_peer_id = COALESCE(${updateData.receiver_peer_id || null}, receiver_peer_id)
      WHERE id = ${parseInt(callId)}
      RETURNING *
    `;

    return NextResponse.json({ 
      success: true,
      call: updatedCall
    });
  } catch (error: any) {
    console.error('Error updating call:', error);
    return NextResponse.json({ error: 'Failed to update call', details: error.message }, { status: 500 });
  }
}

// GET - Get call details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ callId: string }> }
) {
  try {
    const { callId } = await params;
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [call] = await sql`
      SELECT 
        c.*,
        caller.name as caller_name,
        caller.avatar as caller_avatar,
        receiver.name as receiver_name,
        receiver.avatar as receiver_avatar
      FROM calls c
      JOIN users caller ON c.caller_id = caller.id
      JOIN users receiver ON c.receiver_id = receiver.id
      WHERE c.id = ${parseInt(callId)}
    `;

    if (!call) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }

    // Verify user is part of the call
    if (call.caller_id !== user.userId && call.receiver_id !== user.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ call });
  } catch (error: any) {
    console.error('Error fetching call:', error);
    return NextResponse.json({ error: 'Failed to fetch call', details: error.message }, { status: 500 });
  }
}
