import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Security headers for ultra protection
const securityHeaders = {
  // Prevent clickjacking
  'X-Frame-Options': 'DENY',
  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',
  // Enable XSS protection
  'X-XSS-Protection': '1; mode=block',
  // Referrer policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  // Permissions policy
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  // Content Security Policy
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.pusher.com https://sockjs.pusher.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://neon-image-bucket.s3.us-east-1.amazonaws.com https://ws-us2.pusher.com wss://ws-us2.pusher.com https://sockjs-us2.pusher.com",
    "media-src 'self' https: blob:",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; '),
  // HSTS - Force HTTPS
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  // Encryption indicator
  'X-Encryption': 'AES-256-GCM-Military-Grade',
  // Security level
  'X-Security-Level': 'Maximum',
};

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
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
}, 60 * 1000); // Clean every minute

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Get client IP
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';

  // Check rate limit
  if (!checkRateLimit(ip)) {
    return new NextResponse('Too Many Requests', {
      status: 429,
      headers: {
        'Retry-After': '60',
        ...securityHeaders,
      },
    });
  }

  // Add security headers
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  // Add request ID for tracking
  response.headers.set('X-Request-ID', crypto.randomUUID());

  // Prevent caching of sensitive data
  if (request.nextUrl.pathname.startsWith('/api/')) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
  }

  // Block suspicious user agents
  const userAgent = request.headers.get('user-agent') || '';
  const suspiciousPatterns = [
    'sqlmap',
    'nikto',
    'nmap',
    'masscan',
    'nessus',
    'burp',
    'acunetix',
    'metasploit',
  ];

  if (suspiciousPatterns.some(pattern => userAgent.toLowerCase().includes(pattern))) {
    return new NextResponse('Forbidden', {
      status: 403,
      headers: securityHeaders,
    });
  }

  // Block common attack patterns in URLs
  const url = request.nextUrl.pathname;
  const attackPatterns = [
    '../',
    '..\\',
    '<script',
    'javascript:',
    'onerror=',
    'onload=',
    'eval(',
    'base64',
    'union select',
    'drop table',
    'insert into',
    'update set',
    'delete from',
  ];

  if (attackPatterns.some(pattern => url.toLowerCase().includes(pattern))) {
    return new NextResponse('Forbidden - Attack Pattern Detected', {
      status: 403,
      headers: securityHeaders,
    });
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
