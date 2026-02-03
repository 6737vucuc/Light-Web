export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { getSupabaseAdmin } from '@/lib/supabase/client';

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

    // Initialize Supabase Admin Client
    const supabase = getSupabaseAdmin();
    
    // Determine bucket and path
    const isVideo = file.type.startsWith('video/');
    const bucketName = 'uploads'; // Using a single bucket named 'uploads'
    
    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const extension = file.name.split('.').pop();
    const folder = isVideo ? 'videos' : 'images';
    const fileName = `${folder}/${timestamp}-${randomString}.${extension}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true
      });

    if (error) {
      console.error('Supabase storage upload error:', error);
      return NextResponse.json({ error: 'Failed to upload to storage' }, { status: 500 });
    }

    // Get Public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);

    return NextResponse.json({ 
      success: true, 
      url: publicUrl,
      filename: file.name,
      type: file.type,
      size: file.size,
      storage: 'supabase'
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
