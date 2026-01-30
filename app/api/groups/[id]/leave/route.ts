import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { groupMembers, communityGroups } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { verifyAuth } from '@/lib/auth/verify';
import Pusher from 'pusher-js';

const pusher = new (require('pusher')).default({
  appId: process.env.PUSHER_APP_ID!,
  key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
  secret: process.env.PUSHER_SECRET!,
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyAuth(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const groupId = parseInt(params.id);

    // Check if user is a member
    const member = await db.query.groupMembers.findFirst({
      where: and(
        eq(groupMembers.groupId, groupId),
        eq(groupMembers.userId, user.userId)
      ),
    });

    if (!member) {
      return NextResponse.json({ error: 'Not a member of this group' }, { status: 400 });
    }

    // Remove user from group
    await db.delete(groupMembers)
      .where(and(
        eq(groupMembers.groupId, groupId),
        eq(groupMembers.userId, user.userId)
      ));

    // Update members count
    const countResult = await db.select({ count: sql`COUNT(*)` })
      .from(groupMembers)
      .where(eq(groupMembers.groupId, groupId));
    
    const count = Number(countResult[0]?.count) || 0;

    await db.update(communityGroups)
      .set({ membersCount: count })
      .where(eq(communityGroups.id, groupId));

    // Trigger real-time update via Pusher
    await pusher.trigger(`group-${groupId}`, 'member-left', {
      userId: user.userId,
      totalMembers: count,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({ message: 'Left group successfully', totalMembers: count });
  } catch (error) {
    console.error('Error leaving group:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
