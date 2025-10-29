import { NextRequest, NextResponse } from 'next/server';
import { hash, verify } from 'argon2';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth/middleware';
import { eq } from 'drizzle-orm';

// GET user profile
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  return NextResponse.json({ user: authResult.user });
}

// PUT update user profile
export async function PUT(request: NextRequest) {
  const authResult = await requireAuth(request);
  
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const body = await request.json();
    const { name, currentPassword, newPassword } = body;

    const updateData: any = {};

    if (name) {
      updateData.name = name;
    }

    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: 'Current password is required to change password' },
          { status: 400 }
        );
      }

      // Verify current password
      const isValid = await verify(authResult.user.password, currentPassword);
      if (!isValid) {
        return NextResponse.json(
          { error: 'Current password is incorrect' },
          { status: 401 }
        );
      }

      // Hash new password
      updateData.password = await hash(newPassword);
    }

    if (Object.keys(updateData).length > 0) {
      await db
        .update(users)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(users.id, authResult.user.id));
    }

    return NextResponse.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}

