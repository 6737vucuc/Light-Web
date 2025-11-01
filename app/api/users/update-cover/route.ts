import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { verifyAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyAuth(request);
    if (!authResult.valid || !authResult.payload) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = authResult.payload.userId;
    const { coverPhoto } = await request.json();

    if (!coverPhoto) {
      return NextResponse.json(
        { error: 'Cover photo is required' },
        { status: 400 }
      );
    }

    // Update cover photo
    await db
      .update(users)
      .set({ 
        coverPhoto,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));

    return NextResponse.json({
      success: true,
      message: 'Cover photo updated successfully',
    });
  } catch (error) {
    console.error('Error updating cover photo:', error);
    return NextResponse.json(
      { error: 'Failed to update cover photo' },
      { status: 500 }
    );
  }
}
