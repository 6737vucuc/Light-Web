import { NextRequest, NextResponse } from 'next/server';
import { PresenceService } from '@/lib/services/presenceService';
import { db } from '@/lib/db';
import { eq, and } from 'drizzle-orm';
import * as schema from '@/lib/db/schema';

/**
 * Presence API Endpoint
 * Handles real-time online/offline status tracking
 */

import { verifyAuth } from '@/lib/auth/verify';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const groupId = parseInt(id);
    const body = await request.json().catch(() => ({}));
    const { action, userId, isOnline, sessionId } = body;

    // Use verifyAuth directly instead of fetch
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUserId = user.userId || user.id;

    // Verify user is member of the group
    const member = await db.query.groupMembers.findFirst({
      where: and(
        eq(schema.groupMembers.groupId, groupId),
        eq(schema.groupMembers.userId, currentUserId)
      )
    });

    if (!member) {
      return NextResponse.json(
        { error: 'User is not a member of this group' },
        { status: 403 }
      );
    }

    switch (action) {
      case 'updatePresence':
        await PresenceService.updatePresence(groupId, userId || currentUserId, isOnline, sessionId);
        return NextResponse.json({ success: true });

      case 'getOnlineMembers':
        const onlineMembers = await PresenceService.getOnlineMembers(groupId);
        return NextResponse.json({ onlineMembers: onlineMembers || [] });

      case 'getOnlineMembersCount':
        const count = await PresenceService.getOnlineMembersCount(groupId);
        return NextResponse.json({ count: count || 0 });

      case 'getPresenceStats':
        const stats = await PresenceService.getPresenceStats(groupId);
        return NextResponse.json(stats || { totalMembers: 0, onlineMembers: 0, offlineMembers: 0, onlinePercentage: 0, members: [] });

      case 'markOffline':
        await PresenceService.markOffline(groupId, userId || currentUserId, sessionId);
        return NextResponse.json({ success: true });

      case 'broadcastPresenceUpdate':
        await PresenceService.broadcastPresenceUpdate(groupId, userId || currentUserId, isOnline);
        return NextResponse.json({ success: true });

      default:
        // Default to getPresenceStats if no action is provided
        const defaultStats = await PresenceService.getPresenceStats(groupId);
        return NextResponse.json(defaultStats || { totalMembers: 0, onlineMembers: 0, offlineMembers: 0, onlinePercentage: 0, members: [] });
    }
  } catch (error) {
    console.error('Error in presence API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
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

    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get presence stats
    const stats = await PresenceService.getPresenceStats(groupId);
    return NextResponse.json(stats || { totalMembers: 0, onlineMembers: 0, offlineMembers: 0, onlinePercentage: 0, members: [] });
  } catch (error) {
    console.error('Error in presence GET API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
