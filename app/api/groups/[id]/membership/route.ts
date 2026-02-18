import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { groupMembers, communityGroups } from '@/lib/db/schema';
import { verifyAuth } from '@/lib/auth/verify';
import { eq, and, sql } from 'drizzle-orm';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { RealtimeChatService, ChatEvent } from '@/lib/realtime/chat';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET: التحقق من حالة العضوية
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const groupId = parseInt(id);
    const user = await verifyAuth(request);
    
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const member = await db.query.groupMembers.findFirst({
      where: and(
        eq(groupMembers.groupId, groupId),
        eq(groupMembers.userId, user.userId)
      )
    });

    return NextResponse.json({ isMember: !!member, role: member?.role || null });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST: الانضمام إلى مجموعة
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const groupId = parseInt(id);
    const user = await verifyAuth(request);
    
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // التأكد من عدم وجوده مسبقاً
    const existingMember = await db.query.groupMembers.findFirst({
      where: and(
        eq(groupMembers.groupId, groupId),
        eq(groupMembers.userId, user.userId)
      )
    });

    if (existingMember) {
      return NextResponse.json({ message: 'Already a member' });
    }

    // إضافة العضو
    await db.insert(groupMembers).values({
      groupId,
      userId: user.userId,
      role: 'member'
    });

    // تحديث عداد الأعضاء
    await db.update(communityGroups)
      .set({ membersCount: sql`${communityGroups.membersCount} + 1` })
      .where(eq(communityGroups.id, groupId));

    // بث حدث الانضمام عبر Realtime
    const supabase = getSupabaseAdmin();
    const channelName = RealtimeChatService.getGroupChannelName(groupId);
    await supabase.channel(channelName).send({
      type: 'broadcast',
      event: ChatEvent.USER_JOINED,
      payload: { 
        userId: user.userId, 
        userName: user.name,
        status: 'online',
        lastSeen: new Date()
      }
    });

    return NextResponse.json({ success: true, message: 'Joined successfully' });
  } catch (error) {
    console.error('Join Error:', error);
    return NextResponse.json({ error: 'Failed to join group' }, { status: 500 });
  }
}

// DELETE: مغادرة المجموعة
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const groupId = parseInt(id);
    const user = await verifyAuth(request);
    
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const result = await db.delete(groupMembers)
      .where(and(
        eq(groupMembers.groupId, groupId),
        eq(groupMembers.userId, user.userId)
      ))
      .returning();

    if (result.length > 0) {
      // تحديث عداد الأعضاء
      await db.update(communityGroups)
        .set({ membersCount: sql`${communityGroups.membersCount} - 1` })
        .where(eq(communityGroups.id, groupId));

      // بث حدث المغادرة
      const supabase = getSupabaseAdmin();
      const channelName = RealtimeChatService.getGroupChannelName(groupId);
      await supabase.channel(channelName).send({
        type: 'broadcast',
        event: ChatEvent.USER_LEFT,
        payload: { userId: user.userId, userName: user.name }
      });
    }

    return NextResponse.json({ success: true, message: 'Left successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to leave group' }, { status: 500 });
  }
}
