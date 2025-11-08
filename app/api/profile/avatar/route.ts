export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth/middleware';
import { uploadAvatar, deleteFromCloudinary, extractPublicId } from '@/lib/cloudinary';
import { eq } from 'drizzle-orm';
import { RealtimeChatService } from '@/lib/realtime/chat';

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('avatar') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      );
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 5MB' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Get current avatar to delete old one
    const [currentUser] = await db
      .select({ avatar: users.avatar })
      .from(users)
      .where(eq(users.id, authResult.user.id));

    // Upload to Cloudinary
    const uploadResult = await uploadAvatar(buffer, authResult.user.id);

    if (!uploadResult.success) {
      return NextResponse.json(
        { error: uploadResult.error || 'Failed to upload image' },
        { status: 500 }
      );
    }

    // Delete old avatar from Cloudinary if exists
    if (currentUser?.avatar && currentUser.avatar.includes('cloudinary.com')) {
      const oldPublicId = extractPublicId(currentUser.avatar);
      if (oldPublicId) {
        await deleteFromCloudinary(oldPublicId);
      }
    }

    // Update user avatar in database
    const [updatedUser] = await db
      .update(users)
      .set({ avatar: uploadResult.url, updatedAt: new Date() })
      .where(eq(users.id, authResult.user.id))
      .returning();

    // Send real-time update via Pusher to all users
    await RealtimeChatService.sendProfileUpdate(authResult.user.id, {
      avatar: uploadResult.url,
      updatedAt: new Date(),
    });

    return NextResponse.json({
      message: 'Avatar uploaded successfully',
      avatarUrl: uploadResult.url,
    });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    return NextResponse.json(
      { error: 'Failed to upload avatar' },
      { status: 500 }
    );
  }
}
