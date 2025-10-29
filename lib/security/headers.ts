import { NextResponse } from 'next/server';

// Enhanced Security headers configuration
export const SecurityHeaders = {
  // Prevent clickjacking - strongest protection
  'X-Frame-Options': 'DENY',
  
  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',
  
  // Enable XSS protection (legacy but still useful)
  'X-XSS-Protection': '1; mode=block',
  
  // Referrer policy - strictest setting
  'Referrer-Policy': 'no-referrer',
  
  // Permissions policy - deny all dangerous features
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=(), ambient-light-sensor=()',
  
  // Enhanced Content Security Policy
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.pusher.com", // Pusher required
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://sockjs-us2.pusher.com wss://ws-us2.pusher.com https://*.neon.tech", // Pusher + Neon DB
    "media-src 'self' https:",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
    "block-all-mixed-content",
  ].join('; '),
  
  // Strict Transport Security (HTTPS only) - 2 years + preload
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  
  // Remove server information
  'X-Powered-By': 'Light of Life',
};

// Apply security headers to response
export function applySecurityHeaders(response: NextResponse): NextResponse {
  Object.entries(SecurityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  return response;
}

// CORS configuration - restrictive by default
export const CORSHeaders = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGINS || 'https://light-web-project-anwar-kouns-projects.vercel.app',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-Token, X-Request-ID',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '86400',
};

// Apply CORS headers
export function applyCORSHeaders(response: NextResponse): NextResponse {
  Object.entries(CORSHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  return response;
}
