import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { communityGroups, groupMembers } from '@/lib/db/schema';
import { verifyAuth } from '@/lib/auth/verify';
import { eq, sql, count } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Get all groups with real member counts
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all groups
    const groups = await db.query.communityGroups.findMany({
      orderBy: (communityGroups, { desc }) => [desc(communityGroups.createdAt)],
    });

    // Get real member counts for each group
    const groupsWithRealCounts = await Promise.all(
      groups.map(async (group) => {
        const [memberCount] = await db
          .select({ count: count() })
          .from(groupMembers)
          .where(eq(groupMembers.groupId, group.id));
        
        return {
          ...group,
          members_count: memberCount?.count || 0,
          messages_count: group.messagesCount || 0,
        };
      })
    );

    return NextResponse.json({ groups: groupsWithRealCounts });
  } catch (error) {
    console.error('Error fetching groups:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Create a new group (admin only)
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, color, icon } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Group name is required' },
        { status: 400 }
      );
    }

    const [group] = await db.insert(communityGroups).values({
      name,
      description: description || null,
      color: color || '#8B5CF6',
      icon: icon || 'users',
      createdBy: user.userId,
      membersCount: 0,
      messagesCount: 0,
    }).returning();

    return NextResponse.json({
      message: 'Group created successfully',
      group,
    });
  } catch (error) {
    console.error('Error creating group:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
