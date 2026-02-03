export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Set body size limit for Vercel (Max 4.5MB on free tier, 15MB on Pro)
// Note: This is a hint for Vercel, but the hard limit is still enforced by their infrastructure.
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
    // If the file is larger than this, the request will fail before reaching this code.
    const maxSize = 500 * 1024 * 1024; // 500MB (Internal limit, but Vercel limit will hit first)
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large. Maximum size: 500MB' }, { status: 400 });
    }

    // 5. Convert to Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 6. Initialize Supabase Admin Client
    const supabase = getSupabaseAdmin();
    
    // 7. Determine bucket and path
    const isVideo = file.type.startsWith('video/');
    const bucketName = 'uploads';
    
    // 8. Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const extension = file.name.split('.').pop() || (isVideo ? 'mp4' : 'jpg');
    const folder = isVideo ? 'videos' : 'images';
    const fileName = `${folder}/${timestamp}-${randomString}.${extension}`;

    // 9. Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Supabase storage upload error:', error);
      return NextResponse.json({ error: `Storage error: ${error.message}` }, { status: 500 });
    }

    // 10. Get Public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);

    return NextResponse.json({ 
      success: true, 
      url: publicUrl,
      filename: file.name,
      type: file.type,
      size: file.size
    });
  } catch (error: any) {
    console.error('Upload API error:', error);
    
    // Check if it's a size limit error from Vercel
    if (error.message?.includes('PAYLOAD_TOO_LARGE')) {
      return NextResponse.json({ 
        error: 'File too large for Vercel (Max 4.5MB). Please use a smaller file or upload to YouTube/Vimeo and use the link.' 
      }, { status: 413 });
    }

    return NextResponse.json({ error: `Upload failed: ${error.message}` }, { status: 500 });
  }
}
