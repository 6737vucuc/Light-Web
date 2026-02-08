import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { groupMembers, communityGroups } from '@/lib/db/schema';
import { verifyAuth } from '@/lib/auth/verify';
import { eq, and, sql, count } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Verify authentication
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const groupId = parseInt(id);
    const userId = user.userId;

    // Check if group exists
    const group = await db.query.communityGroups.findFirst({
      where: eq(communityGroups.id, groupId),
    });

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Check if already a member
    const existingMember = await db.query.groupMembers.findFirst({
      where: and(
        eq(groupMembers.groupId, groupId),
        eq(groupMembers.userId, userId)
      ),
    });

    if (existingMember) {
      return NextResponse.json({ 
        message: 'Already a member', 
        status: 'existing' 
      });
    }

    // Insert new member
    await db.insert(groupMembers).values({
      groupId: groupId,
      userId: userId,
      role: 'member',
      isAdmin: false,
      isModerator: false,
      canDeleteMessages: false,
    });

    // Update members count
    const [memberCount] = await db
      .select({ count: count() })
      .from(groupMembers)
      .where(eq(groupMembers.groupId, groupId));

    await db
      .update(communityGroups)
      .set({ membersCount: memberCount?.count || 1 })
      .where(eq(communityGroups.id, groupId));

    return NextResponse.json({ 
      message: 'Joined successfully', 
      status: 'success' 
    });
  } catch (error: any) {
    console.error('Error joining group:', error);
    return NextResponse.json({ 
      error: 'DATABASE_INSERT_FAILED', 
      details: error.message 
    }, { status: 500 });
  }
}
