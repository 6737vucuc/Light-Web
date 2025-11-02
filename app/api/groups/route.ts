export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { groupChats, groupChatMembers, users } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth/middleware';
import { desc, eq } from 'drizzle-orm';

// GET all groupChats or user's groupChats
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
      // Get user's groupChats
      const userGroups = await db
        .select({
          id: groupChats.id,
          name: groupChats.name,
          description: groupChats.description,
          coverPhoto: groupChats.coverPhoto,
          privacy: groupChats.privacy,
          membersCount: groupChats.membersCount,
          createdAt: groupChats.createdAt,
          role: groupChatMembers.role,
        })
        .from(groupChatMembers)
        .leftJoin(groupChats, eq(groupChatMembers.groupId, groupChats.id))
        .where(eq(groupChatMembers.userId, authResult.user.id))
        .orderBy(desc(groupChats.createdAt));

      return NextResponse.json({ groupChats: userGroups });
    } else {
      // Get all public groupChats
      const allGroups = await db
        .select({
          id: groupChats.id,
          name: groupChats.name,
          description: groupChats.description,
          coverPhoto: groupChats.coverPhoto,
          privacy: groupChats.privacy,
          membersCount: groupChats.membersCount,
          createdAt: groupChats.createdAt,
          creator: {
            id: users.id,
            name: users.name,
            avatar: users.avatar,
          },
        })
        .from(groupChats)
        .leftJoin(users, eq(groupChats.createdBy, users.id))
        .where(eq(groupChats.privacy, 'public'))
        .orderBy(desc(groupChats.createdAt));

      return NextResponse.json({ groupChats: allGroups });
    }
  } catch (error) {
    console.error('Error fetching groupChats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch groupChats' },
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
    const [newGroup] = await db.insert(groupChats).values({
      name: name.trim(),
      description: description || null,
      coverPhoto: coverPhoto || null,
      privacy: privacy || 'public',
      createdBy: authResult.user.id,
      membersCount: 1,
    }).returning();

    // Add creator as admin member
    await db.insert(groupChatMembers).values({
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
