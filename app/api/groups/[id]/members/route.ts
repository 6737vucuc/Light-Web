import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { groupMembers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { verifyAuth } from '@/lib/auth/verify';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyAuth(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const groupId = parseInt(params.id);

    // Get all members
    const members = await db.query.groupMembers.findMany({
      where: eq(groupMembers.groupId, groupId),
      with: {
        user: true,
      },
      orderBy: (members, { desc }) => [desc(members.joinedAt)],
    });

    // Separate online and offline members
    const onlineMembers = members.filter(m => {
      if (!m.lastActive) return false;
      const lastActiveTime = new Date(m.lastActive).getTime();
      const now = new Date().getTime();
      return (now - lastActiveTime) < 5 * 60 * 1000; // 5 minutes
    });

    const offlineMembers = members.filter(m => {
      if (!m.lastActive) return true;
      const lastActiveTime = new Date(m.lastActive).getTime();
      const now = new Date().getTime();
      return (now - lastActiveTime) >= 5 * 60 * 1000;
    });

    return NextResponse.json({
      members,
      onlineMembers,
      offlineMembers,
      totalMembers: members.length,
      onlineCount: onlineMembers.length,
    });
  } catch (error) {
    console.error('Error fetching members:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
