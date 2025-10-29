// Advanced Threat Detection System
import { db } from '@/lib/db';

interface ThreatLog {
  userId?: number;
  ipAddress: string;
  threatType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  timestamp: Date;
  blocked: boolean;
}

interface UserBehavior {
  userId: number;
  loginAttempts: number;
  failedLogins: number;
  lastLoginTime: Date;
  loginLocations: string[];
  deviceFingerprints: string[];
  suspiciousActivities: number;
}

const threatLogs: ThreatLog[] = [];
const userBehaviors: Map<number, UserBehavior> = new Map();
const blockedIPs: Set<string> = new Set();
const suspiciousIPs: Map<string, number> = new Map();

export class ThreatDetection {
  // Detect brute force attacks
  static detectBruteForce(ipAddress: string, userId?: number): boolean {
    const attempts = suspiciousIPs.get(ipAddress) || 0;
    
    if (attempts >= 5) {
      this.logThreat({
        userId,
        ipAddress,
        threatType: 'brute_force',
        severity: 'high',
        description: 'Multiple failed login attempts detected',
        timestamp: new Date(),
        blocked: true,
      });
      
      this.blockIP(ipAddress, 3600000); // Block for 1 hour
      return true;
    }
    
    suspiciousIPs.set(ipAddress, attempts + 1);
    
    // Clear after 15 minutes
    setTimeout(() => {
      suspiciousIPs.delete(ipAddress);
    }, 15 * 60 * 1000);
    
    return false;
  }

  // Detect account takeover attempts
  static detectAccountTakeover(userId: number, ipAddress: string, deviceFingerprint: string): boolean {
    const behavior = userBehaviors.get(userId);
    
    if (!behavior) {
      // First login, create behavior profile
      userBehaviors.set(userId, {
        userId,
        loginAttempts: 1,
        failedLogins: 0,
        lastLoginTime: new Date(),
        loginLocations: [ipAddress],
        deviceFingerprints: [deviceFingerprint],
        suspiciousActivities: 0,
      });
      return false;
    }

    let suspicious = false;

    // Check for new device
    if (!behavior.deviceFingerprints.includes(deviceFingerprint)) {
      suspicious = true;
      behavior.deviceFingerprints.push(deviceFingerprint);
    }

    // Check for new location
    if (!behavior.loginLocations.includes(ipAddress)) {
      suspicious = true;
      behavior.loginLocations.push(ipAddress);
    }

    // Check for rapid location changes
    const timeSinceLastLogin = Date.now() - behavior.lastLoginTime.getTime();
    if (timeSinceLastLogin < 60000 && behavior.loginLocations.length > 1) { // Less than 1 minute
      this.logThreat({
        userId,
        ipAddress,
        threatType: 'impossible_travel',
        severity: 'critical',
        description: 'Login from different location in impossible timeframe',
        timestamp: new Date(),
        blocked: false,
      });
      suspicious = true;
    }

    if (suspicious) {
      behavior.suspiciousActivities++;
      
      if (behavior.suspiciousActivities >= 3) {
        this.logThreat({
          userId,
          ipAddress,
          threatType: 'account_takeover',
          severity: 'critical',
          description: 'Multiple suspicious activities detected',
          timestamp: new Date(),
          blocked: false,
        });
        return true;
      }
    }

    behavior.lastLoginTime = new Date();
    behavior.loginAttempts++;
    userBehaviors.set(userId, behavior);

    return false;
  }

  // Detect SQL injection attempts
  static detectSQLInjection(input: string): boolean {
    const sqlPatterns = [
      /(\bUNION\b.*\bSELECT\b)/i,
      /(\bSELECT\b.*\bFROM\b.*\bWHERE\b)/i,
      /(\bINSERT\b.*\bINTO\b.*\bVALUES\b)/i,
      /(\bDELETE\b.*\bFROM\b)/i,
      /(\bDROP\b.*\bTABLE\b)/i,
      /(\bUPDATE\b.*\bSET\b)/i,
      /(--|\#|\/\*|\*\/)/,
      /(\bOR\b.*=.*)/i,
      /(\bAND\b.*=.*)/i,
      /(;.*\bEXEC\b)/i,
    ];

    const isSQLInjection = sqlPatterns.some(pattern => pattern.test(input));

    if (isSQLInjection) {
      this.logThreat({
        ipAddress: 'unknown',
        threatType: 'sql_injection',
        severity: 'critical',
        description: `SQL injection attempt detected: ${input.substring(0, 100)}`,
        timestamp: new Date(),
        blocked: true,
      });
    }

    return isSQLInjection;
  }

  // Detect XSS attempts
  static detectXSS(input: string): boolean {
    const xssPatterns = [
      /<script[^>]*>.*<\/script>/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe[^>]*>/i,
      /eval\(/i,
      /expression\(/i,
      /vbscript:/i,
      /<embed[^>]*>/i,
      /<object[^>]*>/i,
    ];

    const isXSS = xssPatterns.some(pattern => pattern.test(input));

    if (isXSS) {
      this.logThreat({
        ipAddress: 'unknown',
        threatType: 'xss',
        severity: 'high',
        description: `XSS attempt detected: ${input.substring(0, 100)}`,
        timestamp: new Date(),
        blocked: true,
      });
    }

    return isXSS;
  }

  // Detect DDoS attacks
  static detectDDoS(ipAddress: string): boolean {
    const requestCount = suspiciousIPs.get(ipAddress) || 0;
    
    // More than 100 requests per minute
    if (requestCount > 100) {
      this.logThreat({
        ipAddress,
        threatType: 'ddos',
        severity: 'critical',
        description: 'Potential DDoS attack detected',
        timestamp: new Date(),
        blocked: true,
      });
      
      this.blockIP(ipAddress, 3600000); // Block for 1 hour
      return true;
    }

    return false;
  }

  // Detect credential stuffing
  static detectCredentialStuffing(email: string, ipAddress: string): boolean {
    // Track failed login attempts per email from same IP
    const key = `${email}:${ipAddress}`;
    const attempts = suspiciousIPs.get(key) || 0;

    if (attempts >= 3) {
      this.logThreat({
        ipAddress,
        threatType: 'credential_stuffing',
        severity: 'high',
        description: `Credential stuffing detected for email: ${email}`,
        timestamp: new Date(),
        blocked: true,
      });
      
      this.blockIP(ipAddress, 1800000); // Block for 30 minutes
      return true;
    }

    suspiciousIPs.set(key, attempts + 1);
    
    setTimeout(() => {
      suspiciousIPs.delete(key);
    }, 10 * 60 * 1000); // Clear after 10 minutes

    return false;
  }

  // Detect bot activity
  static detectBot(userAgent: string, behavior: any): boolean {
    const botPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /scraper/i,
      /curl/i,
      /wget/i,
      /python/i,
    ];

    const isBot = botPatterns.some(pattern => pattern.test(userAgent));

    // Additional behavioral checks
    const suspiciousBehavior = 
      !behavior.mouseMovement ||
      !behavior.keyboardInput ||
      behavior.requestSpeed < 100; // Requests faster than humanly possible

    if (isBot || suspiciousBehavior) {
      this.logThreat({
        ipAddress: 'unknown',
        threatType: 'bot_activity',
        severity: 'medium',
        description: 'Bot or automated activity detected',
        timestamp: new Date(),
        blocked: false,
      });
      return true;
    }

    return false;
  }

  // Block IP address
  static blockIP(ipAddress: string, duration: number): void {
    blockedIPs.add(ipAddress);
    
    setTimeout(() => {
      blockedIPs.delete(ipAddress);
    }, duration);
  }

  // Check if IP is blocked
  static isIPBlocked(ipAddress: string): boolean {
    return blockedIPs.has(ipAddress);
  }

  // Log threat
  static logThreat(threat: ThreatLog): void {
    threatLogs.push(threat);
    
    // In production, save to database
    console.warn('THREAT DETECTED:', threat);

    // Send alert for critical threats
    if (threat.severity === 'critical') {
      this.sendSecurityAlert(threat);
    }

    // Keep only last 10000 logs in memory
    if (threatLogs.length > 10000) {
      threatLogs.shift();
    }
  }

  // Send security alert
  static sendSecurityAlert(threat: ThreatLog): void {
    // TODO: Send email/SMS alert to administrators
    console.error('CRITICAL THREAT ALERT:', threat);
  }

  // Get threat statistics
  static getThreatStats(): {
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    blocked: number;
  } {
    const stats = {
      total: threatLogs.length,
      byType: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>,
      blocked: 0,
    };

    threatLogs.forEach(threat => {
      stats.byType[threat.threatType] = (stats.byType[threat.threatType] || 0) + 1;
      stats.bySeverity[threat.severity] = (stats.bySeverity[threat.severity] || 0) + 1;
      if (threat.blocked) stats.blocked++;
    });

    return stats;
  }

  // Get recent threats
  static getRecentThreats(limit: number = 100): ThreatLog[] {
    return threatLogs.slice(-limit).reverse();
  }

  // Clear old logs
  static clearOldLogs(olderThan: Date): void {
    const index = threatLogs.findIndex(log => log.timestamp > olderThan);
    if (index > 0) {
      threatLogs.splice(0, index);
    }
  }
}

// Automated cleanup every hour
setInterval(() => {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  ThreatDetection.clearOldLogs(oneWeekAgo);
}, 60 * 60 * 1000);
