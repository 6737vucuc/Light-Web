import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { detectVPN, logVPNDetection, shouldBlockVPN, getClientIP } from '@/lib/security/vpn-detector';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const ipAddress = getClientIP(request.headers);
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    // Detect VPN
    const detection = await detectVPN(ipAddress);
    const blocked = shouldBlockVPN(detection);

    // Log detection
    await logVPNDetection(
      session.user.id,
      ipAddress,
      detection,
      userAgent,
      request.nextUrl.pathname,
      request.method,
      blocked,
      blocked ? 'VPN/Proxy detected - Access restricted for privacy and security' : undefined
    );

    // If VPN detected, trigger email notification
    if (blocked) {
      // Send email notification (will be handled by admin dashboard or cron job)
      await fetch(`${request.nextUrl.origin}/api/admin/vpn-alerts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: session.user.id,
          email: session.user.email,
          ipAddress,
          detection,
        }),
      }).catch(err => console.error('Failed to send VPN alert:', err));
    }

    return NextResponse.json({
      blocked,
      detection: {
        isVPN: detection.isVPN,
        isTor: detection.isTor,
        isProxy: detection.isProxy,
        riskScore: detection.riskScore,
        threatLevel: detection.threatLevel,
      },
    });
  } catch (error) {
    console.error('VPN check error:', error);
    return NextResponse.json(
      { error: 'Failed to check VPN status' },
      { status: 500 }
    );
  }
}
