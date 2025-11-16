export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { reports, users } from '@/lib/db/schema';
import { requireAdmin } from '@/lib/auth/middleware';
import { eq, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdmin(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Get all reports with user and post information
    const allReports = await db
      .select({
        id: reports.id,
        reporterId: reports.reporterId,
        reporterName: users.name,
        reportedUserId: reports.reportedUserId,
        reportedPostId: reports.reportedPostId,
        reason: reports.reason,
        description: reports.description,
        status: reports.status,
        createdAt: reports.createdAt,
      })
      .from(reports)
      .leftJoin(users, eq(reports.reporterId, users.id))
      .orderBy(desc(reports.createdAt));

    return NextResponse.json({ reports: allReports });
  } catch (error) {
    console.error('Get reports error:', error);
    return NextResponse.json({ error: 'Failed to get reports' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authResult = await requireAdmin(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { reportId, status } = await request.json();

    if (!reportId || !status) {
      return NextResponse.json({ error: 'Report ID and status are required' }, { status: 400 });
    }

    await db
      .update(reports)
      .set({ status })
      .where(eq(reports.id, reportId));

    return NextResponse.json({ success: true, message: 'Report updated successfully' });
  } catch (error) {
    console.error('Update report error:', error);
    return NextResponse.json({ error: 'Failed to update report' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireAdmin(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get('id');

    if (!reportId) {
      return NextResponse.json({ error: 'Report ID is required' }, { status: 400 });
    }

    await db.delete(reports).where(eq(reports.id, parseInt(reportId)));

    return NextResponse.json({ success: true, message: 'Report deleted successfully' });
  } catch (error) {
    console.error('Delete report error:', error);
    return NextResponse.json({ error: 'Failed to delete report' }, { status: 500 });
  }
}
