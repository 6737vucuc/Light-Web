import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { communityGroups, groupMembers, groupMessages, users } from '@/lib/db/schema';
import { verifyAuth } from '@/lib/auth/verify';
import { eq, desc, sql } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.userId),
      columns: { isAdmin: true }
    });

    if (!dbUser || !dbUser.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all groups using Drizzle with relations or manual join for counts
    const groups = await db.select({
      id: communityGroups.id,
      name: communityGroups.name,
      description: communityGroups.description,
      color: communityGroups.color,
      icon: communityGroups.icon,
      avatar: communityGroups.avatar,
      createdBy: communityGroups.createdBy,
      createdAt: communityGroups.createdAt,
      updatedAt: communityGroups.updatedAt,
      actual_members_count: sql<number>`(SELECT count(*) FROM ${groupMembers} WHERE ${groupMembers.groupId} = ${communityGroups.id})`,
      messages_count: sql<number>`(SELECT count(*) FROM ${groupMessages} WHERE ${groupMessages.groupId} = ${communityGroups.id})`,
    })
    .from(communityGroups)
    .orderBy(desc(communityGroups.createdAt));

    return NextResponse.json({ groups });
  } catch (error) {
    console.error('Error fetching groups:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.userId),
      columns: { isAdmin: true }
    });

    if (!dbUser || !dbUser.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { name, description, color, icon, avatar } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'Group name is required' }, { status: 400 });
    }

    // Create new group using Drizzle
    const [newGroup] = await db.insert(communityGroups).values({
      name,
      description: description || null,
      color: color || '#8B5CF6',
      icon: icon || 'users',
      avatar: avatar || null,
      createdBy: user.userId,
    }).returning();

    return NextResponse.json({ group: newGroup }, { status: 201 });
  } catch (error) {
    console.error('Error creating group:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.userId),
      columns: { isAdmin: true }
    });

    if (!dbUser || !dbUser.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('id');

    if (!groupId) {
      return NextResponse.json({ error: 'Group ID is required' }, { status: 400 });
    }

    const gId = parseInt(groupId);

    // Delete related data using Drizzle
    await db.delete(groupMessages).where(eq(groupMessages.groupId, gId));
    await db.delete(groupMembers).where(eq(groupMembers.groupId, gId));
    await db.delete(communityGroups).where(eq(communityGroups.id, gId));

    return NextResponse.json({ message: 'Group deleted successfully' });
  } catch (error) {
    console.error('Error deleting group:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.userId),
      columns: { isAdmin: true }
    });

    if (!dbUser || !dbUser.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { action } = await request.json();

    if (action === 'clearAll') {
      await db.delete(groupMessages);
      await db.delete(groupMembers);
      await db.delete(communityGroups);
      return NextResponse.json({ message: 'All groups cleared successfully' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error clearing groups:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
