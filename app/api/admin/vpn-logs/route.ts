export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { vpnLogs, users } from '@/lib/db/schema';
import { requireAdmin } from '@/lib/auth/middleware';
import { desc, eq } from 'drizzle-orm';

/**
 * Get VPN detection logs (Admin only)
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request);
  
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const onlyBlocked = searchParams.get('onlyBlocked') === 'true';

    // Build query
    let query = db
      .select()
      .from(vpnLogs)
      .orderBy(desc(vpnLogs.createdAt))
      .limit(Math.min(limit, 1000)); // Max 1000 records

    // Filter for blocked only if requested
    if (onlyBlocked) {
      query = query.where(eq(vpnLogs.wasBlocked, true)) as any;
    }

    const logs = await query;

    // Get statistics
    const allLogs = await db.select().from(vpnLogs);
    const stats = {
      total: allLogs.length,
      blocked: allLogs.filter(log => log.wasBlocked).length,
      vpn: allLogs.filter(log => log.isVPN).length,
      proxy: allLogs.filter(log => log.isProxy).length,
      tor: allLogs.filter(log => log.isTor).length,
      hosting: allLogs.filter(log => log.isHosting).length,
    };

    // Group by service/VPN provider
    const serviceStats: Record<string, number> = {};
    allLogs.forEach(log => {
      if (log.service) {
        serviceStats[log.service] = (serviceStats[log.service] || 0) + 1;
      }
    });

    // Group by country
    const countryStats: Record<string, number> = {};
    allLogs.forEach(log => {
      if (log.country) {
        countryStats[log.country] = (countryStats[log.country] || 0) + 1;
      }
    });

    return NextResponse.json({
      success: true,
      logs,
      stats,
      serviceStats,
      countryStats,
    });
  } catch (error) {
    console.error('Get VPN logs error:', error);
    return NextResponse.json(
      { error: 'Failed to get VPN logs' },
      { status: 500 }
    );
  }
}

/**
 * Delete old VPN logs (Admin only)
 */
export async function DELETE(request: NextRequest) {
  const authResult = await requireAdmin(request);
  
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

    // Delete logs older than specified days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Use Drizzle ORM sql template for raw SQL
    const { sql } = await import('drizzle-orm');
    const result = await db.execute(
      sql`DELETE FROM vpn_logs WHERE created_at < ${cutoffDate}`
    );

    return NextResponse.json({
      success: true,
      message: `Deleted VPN logs older than ${days} days`,
    });
  } catch (error) {
    console.error('Delete VPN logs error:', error);
    return NextResponse.json(
      { error: 'Failed to delete VPN logs' },
      { status: 500 }
    );
  }
}
