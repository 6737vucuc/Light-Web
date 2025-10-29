import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { applySecurityHeaders } from './lib/security/headers';
import { WAF, createWAFBlockResponse } from './lib/security/waf';
import { securityMonitor } from './lib/security/monitoring';

export function middleware(request: NextRequest) {
  const startTime = Date.now();

  // 1. WAF Inspection - First line of defense
  const wafResult = WAF.inspect(request);
  
  if (!wafResult.allowed) {
    // Log blocked request
    securityMonitor.trackBlockedRequest(
      wafResult.reason || 'Unknown',
      request.headers.get('x-forwarded-for')?.split(',')[0] || 
      request.headers.get('x-real-ip') || 
      'unknown'
    );

    return createWAFBlockResponse(wafResult.reason || 'Access Denied');
  }

  // 2. Create response
  const response = NextResponse.next();

  // 3. Apply comprehensive security headers
  applySecurityHeaders(response);

  // 4. Add custom security headers
  response.headers.set('X-Powered-By', 'Light of Life');
  response.headers.set('X-Request-ID', crypto.randomUUID());
  response.headers.set('X-Security-Level', 'MILITARY-GRADE');
  response.headers.set('X-WAF-Status', 'ACTIVE');
  response.headers.set('X-Encryption', 'AES-256-GCM');

  // 5. Track request performance
  const responseTime = Date.now() - startTime;
  response.headers.set('X-Response-Time', `${responseTime}ms`);

  // 6. Track request in monitoring system
  securityMonitor.trackRequest(
    undefined,
    request.headers.get('x-forwarded-for')?.split(',')[0] || 
    request.headers.get('x-real-ip') || 
    'unknown',
    responseTime,
    true
  );

  return response;
}

// Configure which routes use this middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
