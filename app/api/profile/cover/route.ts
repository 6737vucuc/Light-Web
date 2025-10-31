import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth/middleware';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const body = await request.json();
    const { coverPhoto } = body;

    if (!coverPhoto) {
      return NextResponse.json(
        { error: 'Cover photo URL is required' },
        { status: 400 }
      );
    }

    await db
      .update(users)
      .set({
        coverPhoto,
        updatedAt: new Date(),
      })
      .where(eq(users.id, authResult.user.id));

    return NextResponse.json({ 
      success: true,
      message: 'Cover photo updated successfully',
      coverPhoto
    });
  } catch (error) {
    console.error('Error updating cover photo:', error);
    return NextResponse.json(
      { error: 'Failed to update cover photo' },
      { status: 500 }
    );
  }
}
