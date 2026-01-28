export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth/middleware';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await requireAuth(request);
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const userId = authResult.user.id;
    const body = await request.json();
    const { bio, location, work, avatar, name, gender, birthDate, religion } = body;

    // Update profile info
    const updateData: any = {
      updatedAt: new Date()
    };

    if (bio !== undefined) updateData.bio = bio;
    if (location !== undefined) updateData.location = location;
    if (work !== undefined) updateData.work = work;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (name !== undefined) updateData.name = name;
    if (gender !== undefined) updateData.gender = gender;
    if (birthDate !== undefined) updateData.birthDate = birthDate;
    if (religion !== undefined) updateData.religion = religion;

    await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId));

    return NextResponse.json({
      success: true,
      message: 'Profile info updated successfully',
      avatarUrl: avatar // Return avatarUrl if it was updated
    });
  } catch (error) {
    console.error('Error updating profile info:', error);
    return NextResponse.json(
      { error: 'Failed to update profile info' },
      { status: 500 }
    );
  }
}
