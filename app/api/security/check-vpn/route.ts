import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/verify';
import { detectVPN, logVPNDetection, shouldBlockVPN, getClientIP } from '@/lib/security/vpn-detector';

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    
    if (!user) {
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
      user.userId,
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
      try {
        console.log('Sending VPN alert email to:', user.email);
        const emailResponse = await fetch(`${request.nextUrl.origin}/api/admin/vpn-alerts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.userId,
            email: user.email,
            ipAddress,
            detection,
          }),
        });
        
        const emailResult = await emailResponse.json();
        if (emailResponse.ok) {
          console.log('VPN alert email sent successfully:', emailResult);
        } else {
          console.error('Failed to send VPN alert email:', emailResult);
        }
      } catch (err) {
        console.error('Error sending VPN alert:', err);
      }
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
