export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { detectVPN, getClientIP, shouldBlockIP, getConnectionTypeDescription } from '@/lib/security/vpn-detection';
import { requireAuth } from '@/lib/auth/middleware';

/**
 * Check if current connection is using VPN/Proxy
 */
export async function GET(request: NextRequest) {
  try {
    // Get client IP
    const clientIP = getClientIP(request);
    
    // Detect VPN/Proxy
    const result = await detectVPN(clientIP);
    
    // Get user info if authenticated
    const authResult = await requireAuth(request);
    const userId = 'error' in authResult ? null : authResult.user.id;
    
    // Log if suspicious
    if (result.isSuspicious) {
      console.warn('VPN/Proxy detected:', {
        userId,
        ip: clientIP,
        type: getConnectionTypeDescription(result),
        country: result.country,
        city: result.city,
      });
    }
    
    return NextResponse.json({
      success: true,
      ip: result.ip,
      isVPN: result.isVPN,
      isProxy: result.isProxy,
      isTor: result.isTor,
      isHosting: result.isHosting,
      isSuspicious: result.isSuspicious,
      shouldBlock: shouldBlockIP(result),
      connectionType: getConnectionTypeDescription(result),
      location: {
        country: result.country,
        city: result.city,
      },
      org: result.org,
      service: result.service,
    });
  } catch (error) {
    console.error('VPN check error:', error);
    return NextResponse.json(
      { error: 'Failed to check VPN status' },
      { status: 500 }
    );
  }
}
