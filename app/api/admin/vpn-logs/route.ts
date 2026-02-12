// Force dynamic rendering
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { vpnLogs, users } from '@/lib/db/schema';
import { verifyAuth } from '@/lib/auth/verify';
import { desc, sql, eq, and, gte } from 'drizzle-orm';
import { checkRateLimit, getClientIdentifier, createRateLimitResponse, RateLimitConfigs } from '@/lib/security/rate-limit';

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const user = await verifyAuth(request);
    
    if (!user || !user.isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const onlyBlocked = searchParams.get('onlyBlocked') === 'true';
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query conditions
    let conditions: any[] = [];
    
    if (onlyBlocked) {
      conditions.push(eq(vpnLogs.isBlocked, true));
    }

    // Fetch VPN logs with user information
    const logs = await db
      .select({
        id: vpnLogs.id,
        userId: vpnLogs.userId,
        userName: users.name,
        userEmail: users.email,
        userAvatar: users.avatar,
        ipAddress: vpnLogs.ipAddress,
        country: vpnLogs.country,
        countryCode: vpnLogs.countryCode,
        city: vpnLogs.city,
        region: vpnLogs.region,
        isp: vpnLogs.isp,
        organization: vpnLogs.organization,
        asn: vpnLogs.asn,
        isVPN: vpnLogs.isVPN,
        isTor: vpnLogs.isTor,
        isProxy: vpnLogs.isProxy,
        isHosting: vpnLogs.isHosting,
        isAnonymous: vpnLogs.isAnonymous,
        riskScore: vpnLogs.riskScore,
        threatLevel: vpnLogs.threatLevel,
        detectionService: vpnLogs.detectionService,
        isBlocked: vpnLogs.isBlocked,
        blockReason: vpnLogs.blockReason,
        userAgent: vpnLogs.userAgent,
        requestPath: vpnLogs.requestPath,
        requestMethod: vpnLogs.requestMethod,
        detectedAt: vpnLogs.detectedAt,
        createdAt: vpnLogs.createdAt,
      })
      .from(vpnLogs)
      .leftJoin(users, eq(vpnLogs.userId, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(vpnLogs.detectedAt))
      .limit(limit)
      .offset(offset);

    // Get statistics
    const stats = await db
      .select({
        totalLogs: sql<number>`COUNT(*)`,
        totalVPN: sql<number>`SUM(CASE WHEN ${vpnLogs.isVPN} THEN 1 ELSE 0 END)`,
        totalTor: sql<number>`SUM(CASE WHEN ${vpnLogs.isTor} THEN 1 ELSE 0 END)`,
        totalProxy: sql<number>`SUM(CASE WHEN ${vpnLogs.isProxy} THEN 1 ELSE 0 END)`,
        totalHosting: sql<number>`SUM(CASE WHEN ${vpnLogs.isHosting} THEN 1 ELSE 0 END)`,
        totalBlocked: sql<number>`SUM(CASE WHEN ${vpnLogs.isBlocked} THEN 1 ELSE 0 END)`,
        avgRiskScore: sql<number>`AVG(${vpnLogs.riskScore})`,
        criticalThreats: sql<number>`SUM(CASE WHEN ${vpnLogs.threatLevel} = 'critical' THEN 1 ELSE 0 END)`,
        highThreats: sql<number>`SUM(CASE WHEN ${vpnLogs.threatLevel} = 'high' THEN 1 ELSE 0 END)`,
      })
      .from(vpnLogs);

    // Get statistics by detection service
    const serviceStats = await db
      .select({
        service: vpnLogs.detectionService,
        count: sql<number>`COUNT(*)`,
      })
      .from(vpnLogs)
      .groupBy(vpnLogs.detectionService)
      .orderBy(desc(sql<number>`COUNT(*)`));

    // Get statistics by country
    const countryStats = await db
      .select({
        country: vpnLogs.country,
        countryCode: vpnLogs.countryCode,
        count: sql<number>`COUNT(*)`,
        vpnCount: sql<number>`SUM(CASE WHEN ${vpnLogs.isVPN} THEN 1 ELSE 0 END)`,
        blockedCount: sql<number>`SUM(CASE WHEN ${vpnLogs.isBlocked} THEN 1 ELSE 0 END)`,
      })
      .from(vpnLogs)
      .where(sql`${vpnLogs.country} IS NOT NULL`)
      .groupBy(vpnLogs.country, vpnLogs.countryCode)
      .orderBy(desc(sql<number>`COUNT(*)`))
      .limit(20);

    // Get recent high-risk detections (last 24 hours)
    const recentHighRisk = await db
      .select({
        id: vpnLogs.id,
        userId: vpnLogs.userId,
        userName: users.name,
        ipAddress: vpnLogs.ipAddress,
        country: vpnLogs.country,
        isTor: vpnLogs.isTor,
        isVPN: vpnLogs.isVPN,
        riskScore: vpnLogs.riskScore,
        threatLevel: vpnLogs.threatLevel,
        isBlocked: vpnLogs.isBlocked,
        detectedAt: vpnLogs.detectedAt,
      })
      .from(vpnLogs)
      .leftJoin(users, eq(vpnLogs.userId, users.id))
      .where(
        and(
          gte(vpnLogs.detectedAt, new Date(Date.now() - 24 * 60 * 60 * 1000)),
          sql`(${vpnLogs.threatLevel} = 'high' OR ${vpnLogs.threatLevel} = 'critical' OR ${vpnLogs.isTor} = true)`
        )
      )
      .orderBy(desc(vpnLogs.detectedAt))
      .limit(10);

    return NextResponse.json({
      success: true,
      logs: logs || [],
      stats: stats[0] || {
        totalLogs: 0,
        totalVPN: 0,
        totalTor: 0,
        totalProxy: 0,
        totalHosting: 0,
        totalBlocked: 0,
        avgRiskScore: 0,
        criticalThreats: 0,
        highThreats: 0,
      },
      serviceStats: (serviceStats || []).reduce((acc: any, item) => {
        acc[item.service || 'unknown'] = item.count;
        return acc;
      }, {}),
      countryStats: (countryStats || []).reduce((acc: any, item) => {
        acc[item.countryCode || 'unknown'] = {
          country: item.country,
          count: item.count,
          vpnCount: item.vpnCount,
          blockedCount: item.blockedCount,
        };
        return acc;
      }, {}),
      recentHighRisk: recentHighRisk || [],
      pagination: {
        limit,
        offset,
        total: stats[0]?.totalLogs || 0,
      },
    });
  } catch (error) {
    console.error('Error fetching VPN logs:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Log VPN detection (for internal use)
export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const clientId = getClientIdentifier(request);
    const rateLimit = checkRateLimit(clientId, RateLimitConfigs.API);
    
    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit.resetTime);
    }

    const body = await request.json();
    const {
      userId,
      ipAddress,
      country,
      countryCode,
      city,
      region,
      isp,
      organization,
      asn,
      isVPN,
      isTor,
      isProxy,
      isHosting,
      isAnonymous,
      riskScore,
      threatLevel,
      detectionService,
      detectionData,
      isBlocked,
      blockReason,
      userAgent,
      requestPath,
      requestMethod,
    } = body;

    // Insert log
    const [log] = await db
      .insert(vpnLogs)
      .values({
        userId: userId || null,
        ipAddress,
        country,
        countryCode,
        city,
        region,
        isp,
        organization,
        asn,
        isVPN: isVPN || false,
        isTor: isTor || false,
        isProxy: isProxy || false,
        isHosting: isHosting || false,
        isAnonymous: isAnonymous || false,
        riskScore: riskScore || 0,
        threatLevel: threatLevel || 'low',
        detectionService,
        detectionData: detectionData ? JSON.stringify(detectionData) : null,
        isBlocked: isBlocked || false,
        blockReason,
        userAgent,
        requestPath,
        requestMethod,
      })
      .returning();

    return NextResponse.json({
      success: true,
      log,
    });
  } catch (error) {
    console.error('Error logging VPN detection:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
