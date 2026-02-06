export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';

export async function GET(request: NextRequest) {
  // Prevent caching for auth status
  const responseHeaders = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  };

  const authResult = await requireAuth(request);
  
  if ('error' in authResult) {
    // Add debug info to help diagnose in Vercel logs
    console.log('Auth failed for user:', {
      error: authResult.error,
      hasAuthToken: !!request.cookies.get('auth_token'),
      hasToken: !!request.cookies.get('token'),
    });

    return NextResponse.json(
      { 
        error: authResult.error,
        debug: {
          hasAuthToken: !!request.cookies.get('auth_token'),
          hasToken: !!request.cookies.get('token'),
        }
      },
      { status: authResult.status, headers: responseHeaders }
    );
  }

  return NextResponse.json(
    { user: authResult.user },
    { headers: responseHeaders }
  );
}

