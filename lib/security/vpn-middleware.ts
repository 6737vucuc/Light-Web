import { NextRequest, NextResponse } from 'next/server';
import { detectVPN, getClientIP, shouldBlockIP, getConnectionTypeDescription, logVPNDetection } from './vpn-detection';
import { db } from '@/lib/db';
import { vpnLogs } from '@/lib/db/schema';

/**
 * Middleware to check for VPN/Proxy on sensitive operations
 * 
 * Usage: Call this before allowing registration, login, or sensitive actions
 */
export async function checkVPNMiddleware(
  request: NextRequest,
  options: {
    blockVPN?: boolean;
    blockProxy?: boolean;
    blockTor?: boolean;
    logOnly?: boolean;
  } = {}
): Promise<{ allowed: boolean; reason?: string; result?: any }> {
  const {
    blockVPN = false,
    blockProxy = false,
    blockTor = true, // Always block Tor by default
    logOnly = false,
  } = options;

  try {
    // Get client IP
    const clientIP = getClientIP(request);
    
    // Detect VPN/Proxy
    const result = await detectVPN(clientIP);
    
    // Log detection
    logVPNDetection(null, result, 'middleware-check');
    
    // Save to database
    try {
      await db.insert(vpnLogs).values({
        ip: clientIP,
        action: 'access',
        isVPN: result.isVPN,
        isProxy: result.isProxy,
        isTor: result.isTor,
        isHosting: result.isHosting,
        connectionType: getConnectionTypeDescription(result),
        country: result.country,
        city: result.city,
        org: result.org,
        service: result.service,
        wasBlocked: false,
        blockReason: null,
      });
    } catch (dbError) {
      console.error('Failed to log VPN detection to database:', dbError);
    }
    
    // If log only mode, always allow
    if (logOnly) {
      return { allowed: true, result };
    }
    
    // Check blocking rules
    let blocked = false;
    let blockReason = null;
    
    if (blockTor && result.isTor) {
      blocked = true;
      blockReason = 'Tor connections are not allowed';
    } else if (blockVPN && result.isVPN) {
      blocked = true;
      blockReason = 'VPN connections are not allowed';
    } else if (blockProxy && result.isProxy) {
      blocked = true;
      blockReason = 'Proxy connections are not allowed';
    }
    
    // Update database with block status
    if (blocked) {
      try {
        await db.insert(vpnLogs).values({
          ip: clientIP,
          action: 'blocked',
          isVPN: result.isVPN,
          isProxy: result.isProxy,
          isTor: result.isTor,
          isHosting: result.isHosting,
          connectionType: getConnectionTypeDescription(result),
          country: result.country,
          city: result.city,
          org: result.org,
          service: result.service,
          wasBlocked: true,
          blockReason,
        });
      } catch (dbError) {
        console.error('Failed to log blocked VPN to database:', dbError);
      }
      
      return {
        allowed: false,
        reason: blockReason,
        result,
      };
    }
    
    return { allowed: true, result };
  } catch (error) {
    console.error('VPN middleware error:', error);
    // On error, allow the request to proceed (fail open)
    return { allowed: true };
  }
}

/**
 * Create a response for blocked VPN/Proxy
 */
export function createVPNBlockedResponse(reason: string): NextResponse {
  return NextResponse.json(
    {
      error: 'Connection Blocked',
      message: reason,
      details: 'Your connection appears to be using a VPN, proxy, or Tor. Please disable it and try again.',
    },
    { status: 403 }
  );
}
