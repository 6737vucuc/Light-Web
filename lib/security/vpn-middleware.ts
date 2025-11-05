import { NextRequest, NextResponse } from 'next/server';
import { detectVPN, getClientIP, shouldBlockIP, getConnectionTypeDescription, logVPNDetection } from './vpn-detection';

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
    
    // If log only mode, always allow
    if (logOnly) {
      return { allowed: true, result };
    }
    
    // Check blocking rules
    if (blockTor && result.isTor) {
      return {
        allowed: false,
        reason: 'Tor connections are not allowed',
        result,
      };
    }
    
    if (blockVPN && result.isVPN) {
      return {
        allowed: false,
        reason: 'VPN connections are not allowed',
        result,
      };
    }
    
    if (blockProxy && result.isProxy) {
      return {
        allowed: false,
        reason: 'Proxy connections are not allowed',
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
