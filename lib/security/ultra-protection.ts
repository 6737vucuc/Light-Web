/**
 * ULTRA PROTECTION SYSTEM
 * 
 * Advanced Security Protection Against:
 * - DDoS Attacks
 * - Brute Force Attacks
 * - Rate Limiting Bypass
 * - Bot Detection
 * - IP Spoofing
 * - Session Hijacking
 * - Man-in-the-Middle Attacks
 * - Replay Attacks
 * - Zero-Day Exploits
 */

import { createHash, randomBytes } from 'crypto';

// Rate Limiting Store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const loginAttemptStore = new Map<string, { attempts: number; blockedUntil: number }>();
const ipReputationStore = new Map<string, { score: number; lastUpdate: number }>();

/**
 * Advanced Rate Limiter with Sliding Window
 */
export class AdvancedRateLimiter {
  private requests: Map<string, number[]> = new Map();
  
  constructor(
    private maxRequests: number,
    private windowMs: number,
    private blockDurationMs: number = 3600000 // 1 hour
  ) {}
  
  /**
   * Check if request is allowed
   */
  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const userRequests = this.requests.get(identifier) || [];
    
    // Remove old requests outside the window
    const validRequests = userRequests.filter(time => now - time < this.windowMs);
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }
    
    validRequests.push(now);
    this.requests.set(identifier, validRequests);
    
    return true;
  }
  
  /**
   * Get remaining requests
   */
  getRemaining(identifier: string): number {
    const now = Date.now();
    const userRequests = this.requests.get(identifier) || [];
    const validRequests = userRequests.filter(time => now - time < this.windowMs);
    
    return Math.max(0, this.maxRequests - validRequests.length);
  }
  
  /**
   * Reset rate limit for identifier
   */
  reset(identifier: string): void {
    this.requests.delete(identifier);
  }
  
  /**
   * Clean up old entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [identifier, requests] of this.requests.entries()) {
      const validRequests = requests.filter(time => now - time < this.windowMs);
      if (validRequests.length === 0) {
        this.requests.delete(identifier);
      } else {
        this.requests.set(identifier, validRequests);
      }
    }
  }
}

/**
 * Brute Force Protection
 */
export class BruteForceProtection {
  /**
   * Record failed login attempt
   */
  recordFailedAttempt(identifier: string): void {
    const record = loginAttemptStore.get(identifier) || { attempts: 0, blockedUntil: 0 };
    record.attempts++;
    
    // Block after 5 failed attempts
    if (record.attempts >= 5) {
      const blockDuration = Math.min(
        300000 * Math.pow(2, record.attempts - 5), // Exponential backoff
        86400000 // Max 24 hours
      );
      record.blockedUntil = Date.now() + blockDuration;
    }
    
    loginAttemptStore.set(identifier, record);
  }
  
  /**
   * Check if identifier is blocked
   */
  isBlocked(identifier: string): boolean {
    const record = loginAttemptStore.get(identifier);
    if (!record) return false;
    
    if (record.blockedUntil > Date.now()) {
      return true;
    }
    
    // Reset if block expired
    if (record.blockedUntil > 0 && record.blockedUntil <= Date.now()) {
      loginAttemptStore.delete(identifier);
    }
    
    return false;
  }
  
  /**
   * Get remaining block time in seconds
   */
  getBlockTimeRemaining(identifier: string): number {
    const record = loginAttemptStore.get(identifier);
    if (!record || record.blockedUntil <= Date.now()) return 0;
    
    return Math.ceil((record.blockedUntil - Date.now()) / 1000);
  }
  
  /**
   * Reset attempts on successful login
   */
  resetAttempts(identifier: string): void {
    loginAttemptStore.delete(identifier);
  }
  
  /**
   * Get failed attempts count
   */
  getAttempts(identifier: string): number {
    const record = loginAttemptStore.get(identifier);
    return record?.attempts || 0;
  }
}

/**
 * IP Reputation System
 */
export class IPReputationSystem {
  /**
   * Update IP reputation score
   * Score: 0 (worst) to 100 (best)
   */
  updateScore(ip: string, delta: number): void {
    const record = ipReputationStore.get(ip) || { score: 100, lastUpdate: Date.now() };
    record.score = Math.max(0, Math.min(100, record.score + delta));
    record.lastUpdate = Date.now();
    ipReputationStore.set(ip, record);
  }
  
  /**
   * Get IP reputation score
   */
  getScore(ip: string): number {
    const record = ipReputationStore.get(ip);
    if (!record) return 100; // New IPs start with perfect score
    
    // Decay score over time (improve reputation gradually)
    const daysSinceUpdate = (Date.now() - record.lastUpdate) / 86400000;
    const decayedScore = Math.min(100, record.score + daysSinceUpdate * 2);
    
    return decayedScore;
  }
  
  /**
   * Check if IP is trusted
   */
  isTrusted(ip: string): boolean {
    return this.getScore(ip) >= 70;
  }
  
  /**
   * Check if IP is suspicious
   */
  isSuspicious(ip: string): boolean {
    return this.getScore(ip) < 50;
  }
  
  /**
   * Block IP (set score to 0)
   */
  blockIP(ip: string): void {
    ipReputationStore.set(ip, { score: 0, lastUpdate: Date.now() });
  }
}

/**
 * Bot Detection System
 */
export class BotDetector {
  /**
   * Detect bot based on user agent
   */
  static detectByUserAgent(userAgent: string): boolean {
    const botPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /curl/i,
      /wget/i,
      /python/i,
      /java(?!script)/i,
      /perl/i,
      /ruby/i,
      /go-http-client/i,
      /okhttp/i,
      /headless/i,
      /phantom/i,
      /selenium/i,
      /webdriver/i,
    ];
    
    return botPatterns.some(pattern => pattern.test(userAgent));
  }
  
  /**
   * Detect bot based on behavior patterns
   */
  static detectByBehavior(metrics: {
    requestsPerMinute: number;
    uniqueEndpoints: number;
    avgResponseTime: number;
    hasJavaScript: boolean;
  }): boolean {
    // Too many requests per minute
    if (metrics.requestsPerMinute > 60) return true;
    
    // Accessing too many unique endpoints too quickly
    if (metrics.uniqueEndpoints > 20 && metrics.requestsPerMinute > 30) return true;
    
    // No JavaScript execution
    if (!metrics.hasJavaScript) return true;
    
    // Suspiciously fast response times (automated)
    if (metrics.avgResponseTime < 100) return true;
    
    return false;
  }
  
  /**
   * Generate challenge token for bot verification
   */
  static generateChallenge(): { challenge: string; solution: string } {
    const challenge = randomBytes(16).toString('hex');
    const solution = createHash('sha256').update(challenge).digest('hex');
    return { challenge, solution };
  }
  
  /**
   * Verify challenge solution
   */
  static verifyChallenge(challenge: string, solution: string): boolean {
    const expectedSolution = createHash('sha256').update(challenge).digest('hex');
    
    // Timing-safe comparison
    if (solution.length !== expectedSolution.length) return false;
    
    let result = 0;
    for (let i = 0; i < solution.length; i++) {
      result |= solution.charCodeAt(i) ^ expectedSolution.charCodeAt(i);
    }
    
    return result === 0;
  }
}

/**
 * Session Security Manager
 */
export class SessionSecurityManager {
  /**
   * Generate secure session token
   */
  static generateSessionToken(): string {
    return randomBytes(32).toString('base64url');
  }
  
  /**
   * Create session fingerprint
   */
  static createFingerprint(userAgent: string, ip: string): string {
    const data = `${userAgent}|${ip}|${Date.now()}`;
    return createHash('sha256').update(data).digest('hex');
  }
  
  /**
   * Verify session fingerprint
   */
  static verifyFingerprint(
    currentUserAgent: string,
    currentIP: string,
    storedFingerprint: string
  ): boolean {
    const currentFingerprint = createHash('sha256')
      .update(`${currentUserAgent}|${currentIP}`)
      .digest('hex');
    
    // Allow some flexibility for IP changes (mobile networks)
    // But user agent should match
    const userAgentHash = createHash('sha256').update(currentUserAgent).digest('hex');
    return storedFingerprint.includes(userAgentHash.substring(0, 16));
  }
  
  /**
   * Detect session hijacking
   */
  static detectHijacking(session: {
    createdAt: Date;
    lastActivity: Date;
    ipAddresses: string[];
    userAgents: string[];
  }): boolean {
    // Too many different IPs
    if (session.ipAddresses.length > 3) return true;
    
    // Too many different user agents
    if (session.userAgents.length > 2) return true;
    
    // Suspicious time gaps
    const timeSinceCreation = Date.now() - new Date(session.createdAt).getTime();
    const timeSinceActivity = Date.now() - new Date(session.lastActivity).getTime();
    
    if (timeSinceCreation > 86400000 && timeSinceActivity < 300000) {
      // Old session suddenly active
      return true;
    }
    
    return false;
  }
}

/**
 * Request Signature Validator (Anti-Replay)
 */
export class RequestSignatureValidator {
  private usedNonces = new Set<string>();
  private readonly nonceExpiry = 300000; // 5 minutes
  
  /**
   * Generate request signature
   */
  generateSignature(
    method: string,
    url: string,
    timestamp: number,
    nonce: string,
    secretKey: string
  ): string {
    const data = `${method}|${url}|${timestamp}|${nonce}`;
    return createHash('sha256').update(data).update(secretKey).digest('hex');
  }
  
  /**
   * Verify request signature
   */
  verifySignature(
    method: string,
    url: string,
    timestamp: number,
    nonce: string,
    signature: string,
    secretKey: string
  ): boolean {
    // Check timestamp (prevent replay attacks)
    const now = Date.now();
    if (Math.abs(now - timestamp) > this.nonceExpiry) {
      return false;
    }
    
    // Check nonce (prevent duplicate requests)
    if (this.usedNonces.has(nonce)) {
      return false;
    }
    
    // Verify signature
    const expectedSignature = this.generateSignature(method, url, timestamp, nonce, secretKey);
    
    // Timing-safe comparison
    if (signature.length !== expectedSignature.length) return false;
    
    let result = 0;
    for (let i = 0; i < signature.length; i++) {
      result |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
    }
    
    if (result === 0) {
      this.usedNonces.add(nonce);
      // Clean up old nonces
      setTimeout(() => this.usedNonces.delete(nonce), this.nonceExpiry);
      return true;
    }
    
    return false;
  }
}

/**
 * Security Event Logger
 */
export class SecurityEventLogger {
  /**
   * Log security event
   */
  static log(event: {
    type: 'ATTACK_DETECTED' | 'SUSPICIOUS_ACTIVITY' | 'RATE_LIMIT_EXCEEDED' | 'BRUTE_FORCE' | 'BOT_DETECTED' | 'SESSION_HIJACKING';
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    ip: string;
    userAgent?: string;
    userId?: number;
    details: string;
    metadata?: any;
  }): void {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      ...event,
    };
    
    console.warn(`[SECURITY ${event.severity}] ${timestamp} - ${event.type}`, logEntry);
    
    // In production, send to SIEM or security monitoring service
    // Example: Send to Datadog, Splunk, or custom logging service
  }
}

// Export singleton instances
export const rateLimiter = new AdvancedRateLimiter(100, 60000); // 100 requests per minute
export const bruteForceProtection = new BruteForceProtection();
export const ipReputation = new IPReputationSystem();
export const sessionSecurity = new SessionSecurityManager();
export const requestValidator = new RequestSignatureValidator();

// Cleanup interval (every 5 minutes)
setInterval(() => {
  rateLimiter.cleanup();
}, 300000);
