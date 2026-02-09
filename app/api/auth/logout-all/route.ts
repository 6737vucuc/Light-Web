export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, trustedDevices, securityLogs } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth/middleware';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const userId = authResult.user.id;

    // 1. Remove all trusted devices for this user
    await db
      .delete(trustedDevices)
      .where(eq(trustedDevices.userId, userId));

    // 2. Log the global logout event
    await db.insert(securityLogs).values({
      userId,
      event: 'global_logout',
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      details: { action: 'revoked_all_devices' }
    });

    // 3. Update user status
    await db
      .update(users)
      .set({ isOnline: false })
      .where(eq(users.id, userId));

    // 4. Create response and clear current cookies
    const response = NextResponse.json({ 
      success: true, 
      message: 'Logged out from all devices and revoked all trusted sessions.' 
    });

    // Clear cookies
    const authCookieNames = ['token', 'auth_token', 'session'];
    authCookieNames.forEach(name => {
      response.cookies.set(name, '', { maxAge: 0, path: '/' });
    });

    // Header to clear site data
    response.headers.set('Clear-Site-Data', '"cookies", "storage", "cache"');

    return response;
  } catch (error) {
    console.error('Global logout error:', error);
    return NextResponse.json({ error: 'Failed to perform global logout' }, { status: 500 });
  }
}
