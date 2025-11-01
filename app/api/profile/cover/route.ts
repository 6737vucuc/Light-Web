export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth/middleware';
import { uploadCoverPhoto, deleteFromCloudinary, extractPublicId } from '@/lib/cloudinary';
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
    const formData = await request.formData();
    const file = formData.get('cover') as File;

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

    // Validate file size (10MB for cover photos)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 10MB' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Get current cover photo to delete old one
    const [currentUser] = await db
      .select({ coverPhoto: users.coverPhoto })
      .from(users)
      .where(eq(users.id, authResult.user.id));

    // Upload to Cloudinary
    const uploadResult = await uploadCoverPhoto(buffer, authResult.user.id);

    if (!uploadResult.success) {
      return NextResponse.json(
        { error: uploadResult.error || 'Failed to upload image' },
        { status: 500 }
      );
    }

    // Delete old cover photo from Cloudinary if exists
    if (currentUser?.coverPhoto && currentUser.coverPhoto.includes('cloudinary.com')) {
      const oldPublicId = extractPublicId(currentUser.coverPhoto);
      if (oldPublicId) {
        await deleteFromCloudinary(oldPublicId);
      }
    }

    // Update user cover photo in database
    await db
      .update(users)
      .set({ 
        coverPhoto: uploadResult.url,
        updatedAt: new Date()
      })
      .where(eq(users.id, authResult.user.id));

    return NextResponse.json({ 
      success: true,
      message: 'Cover photo updated successfully',
      coverPhoto: uploadResult.url
    });
  } catch (error) {
    console.error('Error updating cover photo:', error);
    return NextResponse.json(
      { error: 'Failed to update cover photo' },
      { status: 500 }
    );
  }
}
