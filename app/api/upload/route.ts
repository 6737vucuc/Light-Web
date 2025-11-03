export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { uploadToCloudinary, uploadVideoToCloudinary } from '@/lib/cloudinary/config';

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      // Images
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      // Videos
      'video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov', 'video/quicktime',
      'video/x-msvideo', 'video/x-matroska'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Allowed: images (jpg, png, gif, webp, svg) and videos (mp4, webm, ogg, avi, mov, mkv)' 
      }, { status: 400 });
    }

    // Validate file size (50MB max)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large. Maximum size: 50MB' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Check if Cloudinary is configured
    const useCloudinary = process.env.CLOUDINARY_CLOUD_NAME && 
                          process.env.CLOUDINARY_API_KEY && 
                          process.env.CLOUDINARY_API_SECRET;

    let url: string;
    let publicId: string | undefined;

    if (useCloudinary) {
      // Upload to Cloudinary
      try {
        const isVideo = file.type.startsWith('video/');
        
        // Convert buffer to base64 data URI
        const base64 = buffer.toString('base64');
        const dataUri = `data:${file.type};base64,${base64}`;
        
        if (isVideo) {
          const result = await uploadVideoToCloudinary(dataUri, 'light-of-life/videos');
          url = result.url;
          publicId = result.publicId;
        } else {
          const result = await uploadToCloudinary(dataUri, 'light-of-life/images');
          url = result.url;
          publicId = result.publicId;
        }
      } catch (cloudinaryError) {
        console.error('Cloudinary upload failed, falling back to local storage:', cloudinaryError);
        // Fallback to local storage if Cloudinary fails
        url = await saveLocally(buffer, file.name);
      }
    } else {
      // Fallback to local storage if Cloudinary is not configured
      url = await saveLocally(buffer, file.name);
    }

    return NextResponse.json({ 
      success: true, 
      url,
      publicId,
      filename: file.name,
      type: file.type,
      size: file.size,
      storage: useCloudinary ? 'cloudinary' : 'local'
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}

// Helper function to save file locally
async function saveLocally(buffer: Buffer, originalName: string): Promise<string> {
  const { writeFile, mkdir } = await import('fs/promises');
  const { join } = await import('path');
  
  // Create uploads directory if it doesn't exist
  const uploadsDir = join(process.cwd(), 'public', 'uploads');
  try {
    await mkdir(uploadsDir, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }

  // Generate unique filename
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(7);
  const extension = originalName.split('.').pop();
  const filename = `${timestamp}-${randomString}.${extension}`;
  const filepath = join(uploadsDir, filename);

  // Save file
  await writeFile(filepath, buffer);

  // Return public URL
  return `/uploads/${filename}`;
}
