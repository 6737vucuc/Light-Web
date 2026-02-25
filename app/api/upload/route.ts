export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Set body size limit for Vercel (Max 4.5MB on free tier, 15MB on Pro)
export const maxDuration = 60; // 60 seconds timeout

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { getSupabaseAdmin } from '@/lib/supabase/client';
import { checkRateLimit, RateLimitConfigs, getClientIdentifier } from '@/lib/security/rate-limit';
import { detectVPN, getClientIP, shouldBlockIP } from '@/lib/security/vpn-detection';
import { ThreatDetection } from '@/lib/security/threat-detection';

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const authResult = await requireAuth(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // 2. RATE LIMITING - Strict for file uploads
    const clientIdentifier = getClientIdentifier(request);
    const rateLimit = checkRateLimit(clientIdentifier, RateLimitConfigs.API);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many upload requests. Please wait before uploading another file.' }, 
        { status: 429 }
      );
    }

    // 3. VPN DETECTION
    const clientIP = getClientIP(request);
    const vpnDetection = await detectVPN(clientIP);
    if (vpnDetection.isSuspicious && shouldBlockIP(vpnDetection)) {
      ThreatDetection.logThreat({
        userId: authResult.userId,
        ipAddress: clientIP,
        threatType: 'vpn_file_upload',
        severity: 'medium',
        description: `VPN/Proxy file upload attempt`,
        timestamp: new Date(),
        blocked: true,
      });
      return NextResponse.json(
        { error: 'VPN/Proxy connections are not allowed for uploading files.' }, 
        { status: 403 }
      );
    }

    // 4. Parse FormData
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // 5. Validate file type - Strict whitelist
    const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/ogg'];
    const allowedAudioTypes = ['audio/mpeg', 'audio/wav', 'audio/webm', 'audio/ogg'];
    
    const allowedTypes = [...allowedImageTypes, ...allowedVideoTypes, ...allowedAudioTypes];

    if (!allowedTypes.includes(file.type)) {
      ThreatDetection.logThreat({
        userId: authResult.userId,
        ipAddress: clientIP,
        threatType: 'invalid_file_type_upload',
        severity: 'low',
        description: `Invalid file type attempted: ${file.type}`,
        timestamp: new Date(),
        blocked: true,
      });
      return NextResponse.json({ 
        error: `Invalid file type (${file.type}). Allowed: images (JPEG, PNG, GIF, WebP), videos (MP4, WebM), audio (MP3, WAV).` 
      }, { status: 400 });
    }

    // 6. Validate file size
    const isVideo = file.type.startsWith('video/');
    const isAudio = file.type.startsWith('audio/');
    const maxImageSize = 5 * 1024 * 1024; // 5MB for images
    const maxVideoSize = 50 * 1024 * 1024; // 50MB for videos
    const maxAudioSize = 20 * 1024 * 1024; // 20MB for audio
    
    let currentLimit = maxImageSize;
    if (isVideo) currentLimit = maxVideoSize;
    else if (isAudio) currentLimit = maxAudioSize;

    if (file.size > currentLimit) {
      return NextResponse.json({ 
        error: `File too large. Maximum size: ${isVideo ? '50MB' : isAudio ? '20MB' : '5MB'}` 
      }, { status: 400 });
    }

    // 7. Validate file name to prevent path traversal
    const fileName = file.name;
    if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
      ThreatDetection.logThreat({
        userId: authResult.userId,
        ipAddress: clientIP,
        threatType: 'path_traversal_upload',
        severity: 'high',
        description: `Path traversal attempt in file name: ${fileName}`,
        timestamp: new Date(),
        blocked: true,
      });
      return NextResponse.json({ error: 'Invalid file name' }, { status: 400 });
    }

    // 8. Convert to Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 9. Initialize Supabase Admin Client
    const supabase = getSupabaseAdmin();
    
    // 10. Determine bucket and path
    const bucketName = 'uploads';
    
    // 11. Generate unique filename with original extension
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(7);
    const originalExtension = file.name.split('.').pop() || (isVideo ? 'mp4' : isAudio ? 'mp3' : 'jpg');
    
    // Sanitize extension to prevent injection
    const sanitizedExtension = originalExtension.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    let folder = 'images';
    if (isVideo) folder = 'videos';
    else if (isAudio) folder = 'audio';
    
    const uploadFileName = `${folder}/${timestamp}-${randomString}.${sanitizedExtension}`;

    // 12. Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(uploadFileName, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      console.error('Supabase storage upload error:', error);
      ThreatDetection.logThreat({
        userId: authResult.userId,
        ipAddress: clientIP,
        threatType: 'upload_storage_error',
        severity: 'low',
        description: `Storage upload failed: ${error.message}`,
        timestamp: new Date(),
        blocked: false,
      });
      return NextResponse.json({ error: `Upload failed: ${error.message}` }, { status: 500 });
    }

    // 13. Get Public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(uploadFileName);

    console.log('File uploaded securely', {
      userId: authResult.userId,
      fileName: uploadFileName,
      size: file.size,
      type: file.type,
      ip: clientIP
    });

    return NextResponse.json({ 
      success: true, 
      url: publicUrl,
      path: uploadFileName,
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
        error: 'File too large for Vercel (Max 4.5MB). Please reduce file size or upgrade Vercel plan.' 
      }, { status: 413 });
    }

    return NextResponse.json({ error: `Upload failed: ${error.message}` }, { status: 500 });
  }
}
