export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { reports } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth/middleware';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { user } = authResult;

    const { reportedUserId, reportedPostId, reason, description } = await request.json();

    if (!reason) {
      return NextResponse.json({ error: 'Reason is required' }, { status: 400 });
    }

    if (!reportedUserId && !reportedPostId) {
      return NextResponse.json({ error: 'Either user or post must be reported' }, { status: 400 });
    }

    // Create report
    await db.insert(reports).values({
      reporterId: user.id,
      reportedUserId: reportedUserId || null,
      reportedPostId: reportedPostId || null,
      reason,
      description: description || null,
      status: 'pending',
    });

    return NextResponse.json({ success: true, message: 'Report submitted successfully' });
  } catch (error) {
    console.error('Report error:', error);
    return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { user } = authResult;

    // Only admins can view reports
    if (!user.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const allReports = await db
      .select()
      .from(reports)
      .orderBy(reports.createdAt);

    return NextResponse.json({ reports: allReports });
  } catch (error) {
    console.error('Get reports error:', error);
    return NextResponse.json({ error: 'Failed to get reports' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { user } = authResult;

    // Only admins can update reports
    if (!user.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
