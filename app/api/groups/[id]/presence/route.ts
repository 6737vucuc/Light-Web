import { NextRequest, NextResponse } from 'next/server';
import { PresenceService } from '@/lib/services/presenceService';

/**
 * Presence API Endpoint
 * Handles real-time online/offline status tracking
 */

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const groupId = parseInt(id);
    const { action, userId, isOnline, sessionId } = await request.json();

    // Verify user is authenticated
    const authResponse = await fetch(new URL('/api/auth/me', request.url), {
      headers: request.headers,
    });

    if (!authResponse.ok) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user } = await authResponse.json();

    // Verify user is member of the group
    const memberResponse = await fetch(
      new URL(`/api/groups/${groupId}/members/${user.id}`, request.url),
      { headers: request.headers }
    );

    if (!memberResponse.ok) {
      return NextResponse.json(
        { error: 'User is not a member of this group' },
        { status: 403 }
      );
    }

    switch (action) {
      case 'updatePresence':
        await PresenceService.updatePresence(groupId, userId || user.id, isOnline, sessionId);
        return NextResponse.json({ success: true });

      case 'getOnlineMembers':
        const onlineMembers = await PresenceService.getOnlineMembers(groupId);
        return NextResponse.json({ onlineMembers });

      case 'getOnlineMembersCount':
        const count = await PresenceService.getOnlineMembersCount(groupId);
        return NextResponse.json({ count });

      case 'getPresenceStats':
        const stats = await PresenceService.getPresenceStats(groupId);
        return NextResponse.json(stats);

      case 'markOffline':
        await PresenceService.markOffline(groupId, userId || user.id, sessionId);
        return NextResponse.json({ success: true });

      case 'broadcastPresenceUpdate':
        await PresenceService.broadcastPresenceUpdate(groupId, userId || user.id, isOnline);
        return NextResponse.json({ success: true });

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in presence API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const groupId = parseInt(id);

    // Verify user is authenticated
    const authResponse = await fetch(new URL('/api/auth/me', request.url), {
      headers: request.headers,
    });

    if (!authResponse.ok) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get presence stats
    const stats = await PresenceService.getPresenceStats(groupId);
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error in presence GET API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
