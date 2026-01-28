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
        reportedUserId: reports.reportedUserId,
        messageId: reports.messageId,
        groupId: reports.groupId,
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
        // Get reported user info
        const [reportedUser] = await db
          .select({
            name: users.name,
            email: users.email,
            avatar: users.avatar,
          })
          .from(users)
          .where(eq(users.id, report.reportedUserId));

        // Get message content if messageId exists
        let messageContent = null;
        if (report.messageId) {
          const [message] = await db
            .select({
              content: groupMessages.content,
            })
            .from(groupMessages)
            .where(eq(groupMessages.id, report.messageId));
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
