export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { groups, groupMembers, users } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth/middleware';
import { desc, eq } from 'drizzle-orm';

// GET all groups or user's groups
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'all' or 'my'

    if (type === 'my') {
      // Get user's groups
      const userGroups = await db
        .select({
          id: groups.id,
          name: groups.name,
          description: groups.description,
          coverPhoto: groups.coverPhoto,
          privacy: groups.privacy,
          membersCount: groups.membersCount,
          createdAt: groups.createdAt,
          role: groupMembers.role,
        })
        .from(groupMembers)
        .leftJoin(groups, eq(groupMembers.groupId, groups.id))
        .where(eq(groupMembers.userId, authResult.user.id))
        .orderBy(desc(groups.createdAt));

      return NextResponse.json({ groups: userGroups });
    } else {
      // Get all public groups
      const allGroups = await db
        .select({
          id: groups.id,
          name: groups.name,
          description: groups.description,
          coverPhoto: groups.coverPhoto,
          privacy: groups.privacy,
          membersCount: groups.membersCount,
          createdAt: groups.createdAt,
          creator: {
            id: users.id,
            name: users.name,
            avatar: users.avatar,
          },
        })
        .from(groups)
        .leftJoin(users, eq(groups.createdBy, users.id))
        .where(eq(groups.privacy, 'public'))
        .orderBy(desc(groups.createdAt));

      return NextResponse.json({ groups: allGroups });
    }
  } catch (error) {
    console.error('Error fetching groups:', error);
    return NextResponse.json(
      { error: 'Failed to fetch groups' },
      { status: 500 }
    );
  }
}

// POST create new group
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const body = await request.json();
    const { name, description, coverPhoto, privacy } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Group name is required' },
        { status: 400 }
      );
    }

    // Create group
    const [newGroup] = await db.insert(groups).values({
      name: name.trim(),
      description: description || null,
      coverPhoto: coverPhoto || null,
      privacy: privacy || 'public',
      createdBy: authResult.user.id,
      membersCount: 1,
    }).returning();

    // Add creator as admin member
    await db.insert(groupMembers).values({
      groupId: newGroup.id,
      userId: authResult.user.id,
      role: 'admin',
    });

    return NextResponse.json({ group: newGroup }, { status: 201 });
  } catch (error) {
    console.error('Error creating group:', error);
    return NextResponse.json(
      { error: 'Failed to create group' },
      { status: 500 }
    );
  }
}
