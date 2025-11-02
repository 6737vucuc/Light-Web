export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { groupChats, groupChatMembers } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth/middleware';
import { eq, and, sql } from 'drizzle-orm';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: paramId } = await params;
  const authResult = await requireAuth(request);
  
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const groupId = parseInt(paramId);

    // Check if already a member
    const [existingMember] = await db
      .select()
      .from(groupChatMembers)
      .where(
        and(
          eq(groupChatMembers.groupId, groupId),
          eq(groupChatMembers.userId, authResult.user.id)
        )
      );

    if (existingMember) {
      return NextResponse.json(
        { error: 'Already a member of this group' },
        { status: 400 }
      );
    }

    // Add user as member
    await db.insert(groupChatMembers).values({
      groupId,
      userId: authResult.user.id,
      role: 'member',
    });

    // Increment members count
    await db
      .update(groupChats)
      .set({
        membersCount: sql`${groupChats.membersCount} + 1`,
      })
      .where(eq(groupChats.id, groupId));

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
