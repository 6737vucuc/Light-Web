export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Set body size limit for Vercel (Max 4.5MB on free tier, 15MB on Pro)
export const maxDuration = 60; // 60 seconds timeout

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { getSupabaseAdmin } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  // 1. Authenticate user
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    // 2. Parse FormData
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // 3. Validate file type
    const allowedTypes = [
      // Images
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      // Videos
      'video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov', 'video/quicktime',
      'video/x-msvideo', 'video/x-matroska'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: `Invalid file type (${file.type}). Allowed: images and videos.` 
      }, { status: 400 });
    }

    // 4. Validate file size
    // Vercel Serverless Functions have a 4.5MB payload limit on Hobby plan.
    const maxSize = 500 * 1024 * 1024; // 500MB (Internal limit)
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large. Maximum size: 500MB' }, { status: 400 });
    }

    // 5. Convert to Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 6. Initialize Supabase Admin Client
    const supabase = getSupabaseAdmin();
    
    // 7. Determine bucket and path
    // Using 'uploads' bucket as requested by user
    const bucketName = 'uploads';
    const isVideo = file.type.startsWith('video/');
    
    // 8. Generate unique filename with original extension
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const originalExtension = file.name.split('.').pop() || (isVideo ? 'mp4' : 'jpg');
    const folder = isVideo ? 'videos' : 'images';
    const fileName = `${folder}/${timestamp}-${randomString}.${originalExtension}`;

    // 9. Upload to Supabase Storage (Bucket: uploads)
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: true // Allow overwriting if name clashes
      });

    if (error) {
      console.error('Supabase storage upload error:', error);
      // If bucket doesn't exist, this will show in error.message
      return NextResponse.json({ error: `Supabase Storage error: ${error.message}` }, { status: 500 });
    }

    // 10. Get Public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);

    return NextResponse.json({ 
      success: true, 
      url: publicUrl,
      path: fileName,
      filename: file.name,
      type: file.type,
      size: file.size,
      bucket: bucketName
    });
  } catch (error: any) {
    console.error('Upload API error:', error);
    
    // Check for Vercel payload limit error
    if (error.message?.includes('413') || error.name === 'PayloadTooLargeError') {
      return NextResponse.json({ 
        error: 'File too large for Vercel (Max 4.5MB). For larger videos, please use a YouTube/Vimeo link or upgrade Vercel plan.' 
      }, { status: 413 });
    }

    return NextResponse.json({ error: `Upload failed: ${error.message}` }, { status: 500 });
  }
}
