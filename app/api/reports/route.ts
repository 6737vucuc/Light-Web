import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { reports } from '@/lib/db/schema';
import { verifyAuth } from '@/lib/auth/verify';
import { checkRateLimit, RateLimitConfigs, getClientIdentifier } from '@/lib/security/rate-limit';
import { detectVPN, getClientIP, shouldBlockIP } from '@/lib/security/vpn-detection';
import { ThreatDetection } from '@/lib/security/threat-detection';
import { InputValidator } from '@/lib/security/input-validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Create a new report
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. RATE LIMITING - Strict for report submissions
    const clientIdentifier = getClientIdentifier(request);
    const rateLimit = checkRateLimit(clientIdentifier, RateLimitConfigs.API);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many reports. Please wait before submitting another report.' }, 
        { status: 429 }
      );
    }

    // 2. VPN DETECTION
    const clientIP = getClientIP(request);
    const vpnDetection = await detectVPN(clientIP);
    if (vpnDetection.isSuspicious && shouldBlockIP(vpnDetection)) {
      ThreatDetection.logThreat({
        userId: user.userId,
        ipAddress: clientIP,
        threatType: 'vpn_report_submission',
        severity: 'medium',
        description: `VPN/Proxy report submission attempt`,
        timestamp: new Date(),
        blocked: true,
      });
      return NextResponse.json(
        { error: 'VPN/Proxy connections are not allowed for submitting reports.' }, 
        { status: 403 }
      );
    }

    // 3. THREAT DETECTION - Check for bot-like behavior
    const userAgent = request.headers.get('user-agent') || '';
    if (ThreatDetection.detectBot(userAgent, {})) {
      ThreatDetection.logThreat({
        userId: user.userId,
        ipAddress: clientIP,
        threatType: 'bot_report_activity',
        severity: 'low',
        description: `Bot-like report submission activity detected`,
        timestamp: new Date(),
        blocked: false,
      });
    }

    const body = await request.json();
    const { reportedUserId, messageId, groupId, reason } = body;

    // 4. INPUT VALIDATION
    if (!reportedUserId || !reason) {
      return NextResponse.json(
        { error: 'Reported user and reason are required' },
        { status: 400 }
      );
    }

    if (!InputValidator.isValidContent(reason, 1000)) {
      return NextResponse.json(
        { error: 'Report reason is too long' },
        { status: 400 }
      );
    }

    if (InputValidator.containsMaliciousPattern(reason)) {
      ThreatDetection.logThreat({
        userId: user.userId,
        ipAddress: clientIP,
        threatType: 'malicious_report_content',
        severity: 'medium',
        description: `Malicious pattern detected in report reason`,
        timestamp: new Date(),
        blocked: true,
      });
      return NextResponse.json(
        { error: 'Report contains invalid content' },
        { status: 400 }
      );
    }

    // 5. Prevent self-reporting
    if (parseInt(reportedUserId) === user.userId) {
      return NextResponse.json(
        { error: 'Cannot report yourself' },
        { status: 400 }
      );
    }

    // 6. Check for duplicate reports from same user in last 24 hours
    const existingReport = await db.query.reports.findFirst({
      where: (reports, { eq, and, gt }) => and(
        eq(reports.reporterId, user.userId),
        eq(reports.reportedUserId, parseInt(reportedUserId)),
        gt(reports.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000))
      )
    });

    if (existingReport) {
      return NextResponse.json(
        { error: 'You have already reported this user in the last 24 hours' },
        { status: 400 }
      );
    }

    // 7. Create report
    const [report] = await db.insert(reports).values({
      reporterId: user.userId,
      reportedUserId: parseInt(reportedUserId),
      messageId: messageId || null,
      groupId: groupId || null,
      reason: reason.trim(),
      status: 'pending',
    }).returning();

    console.log('Report submitted securely', {
      reporterId: user.userId,
      reportedUserId: parseInt(reportedUserId),
      ip: clientIP
    });

    return NextResponse.json({
      message: 'Report submitted successfully. Thank you for helping keep our community safe.',
      report,
    });
  } catch (error) {
    console.error('Report creation error:', error);
    return NextResponse.json(
      { error: 'Failed to submit report' },
      { status: 500 }
    );
  }
}

// Get all reports (admin only)
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. RATE LIMITING - For admin report viewing
    const clientIdentifier = getClientIdentifier(request);
    const rateLimit = checkRateLimit(clientIdentifier, RateLimitConfigs.API);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    // 2. VPN DETECTION - Even admins should not use VPN for sensitive operations
    const clientIP = getClientIP(request);
    const vpnDetection = await detectVPN(clientIP);
    if (vpnDetection.isSuspicious && shouldBlockIP(vpnDetection)) {
      ThreatDetection.logThreat({
        userId: user.userId,
        ipAddress: clientIP,
        threatType: 'vpn_admin_report_access',
        severity: 'high',
        description: `VPN/Proxy admin report access attempt`,
        timestamp: new Date(),
        blocked: true,
      });
      return NextResponse.json(
        { error: 'VPN/Proxy connections are not allowed for admin operations.' }, 
        { status: 403 }
      );
    }

    const allReports = await db.query.reports.findMany({
      with: {
        reporter: {
          columns: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
        reportedUser: {
          columns: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
      orderBy: (reports, { desc }) => [desc(reports.createdAt)],
    });

    return NextResponse.json({ reports: allReports });
  } catch (error) {
    console.error('Get reports error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
      { status: 500 }
    );
  }
}
