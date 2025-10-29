import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { db } from '@/lib/db';
import { testimonies } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

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

    await db.delete(testimonies).where(eq(testimonies.id, id));

    return NextResponse.json({ 
      success: true,
      message: 'Testimony deleted successfully'
    });
  } catch (error) {
    console.error('Delete testimony error:', error);
    return NextResponse.json(
      { error: 'Failed to delete testimony' },
      { status: 500 }
    );
  }
}
