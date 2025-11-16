import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { reports } from '@/lib/db/schema';
import { verifyAuth } from '@/lib/auth/verify';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Update report status (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyAuth(request);
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const reportId = parseInt(params.id);
    const body = await request.json();
    const { status, adminNotes } = body;

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      );
    }

    // Update report
    const [updatedReport] = await db
      .update(reports)
      .set({
        status,
        adminNotes: adminNotes || null,
        reviewedBy: user.userId,
        reviewedAt: new Date(),
      })
      .where(eq(reports.id, reportId))
      .returning();

    return NextResponse.json({
      message: 'Report updated successfully',
      report: updatedReport,
    });
  } catch (error) {
    console.error('Report update error:', error);
    return NextResponse.json(
      { error: 'Failed to update report' },
      { status: 500 }
    );
  }
}
