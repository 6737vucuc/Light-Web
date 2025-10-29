import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { db } from '@/lib/db';
import { vpnLogs, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request);
  
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const result = await db
      .select({
        id: vpnLogs.id,
        ipAddress: vpnLogs.ipAddress,
        isVPN: vpnLogs.isVpn,
        country: vpnLogs.vpnData,
        action: vpnLogs.vpnData,
        createdAt: vpnLogs.createdAt,
        userName: users.name,
        userEmail: users.email,
      })
      .from(vpnLogs)
      .leftJoin(users, eq(vpnLogs.userId, users.id))
      .orderBy(vpnLogs.createdAt);

    return NextResponse.json({ 
      logs: result,
      success: true 
    });
  } catch (error) {
    console.error('Fetch VPN logs error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch VPN logs' },
      { status: 500 }
    );
  }
}
