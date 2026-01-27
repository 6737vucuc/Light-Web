import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { testimonies } from '@/lib/db/schema';
import { verifyAuth } from '@/lib/auth/verify';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Delete a testimony
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth(request);
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const testimonyId = parseInt(id);

    await db.delete(testimonies).where(eq(testimonies.id, testimonyId));

    return NextResponse.json({ message: 'Testimony deleted successfully' });
  } catch (error) {
    console.error('Delete testimony error:', error);
    return NextResponse.json(
      { error: 'Failed to delete testimony' },
      { status: 500 }
    );
  }
}

// Update testimony (approve/reject)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth(request);
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const testimonyId = parseInt(id);
    const body = await request.json();
    const { isApproved } = body;

    await db
      .update(testimonies)
      .set({
        isApproved,
        approvedBy: user.userId,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(testimonies.id, testimonyId));

    return NextResponse.json({ message: 'Testimony updated successfully' });
  } catch (error) {
    console.error('Update testimony error:', error);
    return NextResponse.json(
      { error: 'Failed to update testimony' },
      { status: 500 }
    );
  }
}
