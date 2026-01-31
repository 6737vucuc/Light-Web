import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n';
import { applySecurityHeaders } from './lib/security/headers';
import { WAF, createWAFBlockResponse } from './lib/security/waf';
import { securityMonitor } from './lib/security/monitoring';

// Create the i18n middleware
const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always'
});

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

export async function proxy(request: NextRequest) {
  const startTime = Date.now();

  // Get client IP
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
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

  // 3. Apply i18n middleware (internationalization)
  const intlResponse = await intlMiddleware(request);
  
  // 4. Apply comprehensive security headers
  applySecurityHeaders(intlResponse);

  // 5. Add custom security headers
  intlResponse.headers.set('X-Powered-By', 'Light of Life');
  intlResponse.headers.set('X-Request-ID', crypto.randomUUID());
  intlResponse.headers.set('X-Security-Level', 'MILITARY-GRADE');
  intlResponse.headers.set('X-WAF-Status', 'ACTIVE');
  intlResponse.headers.set('X-Encryption', 'AES-256-GCM');
  
  // Prevent caching of sensitive data
  if (request.nextUrl.pathname.startsWith('/api/')) {
    intlResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    intlResponse.headers.set('Pragma', 'no-cache');
    intlResponse.headers.set('Expires', '0');
  }

  // 6. Track request performance
  const responseTime = Date.now() - startTime;
  intlResponse.headers.set('X-Response-Time', `${responseTime}ms`);

  // 7. Track request in monitoring system
  securityMonitor.trackRequest(
    undefined,
    request.headers.get('x-forwarded-for')?.split(',')[0] || 
    request.headers.get('x-real-ip') || 
    'unknown',
    responseTime,
    true
  );

  return intlResponse;
}

// Configure which routes use this middleware
export const config = {
  matcher: [
    // Match all pathnames except for
    // - … if they start with `/api`, `/_next` or `/_vercel`
    // - … static files (images, fonts, etc.)
    '/((?!api|_next|_vercel|.*\\..*).*)',
  ],
};
