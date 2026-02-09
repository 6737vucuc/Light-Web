export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { trustedDevices, securityLogs } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth/middleware';
import { eq, and, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    // Fetch trusted devices
    const devices = await db.query.trustedDevices.findMany({
      where: eq(trustedDevices.userId, authResult.user.id),
      orderBy: [desc(trustedDevices.lastUsed)],
    });

    // Fetch recent security logs
    const logs = await db.query.securityLogs.findMany({
      where: eq(securityLogs.userId, authResult.user.id),
      orderBy: [desc(securityLogs.createdAt)],
      limit: 20,
    });

    return NextResponse.json({
      devices,
      logs,
    });
  } catch (error) {
    console.error('Error fetching security data:', error);
    return NextResponse.json({ error: 'Failed to fetch security data' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const authResult = await requireAuth(request);
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const { deviceId } = await request.json();
    if (!deviceId) {
      return NextResponse.json({ error: 'Device ID is required' }, { status: 400 });
    }

    // Delete the trusted device
    await db
      .delete(trustedDevices)
      .where(
        and(
          eq(trustedDevices.userId, authResult.user.id),
          eq(trustedDevices.id, parseInt(deviceId))
        )
      );

    // Log the action
    await db.insert(securityLogs).values({
      userId: authResult.user.id,
      event: 'device_untrusted',
      details: { deviceId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting trusted device:', error);
    return NextResponse.json({ error: 'Failed to delete device' }, { status: 500 });
  }
}
