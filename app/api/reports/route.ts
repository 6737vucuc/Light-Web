import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { reports } from '@/lib/db/schema';
import { verifyAuth } from '@/lib/auth/verify';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Create a new report
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { reportedUserId, messageId, groupId, reason } = body;

    if (!reportedUserId || !reason) {
      return NextResponse.json(
        { error: 'Reported user and reason are required' },
        { status: 400 }
      );
    }

    // Create report
    const [report] = await db.insert(reports).values({
      reporterId: user.userId,
      reportedUserId,
      messageId: messageId || null,
      groupId: groupId || null,
      reason,
      status: 'pending',
    }).returning();

    return NextResponse.json({
      message: 'Report submitted successfully',
      report,
    });
  } catch (error) {
    console.error('Report creation error:', error);
    return NextResponse.json(
      { error: 'Failed to submit report' },
      { status: 500 }
    );
  }
}

// Get all reports (admin only)
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const allReports = await db.query.reports.findMany({
      with: {
        reporter: {
          columns: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        reportedUser: {
          columns: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
      orderBy: (reports, { desc }) => [desc(reports.createdAt)],
    });

    return NextResponse.json({ reports: allReports });
  } catch (error) {
    console.error('Get reports error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
      { status: 500 }
    );
  }
}
