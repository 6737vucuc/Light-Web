export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';

// This endpoint is handled by the GET method in /api/webrtc/call
// Redirecting to maintain compatibility
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  // Forward to the main call endpoint
  const callResponse = await fetch(new URL('/api/webrtc/call', request.url), {
    headers: request.headers
  });

  return callResponse;
}
