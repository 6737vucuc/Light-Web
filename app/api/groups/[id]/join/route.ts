export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { groups, groupMembers } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth/middleware';
import { eq, and, sql } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authResult = await requireAuth(request);
  
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const groupId = parseInt(id);

    // Check if already a member
    const [existingMember] = await db
      .select()
      .from(groupMembers)
      .where(
        and(
          eq(groupMembers.groupId, groupId),
          eq(groupMembers.userId, authResult.user.id)
        )
      );

    if (existingMember) {
      return NextResponse.json(
        { error: 'Already a member of this group' },
        { status: 400 }
      );
    }

    // Add user as member
    await db.insert(groupMembers).values({
      groupId,
      userId: authResult.user.id,
      role: 'member',
    });

    // Increment members count
    await db
      .update(groups)
      .set({
        membersCount: sql`${groups.membersCount} + 1`,
      })
      .where(eq(groups.id, groupId));

    return NextResponse.json({ 
      success: true,
      message: 'Successfully joined the group' 
    });
  } catch (error) {
    console.error('Error joining group:', error);
    return NextResponse.json(
      { error: 'Failed to join group' },
      { status: 500 }
    );
  }
}
