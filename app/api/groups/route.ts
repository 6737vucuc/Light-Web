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

    // Get all groups with real member counts in a single optimized query
    const groups = await db.execute(sql`
      SELECT 
        cg.*,
        (SELECT COUNT(*)::int FROM group_members gm WHERE gm.group_id = cg.id) as members_count,
        COALESCE(cg.messages_count, 0) as messages_count
      FROM community_groups cg
      ORDER BY cg.created_at DESC
    `);

    // Normalize rows from db.execute result
    const normalizedGroups = Array.isArray(groups.rows) ? groups.rows : [];

    return NextResponse.json({ groups: normalizedGroups });
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
