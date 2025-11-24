import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { applySecurityHeaders } from './lib/security/headers';
import { WAF, createWAFBlockResponse } from './lib/security/waf';
import { securityMonitor } from './lib/security/monitoring';

// Rate limiting storage (in-memory, use Redis in production)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// Rate limit configuration
const RATE_LIMIT = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // max requests per window
};

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, {
      count: 1,
      resetTime: now + RATE_LIMIT.windowMs,
    });
    return true;
  }

  if (record.count >= RATE_LIMIT.maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

// Clean up old rate limit records
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of rateLimitMap.entries()) {
      if (now > record.resetTime) {
        rateLimitMap.delete(ip);
      }
    }
  }, 60 * 1000); // Clean every minute
}

export function proxy(request: NextRequest) {
  const startTime = Date.now();

  // Get client IP
  const ip = request.ip || 
    request.headers.get('x-forwarded-for')?.split(',')[0] || 
    request.headers.get('x-real-ip') || 
    'unknown';

  // 1. Rate Limiting - Check before WAF
  if (!checkRateLimit(ip)) {
    securityMonitor.trackBlockedRequest('Rate Limit Exceeded', ip);
    return new NextResponse('Too Many Requests', {
      status: 429,
      headers: {
        'Retry-After': '60',
        'X-Rate-Limit-Exceeded': 'true',
      },
    });
  }

  // 2. WAF Inspection - First line of defense
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

  // 3. Create response
  const response = NextResponse.next();

  // 4. Apply comprehensive security headers
  applySecurityHeaders(response);

  // 5. Add custom security headers
  response.headers.set('X-Powered-By', 'Light of Life');
  response.headers.set('X-Request-ID', crypto.randomUUID());
  response.headers.set('X-Security-Level', 'MILITARY-GRADE');
  response.headers.set('X-WAF-Status', 'ACTIVE');
  response.headers.set('X-Encryption', 'AES-256-GCM');
  
  // Prevent caching of sensitive data
  if (request.nextUrl.pathname.startsWith('/api/')) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
  }

  // 6. Track request performance
  const responseTime = Date.now() - startTime;
  response.headers.set('X-Response-Time', `${responseTime}ms`);

  // 7. Track request in monitoring system
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
