export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth/middleware';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  
  if ('error' in authResult) {
    // Already logged out or invalid token
    // Still clear cookies to ensure complete logout
    const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
    clearAllAuthData(response, request);
    return response;
  }

  try {
    // Update last seen before logout
    await db
      .update(users)
      .set({ 
        lastSeen: new Date(),
        isOnline: false, // Mark user as offline
      })
      .where(eq(users.id, authResult.user.id));

    // Create response
    const response = NextResponse.json({ 
      success: true,
      message: 'Logged out successfully. All sessions have been cleared.',
    });

    // Clear all authentication data
    clearAllAuthData(response, request);

    console.log(`User ${authResult.user.email} logged out successfully`);

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    
    // Even if there's an error, still try to clear cookies
    const response = NextResponse.json({ 
      success: true, // Return success to allow logout on client side
      message: 'Logged out (with warnings)',
    }, { status: 200 });
    
    clearAllAuthData(response, request);
    
    return response;
  }
}

/**
 * Clear all authentication data including tokens and cookies
 */
function clearAllAuthData(response: NextResponse, request: NextRequest) {
  const host = request.headers.get('host');
  const isVercel = host?.includes('vercel.app') || host?.includes('light-web-project.vercel.app');

  // List of all possible cookie names used for authentication
  const authCookieNames = [
    'token',
    'auth_token',
    'session',
    'session_token',
    'jwt',
    'access_token',
    'refresh_token',
  ];

  // Clear all authentication cookies with multiple configurations to ensure complete removal
  authCookieNames.forEach(cookieName => {
    // Clear with default settings
    response.cookies.set(cookieName, '', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 0, // Expire immediately
      path: '/',
    });

    // Clear with domain for Vercel
    if (isVercel) {
      response.cookies.set(cookieName, '', {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 0,
        path: '/',
        domain: 'light-web-project.vercel.app',
      });
    }

    // Clear with strict sameSite
    response.cookies.set(cookieName, '', {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 0,
      path: '/',
    });

    // Clear without httpOnly (for any client-side cookies)
    response.cookies.set(cookieName, '', {
      httpOnly: false,
      secure: true,
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });
  });

  // Add headers to clear any cached authentication
  response.headers.set('Clear-Site-Data', '"cookies", "storage", "cache"');
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
}
