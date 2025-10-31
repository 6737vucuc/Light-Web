import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Security Headers Configuration
const securityHeaders = [
  // Prevent XSS attacks
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  // Prevent clickjacking
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  // Prevent MIME type sniffing
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  // Referrer Policy
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  // Permissions Policy
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()'
  },
  // Content Security Policy
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net https://js.pusher.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: https: blob:",
      "font-src 'self' data: https://fonts.gstatic.com",
      "connect-src 'self' https: wss:",
      "media-src 'self' https: blob:",
      "object-src 'none'",
      "frame-ancestors 'self'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests"
    ].join('; ')
  },
  // Strict Transport Security (HSTS)
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  }
];

// Rate Limiting Configuration
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // max requests per window
  apiWindowMs: 60 * 1000, // 1 minute for API
  apiMaxRequests: 30 // max API requests per window
};

function getRateLimitKey(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : request.ip || 'unknown';
  return `${ip}-${request.nextUrl.pathname}`;
}

function checkRateLimit(key: string, isApi: boolean = false): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(key);
  
  const windowMs = isApi ? RATE_LIMIT.apiWindowMs : RATE_LIMIT.windowMs;
  const maxRequests = isApi ? RATE_LIMIT.apiMaxRequests : RATE_LIMIT.maxRequests;

  if (!limit || now > limit.resetTime) {
    rateLimitMap.set(key, {
      count: 1,
      resetTime: now + windowMs
    });
    return true;
  }

  if (limit.count >= maxRequests) {
    return false;
  }

  limit.count++;
  return true;
}

// Clean up old rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Apply security headers
  securityHeaders.forEach(({ key, value }) => {
    response.headers.set(key, value);
  });

  // Rate limiting
  const isApiRoute = request.nextUrl.pathname.startsWith('/api');
  const rateLimitKey = getRateLimitKey(request);
  
  if (!checkRateLimit(rateLimitKey, isApiRoute)) {
    return new NextResponse(
      JSON.stringify({
        error: 'Too many requests',
        message: 'You have exceeded the rate limit. Please try again later.'
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '60'
        }
      }
    );
  }

  // Additional API security
  if (isApiRoute) {
    // Check for suspicious patterns in URLs
    const suspiciousPatterns = [
      /(\.\.|\/\/)/,  // Path traversal
      /<script/i,      // XSS attempt
      /union.*select/i, // SQL injection
      /exec\(/i,       // Code injection
      /eval\(/i        // Code injection
    ];

    const url = request.nextUrl.pathname + request.nextUrl.search;
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(url)) {
        return new NextResponse(
          JSON.stringify({
            error: 'Forbidden',
            message: 'Suspicious request detected'
          }),
          {
            status: 403,
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
      }
    }

    // Validate Content-Type for POST/PUT/PATCH requests
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      const contentType = request.headers.get('content-type');
      if (contentType && !contentType.includes('application/json') && !contentType.includes('multipart/form-data')) {
        return new NextResponse(
          JSON.stringify({
            error: 'Invalid Content-Type',
            message: 'Only application/json and multipart/form-data are allowed'
          }),
          {
            status: 415,
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
      }
    }
  }

  // CSRF Protection for state-changing requests
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method) && isApiRoute) {
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');
    
    // Allow requests from same origin
    if (origin && host) {
      const originHost = new URL(origin).host;
      if (originHost !== host) {
        return new NextResponse(
          JSON.stringify({
            error: 'CSRF Protection',
            message: 'Cross-origin request blocked'
          }),
          {
            status: 403,
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
      }
    }
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
