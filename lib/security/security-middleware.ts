/**
 * ADVANCED SECURITY MIDDLEWARE
 * 
 * CIA-LEVEL PROTECTION
 * 
 * This middleware intercepts ALL requests and applies comprehensive security checks
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateSecureInput, logSecurityEvent, detectSuspiciousUserAgent } from './advanced-protection';
import { checkRateLimit, getClientIdentifier, RateLimitConfigs } from './rate-limit';

/**
 * Security Middleware
 * Applies to all API routes
 */
export async function securityMiddleware(
  request: NextRequest,
  handler: (req: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  const clientId = getClientIdentifier(request);
  const userAgent = request.headers.get('user-agent') || '';
  const url = new URL(request.url);

  // 1. Rate Limiting Check
  const rateLimit = checkRateLimit(clientId, RateLimitConfigs.API);
  if (!rateLimit.allowed) {
    logSecurityEvent({
      type: 'RATE_LIMIT_EXCEEDED',
      severity: 'MEDIUM',
      ip: clientId,
      details: `Path: ${url.pathname}`,
    });

    return new NextResponse(
      JSON.stringify({ error: 'Too many requests' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': Math.ceil((rateLimit.resetTime - Date.now()) / 1000).toString(),
        },
      }
    );
  }

  // 2. Suspicious User Agent Detection
  if (detectSuspiciousUserAgent(userAgent)) {
    logSecurityEvent({
      type: 'SUSPICIOUS_USER_AGENT',
      severity: 'LOW',
      ip: clientId,
      details: `User-Agent: ${userAgent}`,
    });
  }

  // 3. Validate Request Body (for POST/PUT/PATCH)
  if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
    try {
      const clonedRequest = request.clone();
      const body = await clonedRequest.text();

      if (body) {
        const validation = validateSecureInput(body);

        if (!validation.valid) {
          logSecurityEvent({
            type: 'ATTACK_DETECTED',
            severity: 'CRITICAL',
            ip: clientId,
            details: `Threats: ${validation.threats.join(', ')} - Path: ${url.pathname}`,
          });

          return new NextResponse(
            JSON.stringify({
              error: 'Security violation detected',
              code: 'SECURITY_THREAT_DETECTED',
            }),
            {
              status: 403,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }
      }
    } catch (error) {
      console.error('Security middleware error:', error);
    }
  }

  // 4. Validate Query Parameters
  url.searchParams.forEach((value, key) => {
    const validation = validateSecureInput(value);

    if (!validation.valid) {
      logSecurityEvent({
        type: 'ATTACK_IN_QUERY_PARAMS',
        severity: 'HIGH',
        ip: clientId,
        details: `Param: ${key}, Threats: ${validation.threats.join(', ')}`,
      });
    }
  });

  // 5. Check for common attack paths
  const suspiciousPaths = [
    '/admin',
    '/phpmyadmin',
    '/wp-admin',
    '/.env',
    '/.git',
    '/config',
    '/backup',
    '/sql',
    '/database',
  ];

  if (suspiciousPaths.some(path => url.pathname.includes(path))) {
    logSecurityEvent({
      type: 'SUSPICIOUS_PATH_ACCESS',
      severity: 'HIGH',
      ip: clientId,
      details: `Attempted access to: ${url.pathname}`,
    });
  }

  // 6. Execute the actual handler
  const response = await handler(request);

  // 7. Add security headers to response
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'no-referrer');
  response.headers.set('X-Security-Level', 'MILITARY-GRADE');

  return response;
}

/**
 * Validate API Request
 * Use this in API routes for additional validation
 */
export function validateAPIRequest(request: NextRequest): {
  valid: boolean;
  error?: string;
} {
  // Check Content-Type for POST/PUT/PATCH
  if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
    const contentType = request.headers.get('content-type');
    
    if (!contentType || !contentType.includes('application/json')) {
      return {
        valid: false,
        error: 'Invalid Content-Type. Expected application/json',
      };
    }
  }

  // Check for required headers
  const requiredHeaders = ['user-agent'];
  for (const header of requiredHeaders) {
    if (!request.headers.get(header)) {
      return {
        valid: false,
        error: `Missing required header: ${header}`,
      };
    }
  }

  return { valid: true };
}

/**
 * Sanitize API Response
 * Removes sensitive data from responses
 */
export function sanitizeAPIResponse(data: any): any {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const sensitiveFields = [
    'password',
    'passwordHash',
    'token',
    'secret',
    'apiKey',
    'privateKey',
    'encryptionKey',
    'salt',
  ];

  const sanitized = { ...data };

  for (const field of sensitiveFields) {
    if (field in sanitized) {
      delete sanitized[field];
    }
  }

  // Recursively sanitize nested objects
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeAPIResponse(sanitized[key]);
    }
  }

  return sanitized;
}

/**
 * Validate File Upload
 */
export function validateFileUpload(file: {
  name: string;
  size: number;
  type: string;
}): {
  valid: boolean;
  error?: string;
} {
  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File size exceeds 10MB limit',
    };
  }

  // Check file extension
  const allowedExtensions = [
    '.jpg', '.jpeg', '.png', '.gif', '.webp',
    '.pdf', '.doc', '.docx',
    '.mp4', '.webm',
  ];

  const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  if (!allowedExtensions.includes(extension)) {
    return {
      valid: false,
      error: 'File type not allowed',
    };
  }

  // Check MIME type
  const allowedMimeTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'video/mp4', 'video/webm',
  ];

  if (!allowedMimeTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid MIME type',
    };
  }

  // Check for double extensions (e.g., file.php.jpg)
  const doubleExtensionPattern = /\.\w+\.\w+$/;
  if (doubleExtensionPattern.test(file.name)) {
    return {
      valid: false,
      error: 'Double extensions not allowed',
    };
  }

  // Check for null bytes in filename
  if (file.name.includes('\0')) {
    return {
      valid: false,
      error: 'Invalid filename',
    };
  }

  return { valid: true };
}
