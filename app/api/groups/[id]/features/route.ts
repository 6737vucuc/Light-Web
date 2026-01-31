import { NextRequest, NextResponse } from 'next/server';
import {
  pinMessage,
  unpinMessage,
  getPinnedMessages,
  starMessage,
  unstarMessage,
  getStarredMessages,
  searchMessages,
  getMentions,
  getOnlineMembers,
  getOnlineMembersCount,
  getMessageReadCount,
  getWhoReadMessage,
} from '@/lib/services/groupService';

// ============================================
// Pinned Messages
// ============================================

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const groupId = parseInt(id);
    const { action, messageId, userId } = await request.json();

    // Verify user is authenticated
    const authResponse = await fetch(new URL('/api/auth/me', request.url), {
      headers: request.headers,
    });

    if (!authResponse.ok) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { user } = await authResponse.json();

    switch (action) {
      case 'pin':
        await pinMessage(messageId, groupId, user.id);
        return NextResponse.json({ success: true, message: 'Message pinned' });

      case 'unpin':
        await unpinMessage(messageId, groupId, user.id);
        return NextResponse.json({ success: true, message: 'Message unpinned' });

      case 'getPinned':
        const pinned = await getPinnedMessages(groupId);
        return NextResponse.json({ pinned });

      case 'star':
        await starMessage(messageId, user.id);
        return NextResponse.json({ success: true, message: 'Message starred' });

      case 'unstar':
        await unstarMessage(messageId, user.id);
        return NextResponse.json({ success: true, message: 'Message unstarred' });

      case 'getStarred':
        const starred = await getStarredMessages(user.id);
        return NextResponse.json({ starred });

      case 'search':
        const { query } = await request.json();
        const results = await searchMessages(groupId, query);
        return NextResponse.json({ results });

      case 'getMentions':
        const mentions = await getMentions(user.id, groupId);
        return NextResponse.json({ mentions });

      case 'getOnlineMembers':
        const onlineMembers = await getOnlineMembers(groupId);
        return NextResponse.json({ onlineMembers });

      case 'getOnlineMembersCount':
        const count = await getOnlineMembersCount(groupId);
        return NextResponse.json({ count });

      case 'getMessageReadCount':
        const readCount = await getMessageReadCount(messageId);
        return NextResponse.json({ readCount });

      case 'getWhoReadMessage':
        const readers = await getWhoReadMessage(messageId);
        return NextResponse.json({ readers });

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in group features API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
