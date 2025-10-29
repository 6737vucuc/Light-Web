import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { applySecurityHeaders } from './lib/security/headers';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Apply security headers
  applySecurityHeaders(response);

  // Add custom headers
  response.headers.set('X-Powered-By', 'Light of Life');
  response.headers.set('X-Request-ID', crypto.randomUUID());

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
