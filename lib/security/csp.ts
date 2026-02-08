// Content Security Policy Configuration
// Provides advanced protection against XSS, clickjacking, and other attacks
export function generateCSP(): string {
  const cspDirectives = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      "'unsafe-eval'", // Required for Next.js in development
      "'unsafe-inline'", // Required for Next.js
      'https://vercel.live',
      'https://cdn.jsdelivr.net',
    ],
    'style-src': [
      "'self'",
      "'unsafe-inline'", // Required for styled-components and CSS-in-JS
      'https://fonts.googleapis.com',
    ],
    'img-src': [
      "'self'",
      'data:',
      'blob:',
      'https:',
      'http:', // Allow all images (Cloudinary, user uploads, etc.)
    ],
    'font-src': [
      "'self'",
      'data:',
      'https://fonts.gstatic.com',
    ],
    'connect-src': [
      "'self'",
      'https://api.cloudinary.com',
      'https://*.supabase.co',
      'wss://*.supabase.co',
      'https://*.supabase.com',
      'wss://*.supabase.com',
      'https://*.pooler.supabase.com',
      'https://0.peerjs.com',
      'wss://0.peerjs.com',
      'https://vercel.live',
    ],
    'media-src': [
      "'self'",
      'https:',
      'data:',
      'blob:',
    ],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"], // Prevent clickjacking
    'frame-src': ["'self'", 'https://www.youtube.com', 'https://player.vimeo.com'],
    'upgrade-insecure-requests': [],
  };

  // Convert to CSP string
  const cspString = Object.entries(cspDirectives)
    .map(([key, values]) => {
      if (values.length === 0) {
        return key;
      }
      return `${key} ${values.join(' ')}`;
    })
    .join('; ');

  return cspString;
}

/**
 * Generate CSP nonce for inline scripts
 * Use this in production for better security
 */
export function generateNonce(): string {
  const crypto = require('crypto');
  return crypto.randomBytes(16).toString('base64');
}

/**
 * Security headers configuration
 */
export const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: generateCSP(),
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=*, microphone=*, geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
];

/**
 * Additional security headers for API routes
 */
export const apiSecurityHeaders = [
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'Cache-Control',
    value: 'no-store, no-cache, must-revalidate, proxy-revalidate',
  },
  {
    key: 'Pragma',
    value: 'no-cache',
  },
  {
    key: 'Expires',
    value: '0',
  },
];
