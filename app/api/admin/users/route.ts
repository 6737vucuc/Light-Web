export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db, sql as rawSql } from '@/lib/db';
import { users, communityGroups, groupMembers, groupMessages } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth/middleware';
import { eq, desc, or } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    if (!authResult.user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const allUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        avatar: users.avatar,
        isAdmin: users.isAdmin,
        isBanned: users.isBanned,
        emailVerified: users.emailVerified,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    return NextResponse.json({ users: allUsers });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json({ error: 'Failed to get users' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    if (!authResult.user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const userIdNum = parseInt(userId);

    // ✅ استخدم rawSql لكل الجداول - مية مية
    try {
      // ===== 1. الرسائل والمجموعات =====
      await rawSql`DELETE FROM group_activity_log WHERE user_id = ${userIdNum}`;
      await rawSql`DELETE FROM group_message_pinned WHERE pinned_by = ${userIdNum}`;
      await rawSql`DELETE FROM group_message_read_receipts WHERE user_id = ${userIdNum}`;
      await rawSql`DELETE FROM message_edit_history WHERE edited_by = ${userIdNum}`;
      await rawSql`DELETE FROM message_mentions WHERE mentioned_user_id = ${userIdNum}`;
      await rawSql`DELETE FROM pinned_messages WHERE pinned_by = ${userIdNum}`;
      await rawSql`DELETE FROM starred_messages WHERE user_id = ${userIdNum}`;
      await rawSql`DELETE FROM typing_status WHERE user_id = ${userIdNum}`;
      await rawSql`DELETE FROM member_presence WHERE user_id = ${userIdNum}`;
      
      // ✅ رسائل المجموعات
      await rawSql`DELETE FROM group_messages WHERE user_id = ${userIdNum}`;
      
      // ✅ أعضاء المجموعات
      await rawSql`DELETE FROM group_members WHERE user_id = ${userIdNum}`;
      
      // ===== 2. الرسائل المباشرة =====
      await rawSql`DELETE FROM direct_messages WHERE sender_id = ${userIdNum} OR receiver_id = ${userIdNum}`;
      
      // ===== 3. المكالمات =====
      await rawSql`DELETE FROM calls WHERE caller_id = ${userIdNum} OR receiver_id = ${userIdNum}`;
      
      // ===== 4. الدروس والتقدم =====
      await rawSql`DELETE FROM lesson_progress WHERE user_id = ${userIdNum}`;
      await rawSql`DELETE FROM lesson_ratings WHERE user_id = ${userIdNum}`;
      await rawSql`DELETE FROM lessons WHERE createdby = ${userIdNum}`;
      
      // ===== 5. المحتوى الديني =====
      await rawSql`DELETE FROM daily_verses WHERE created_by = ${userIdNum}`;
      
      // ===== 6. الشهادات =====
      await rawSql`DELETE FROM testimonies WHERE user_id = ${userIdNum}`;
      await rawSql`UPDATE testimonies SET approved_by = NULL WHERE approved_by = ${userIdNum}`;
      
      // ===== 7. البلاغات =====
      await rawSql`DELETE FROM reports WHERE reporter_id = ${userIdNum} OR reported_user_id = ${userIdNum}`;
      await rawSql`UPDATE reports SET reviewed_by = NULL WHERE reviewed_by = ${userIdNum}`;
      
      // ===== 8. الدعم الفني =====
      await rawSql`DELETE FROM support_replies WHERE user_id = ${userIdNum}`;
      await rawSql`DELETE FROM support_tickets WHERE user_id = ${userIdNum}`;
      await rawSql`UPDATE support_tickets SET assigned_to = NULL WHERE assigned_to = ${userIdNum}`;
      
      // ===== 9. الأمان والتحقق =====
      await rawSql`DELETE FROM internal_2fa_codes WHERE user_id = ${userIdNum}`;
      await rawSql`DELETE FROM password_resets WHERE user_id = ${userIdNum}`;
      await rawSql`DELETE FROM security_logs WHERE user_id = ${userIdNum}`;
      await rawSql`DELETE FROM trusted_devices WHERE user_id = ${userIdNum}`;
      
      // ===== 10. السجلات والمراقبة =====
      await rawSql`DELETE FROM vpn_logs WHERE user_id = ${userIdNum}`;
      
      // ===== 11. المجموعات التي أنشأها =====
      await rawSql`DELETE FROM community_groups WHERE created_by = ${userIdNum}`;
      
      // ===== 12. أخيراً: حذف المستخدم =====
      await rawSql`DELETE FROM users WHERE id = ${userIdNum}`;

      return NextResponse.json({ 
        success: true,
        message: 'User and all related data deleted successfully' 
      });
      
    } catch (deleteError) {
      console.error('❌ Delete cascade error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete user and related data. Check server logs.' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('❌ Delete user error:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
