export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { vpnLogs, users } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth/middleware';
import { eq, desc } from 'drizzle-orm';

// Get VPN logs
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  // Check if user is admin
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, authResult.user.id))
    .limit(1);

  if (!user || !user.isAdmin) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 403 }
    );
  }

  try {
    const logs = await db
      .select({
        id: vpnLogs.id,
        userId: vpnLogs.userId,
        ipAddress: vpnLogs.ipAddress,
        isVpn: vpnLogs.isVpn,
        vpnData: vpnLogs.vpnData,
        createdAt: vpnLogs.createdAt,
      })
      .from(vpnLogs)
      .orderBy(desc(vpnLogs.createdAt))
      .limit(100);

    // Get user details for each log
    const logsWithUsers = await Promise.all(
      logs.map(async (log) => {
        if (log.userId) {
          const [user] = await db
            .select({
              id: users.id,
              name: users.name,
              email: users.email,
            })
            .from(users)
            .where(eq(users.id, log.userId))
            .limit(1);

          return {
            ...log,
            user: user || null,
          };
        }
        return {
          ...log,
          user: null,
        };
      })
    );

    return NextResponse.json({ logs: logsWithUsers });
  } catch (error) {
    console.error('Get VPN logs error:', error);
    return NextResponse.json(
      { error: 'Failed to get VPN logs' },
      { status: 500 }
    );
  }
}

