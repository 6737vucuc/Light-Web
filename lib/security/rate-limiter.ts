// Rate limiting implementation
interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum number of requests per window
}

export function rateLimit(identifier: string, config: RateLimitConfig): boolean {
  const now = Date.now();
  const record = store[identifier];

  // Clean up expired entries
  if (record && now > record.resetTime) {
    delete store[identifier];
  }

  // Check if limit exceeded
  if (record && record.count >= config.maxRequests) {
    return false; // Rate limit exceeded
  }

  // Update or create record
  if (record) {
    record.count++;
  } else {
    store[identifier] = {
      count: 1,
      resetTime: now + config.windowMs,
    };
  }

  return true; // Request allowed
}

// Predefined rate limit configs
export const RateLimits = {
  // Authentication endpoints
  LOGIN: { windowMs: 15 * 60 * 1000, maxRequests: 5 }, // 5 requests per 15 minutes
  REGISTER: { windowMs: 60 * 60 * 1000, maxRequests: 3 }, // 3 requests per hour
  VERIFY: { windowMs: 15 * 60 * 1000, maxRequests: 10 }, // 10 requests per 15 minutes
  
  // API endpoints
  API_GENERAL: { windowMs: 60 * 1000, maxRequests: 100 }, // 100 requests per minute
  API_STRICT: { windowMs: 60 * 1000, maxRequests: 20 }, // 20 requests per minute
  
  // Messaging
  SEND_MESSAGE: { windowMs: 60 * 1000, maxRequests: 30 }, // 30 messages per minute
  
  // Posts
  CREATE_POST: { windowMs: 60 * 1000, maxRequests: 5 }, // 5 posts per minute
  
  // Upload
  UPLOAD_FILE: { windowMs: 60 * 1000, maxRequests: 10 }, // 10 uploads per minute
};

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach(key => {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  });
}, 60 * 1000); // Clean up every minute
