import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { groupMembers, communityGroups } from '@/lib/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { verifyAuth } from '@/lib/auth/verify';

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

    // Check if already a member
    const existingMember = await db.query.groupMembers.findFirst({
      where: and(
        eq(groupMembers.groupId, groupId),
        eq(groupMembers.userId, user.userId)
      ),
    });

    if (existingMember) {
      return NextResponse.json({ message: 'Already a member' });
    }

    // Add user to group
    await db.insert(groupMembers).values({
      groupId: groupId,
      userId: user.userId,
      role: 'member',
      joinedAt: new Date(),
    });

    // Update members count
    const countResult = await db.select({ count: sql`COUNT(*)` })
      .from(groupMembers)
      .where(eq(groupMembers.groupId, groupId));
    
    const count = Number(countResult[0]?.count) || 0;

    await db.update(communityGroups)
      .set({ membersCount: count })
      .where(eq(communityGroups.id, groupId));

    return NextResponse.json({ message: 'Joined successfully' });
  } catch (error) {
    console.error('Error joining group:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
