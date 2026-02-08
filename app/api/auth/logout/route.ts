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
    return NextResponse.json({ success: true });
  }

  try {
    // Update last seen before logout
    await db
      .update(users)
      .set({ lastSeen: new Date() })
      .where(eq(users.id, authResult.user.id));

    // Clear the auth cookie
    const response = NextResponse.json({ success: true });
    const host = request.headers.get('host');
    const isVercel = host?.includes('vercel.app') || host?.includes('light-web-project.vercel.app');

    // Clear both possible token names just in case
    ['token', 'auth_token'].forEach(cookieName => {
      response.cookies.set(cookieName, '', {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 0, // Expire immediately
        path: '/',
      });
    });

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 });
  }
}

