import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { db } from '@/lib/db';
import { supportRequests } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAdmin(request);
  
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const id = parseInt(params.id);
    const body = await request.json();
    const { status } = body;

    if (!status || !['pending', 'resolved'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    await db
      .update(supportRequests)
      .set({ status })
      .where(eq(supportRequests.id, id));

    return NextResponse.json({ 
      success: true,
      message: 'Status updated successfully'
    });
  } catch (error) {
    console.error('Update support request error:', error);
    return NextResponse.json(
      { error: 'Failed to update support request' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAdmin(request);
  
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const id = parseInt(params.id);

    await db.delete(supportRequests).where(eq(supportRequests.id, id));

    return NextResponse.json({ 
      success: true,
      message: 'Support request deleted successfully'
    });
  } catch (error) {
    console.error('Delete support request error:', error);
    return NextResponse.json(
      { error: 'Failed to delete support request' },
      { status: 500 }
    );
  }
}
