import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { reports, users, groupMessages } from '@/lib/db/schema';
import { verifyAuth } from '@/lib/auth/verify';
import { eq, desc } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Get all reports (admin only)
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all reports with user and message info
    const allReports = await db
      .select({
        id: reports.id,
        reporterId: reports.reporterId,
        targetId: reports.targetId,
        targetType: reports.targetType,
        reason: reports.reason,
        status: reports.status,
        createdAt: reports.createdAt,
        reporterName: users.name,
        reporterEmail: users.email,
        reporterAvatar: users.avatar,
      })
      .from(reports)
      .leftJoin(users, eq(reports.reporterId, users.id))
      .orderBy(desc(reports.createdAt));

    // Get reported user info and message content for each report
    const reportsWithDetails = await Promise.all(
      allReports.map(async (report) => {
        // Get reported user info (if target is user)
        let reportedUser = null;
        if (report.targetType === 'user') {
          const [user] = await db
            .select({
              name: users.name,
              email: users.email,
              avatar: users.avatar,
            })
            .from(users)
            .where(eq(users.id, report.targetId));
          reportedUser = user;
        }

        // Get message content if target is message
        let messageContent = null;
        if (report.targetType === 'message') {
          const [message] = await db
            .select({
              content: groupMessages.content,
            })
            .from(groupMessages)
            .where(eq(groupMessages.id, report.targetId));
          messageContent = message?.content;
        }

        return {
          ...report,
          reportedUserName: reportedUser?.name,
          reportedUserEmail: reportedUser?.email,
          reportedUserAvatar: reportedUser?.avatar,
          messageContent,
        };
      })
    );

    return NextResponse.json({ reports: reportsWithDetails });
  } catch (error) {
    console.error('Get reports error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
      { status: 500 }
    );
  }
}
