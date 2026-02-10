// Force dynamic rendering
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, securityLogs as securityLogsTable } from '@/lib/db/schema';
import { verifyAuth } from '@/lib/auth/verify';
import { desc, sql, and, gte } from 'drizzle-orm';
import { checkRateLimit, getClientIdentifier, createRateLimitResponse, RateLimitConfigs } from '@/lib/security/rate-limit';

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const user = await verifyAuth(request);
    
    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '24h';
    const status = searchParams.get('status') || 'all'; // all, locked, failed

    // Calculate time threshold
    let timeThreshold = new Date();
    switch (timeRange) {
      case '1h':
        timeThreshold.setHours(timeThreshold.getHours() - 1);
        break;
      case '24h':
        timeThreshold.setHours(timeThreshold.getHours() - 24);
        break;
      case '7d':
        timeThreshold.setDate(timeThreshold.getDate() - 7);
        break;
      case '30d':
        timeThreshold.setDate(timeThreshold.getDate() - 30);
        break;
      default:
        timeThreshold.setHours(timeThreshold.getHours() - 24);
    }

    // Build query conditions
    let conditions: any[] = [];

    if (status === 'locked') {
      conditions.push(sql`${users.lockedUntil} > NOW()`);
    } else if (status === 'failed') {
      conditions.push(sql`${users.failedLoginAttempts} > 0`);
    }

    // Add time range filter
    conditions.push(gte(users.createdAt, timeThreshold));

    // Fetch security logs from the dedicated table
    const securityLogs = await db
      .select({
        id: securityLogsTable.id,
        userId: securityLogsTable.userId,
        event: securityLogsTable.event,
        ipAddress: securityLogsTable.ipAddress,
        userAgent: securityLogsTable.userAgent,
        location: securityLogsTable.location,
        details: securityLogsTable.details,
        createdAt: securityLogsTable.createdAt,
        userName: users.name,
        userEmail: users.email,
      })
      .from(securityLogsTable)
      .leftJoin(users, sql`${securityLogsTable.userId} = ${users.id}`)
      .where(gte(securityLogsTable.createdAt, timeThreshold))
      .orderBy(desc(securityLogsTable.createdAt))
      .limit(100);

    // Get statistics
    const stats = await db
      .select({
        totalUsers: sql<number>`COUNT(*)`,
        lockedAccounts: sql<number>`SUM(CASE WHEN ${users.lockedUntil} > NOW() THEN 1 ELSE 0 END)`,
        failedAttempts: sql<number>`SUM(CASE WHEN ${users.failedLoginAttempts} > 0 THEN 1 ELSE 0 END)`,
        totalFailedAttempts: sql<number>`SUM(${users.failedLoginAttempts})`,
      })
      .from(users);

    // Get recent locked accounts (last 24 hours)
    const recentLocked = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        lockedUntil: users.lockedUntil,
        failedLoginAttempts: users.failedLoginAttempts,
      })
      .from(users)
      .where(
        and(
          sql`${users.lockedUntil} > NOW()`,
          gte(users.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000))
        )
      )
      .orderBy(desc(users.createdAt))
      .limit(10);

    return NextResponse.json({
      logs: securityLogs,
      stats: stats[0] || {
        totalUsers: 0,
        lockedAccounts: 0,
        failedAttempts: 0,
        totalFailedAttempts: 0,
      },
      recentLocked,
      timeRange,
      status,
    });
  } catch (error) {
    console.error('Error fetching security logs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Unlock user account (admin action)
export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const clientId = getClientIdentifier(request);
    const rateLimit = checkRateLimit(clientId, RateLimitConfigs.API);
    
    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit.resetTime);
    }

    // Verify admin authentication
    const user = await verifyAuth(request);
    
    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Unlock the user account
    await db
      .update(users)
      .set({
        failedLoginAttempts: 0,
        lockedUntil: null,
      })
      .where(sql`${users.id} = ${userId}`);

    console.log(`Admin ${user.email} unlocked account for user ID: ${userId}`);

    return NextResponse.json({
      message: 'Account unlocked successfully',
    });
  } catch (error) {
    console.error('Error unlocking account:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
