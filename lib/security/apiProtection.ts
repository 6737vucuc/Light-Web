import { NextRequest, NextResponse } from 'next/server';
import validator from './validator';

/**
 * API Protection Middleware
 * Comprehensive protection for API endpoints
 */

interface SecurityCheckResult {
  passed: boolean;
  errors: string[];
  statusCode?: number;
}

/**
 * Check request body for malicious content
 */
export async function checkRequestBody(request: NextRequest): Promise<SecurityCheckResult> {
  const errors: string[] = [];

  try {
    const contentType = request.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      const body = await request.json();
      const bodyString = JSON.stringify(body);

      // Check for SQL injection
      const sqlPatterns = [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE)\b)/gi,
        /(--|#|\/\*|\*\/)/g,
        /(\bOR\b.*=.*|1=1|'=')/gi
      ];

      for (const pattern of sqlPatterns) {
        if (pattern.test(bodyString)) {
          errors.push('Potential SQL injection in request body');
          return { passed: false, errors, statusCode: 403 };
        }
      }

      // Check for XSS
      const xssPatterns = [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi
      ];

      for (const pattern of xssPatterns) {
        if (pattern.test(bodyString)) {
          errors.push('Potential XSS in request body');
          return { passed: false, errors, statusCode: 403 };
        }
      }

      // Check for command injection
      const cmdInjectionCheck = validator.checkCommandInjection(bodyString);
      if (!cmdInjectionCheck.isSafe) {
        errors.push(...cmdInjectionCheck.errors);
        return { passed: false, errors, statusCode: 403 };
      }
    }
  } catch (error) {
    // If body parsing fails, it's likely not JSON or already consumed
    // This is acceptable for multipart/form-data or other content types
  }

  return { passed: true, errors: [] };
}

/**
 * Validate request headers
 */
export function validateHeaders(request: NextRequest): SecurityCheckResult {
  const errors: string[] = [];

  // Check User-Agent
  const userAgent = request.headers.get('user-agent');
  if (!userAgent || userAgent.length < 10) {
    errors.push('Invalid or missing User-Agent');
  }

  // Check for suspicious User-Agents
  const suspiciousAgents = [
    /sqlmap/i,
    /nikto/i,
    /nmap/i,
    /masscan/i,
    /metasploit/i,
    /burp/i
  ];

  if (userAgent) {
    for (const pattern of suspiciousAgents) {
      if (pattern.test(userAgent)) {
        errors.push('Suspicious User-Agent detected');
        return { passed: false, errors, statusCode: 403 };
      }
    }
  }

  // Check Content-Length for potential DoS
  const contentLength = request.headers.get('content-length');
  if (contentLength) {
    const length = parseInt(contentLength, 10);
    const MAX_BODY_SIZE = 10 * 1024 * 1024; // 10MB

    if (length > MAX_BODY_SIZE) {
      errors.push('Request body too large');
      return { passed: false, errors, statusCode: 413 };
    }
  }

  return { passed: errors.length === 0, errors: [] };
}

/**
 * Check for suspicious request patterns
 */
export function checkSuspiciousPatterns(request: NextRequest): SecurityCheckResult {
  const errors: string[] = [];
  const url = request.nextUrl.pathname + request.nextUrl.search;

  // Path traversal
  if (/(\.\.|\/\/|\\\\)/.test(url)) {
    errors.push('Path traversal attempt detected');
    return { passed: false, errors, statusCode: 403 };
  }

  // Null byte injection
  if (url.includes('%00') || url.includes('\0')) {
    errors.push('Null byte injection detected');
    return { passed: false, errors, statusCode: 403 };
  }

  // Encoded attacks
  const decodedUrl = decodeURIComponent(url);
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /union.*select/i,
    /exec\s*\(/i,
    /eval\s*\(/i
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(decodedUrl)) {
      errors.push('Suspicious pattern detected in URL');
      return { passed: false, errors, statusCode: 403 };
    }
  }

  return { passed: true, errors: [] };
}

/**
 * Validate API authentication
 */
export function validateAuthentication(request: NextRequest): SecurityCheckResult {
  const errors: string[] = [];
  const authHeader = request.headers.get('authorization');

  // Public endpoints that don't require authentication
  const publicEndpoints = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/verify'
  ];

  if (publicEndpoints.some(endpoint => request.nextUrl.pathname.startsWith(endpoint))) {
    return { passed: true, errors: [] };
  }

  // Check for authorization header
  if (!authHeader) {
    errors.push('Missing authorization header');
    return { passed: false, errors, statusCode: 401 };
  }

  // Validate Bearer token format
  if (!authHeader.startsWith('Bearer ')) {
    errors.push('Invalid authorization format');
    return { passed: false, errors, statusCode: 401 };
  }

  const token = authHeader.substring(7);
  if (!token || token.length < 20) {
    errors.push('Invalid token');
    return { passed: false, errors, statusCode: 401 };
  }

  return { passed: true, errors: [] };
}

/**
 * Check for brute force attempts
 */
const loginAttempts = new Map<string, { count: number; resetTime: number }>();

export function checkBruteForce(identifier: string, endpoint: string): SecurityCheckResult {
  const errors: string[] = [];
  const key = `${identifier}:${endpoint}`;
  const now = Date.now();
  const attempt = loginAttempts.get(key);

  const MAX_ATTEMPTS = 5;
  const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

  if (!attempt || now > attempt.resetTime) {
    loginAttempts.set(key, {
      count: 1,
      resetTime: now + WINDOW_MS
    });
    return { passed: true, errors: [] };
  }

  if (attempt.count >= MAX_ATTEMPTS) {
    errors.push('Too many failed attempts. Please try again later.');
    return { passed: false, errors, statusCode: 429 };
  }

  attempt.count++;
  return { passed: true, errors: [] };
}

/**
 * Clean up old brute force records
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of loginAttempts.entries()) {
    if (now > value.resetTime) {
      loginAttempts.delete(key);
    }
  }
}, 5 * 60 * 1000); // Clean up every 5 minutes

/**
 * Comprehensive API protection check
 */
export async function protectAPI(request: NextRequest): Promise<NextResponse | null> {
  // Check headers
  const headersCheck = validateHeaders(request);
  if (!headersCheck.passed) {
    return NextResponse.json(
      { error: 'Security violation', details: headersCheck.errors },
      { status: headersCheck.statusCode || 403 }
    );
  }

  // Check suspicious patterns
  const patternsCheck = checkSuspiciousPatterns(request);
  if (!patternsCheck.passed) {
    return NextResponse.json(
      { error: 'Security violation', details: patternsCheck.errors },
      { status: patternsCheck.statusCode || 403 }
    );
  }

  // Check request body for POST/PUT/PATCH
  if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
    const bodyCheck = await checkRequestBody(request);
    if (!bodyCheck.passed) {
      return NextResponse.json(
        { error: 'Security violation', details: bodyCheck.errors },
        { status: bodyCheck.statusCode || 403 }
      );
    }
  }

  return null; // All checks passed
}

export default {
  checkRequestBody,
  validateHeaders,
  checkSuspiciousPatterns,
  validateAuthentication,
  checkBruteForce,
  protectAPI
};
