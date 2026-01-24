// Rate Limiting Utility
// Prevents brute force attacks and API abuse

import { NextRequest } from 'next/server';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach(key => {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  });
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  maxRequests: number; // Maximum number of requests
  windowMs: number; // Time window in milliseconds
}

/**
 * Rate limiter function
 * @param identifier - Unique identifier (usually IP address or user ID)
 * @param config - Rate limit configuration
 * @returns Object with success status and retry information
 */
export function rateLimit(
  identifier: string,
  config: RateLimitConfig
): {
  success: boolean;
  remaining: number;
  resetTime: number;
} {
  const now = Date.now();
  const key = identifier;

  // Initialize or reset if window expired
  if (!store[key] || store[key].resetTime < now) {
    store[key] = {
      count: 1,
      resetTime: now + config.windowMs,
    };
    return {
      success: true,
      remaining: config.maxRequests - 1,
      resetTime: store[key].resetTime,
    };
  }

  // Increment count
  store[key].count++;

  // Check if limit exceeded
  if (store[key].count > config.maxRequests) {
    return {
      success: false,
      remaining: 0,
      resetTime: store[key].resetTime,
    };
  }

  return {
    success: true,
    remaining: config.maxRequests - store[key].count,
    resetTime: store[key].resetTime,
  };
}

/**
 * Get client IP address from request
 */
export function getClientIp(request: NextRequest): string {
  // Try to get real IP from headers (for proxies/load balancers)
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIp) {
    return realIp;
  }
  
  // Fallback to connection IP
  return request.ip || 'unknown';
}

/**
 * Rate limit configurations for different endpoints
 */
export const rateLimitConfigs = {
  // Authentication endpoints
  login: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  register: {
    maxRequests: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  verifyEmail: {
    maxRequests: 5,
    windowMs: 10 * 60 * 1000, // 10 minutes
  },
  resendCode: {
    maxRequests: 3,
    windowMs: 10 * 60 * 1000, // 10 minutes
  },
  
  // Password reset
  forgotPassword: {
    maxRequests: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  resetPassword: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  
  // General API
  api: {
    maxRequests: 100,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
};

/**
 * Helper function to create rate limit response
 */
export function createRateLimitResponse(resetTime: number) {
  const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
  
  return new Response(
    JSON.stringify({
      error: 'Too many requests. Please try again later.',
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': retryAfter.toString(),
        'X-RateLimit-Reset': new Date(resetTime).toISOString(),
      },
    }
  );
}
