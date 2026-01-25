// Security Logger
// Logs security-related events for monitoring and auditing

export type SecurityEventType =
  | 'login_success'
  | 'login_failed'
  | 'account_locked'
  | 'account_unlocked'
  | 'password_changed'
  | 'email_verified'
  | 'vpn_detected'
  | 'vpn_blocked'
  | 'suspicious_activity'
  | 'report_submitted'
  | 'admin_action';

export interface SecurityEvent {
  type: SecurityEventType;
  userId?: number;
  email?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
}

class SecurityLogger {
  private events: SecurityEvent[] = [];
  private maxEvents = 10000; // Keep last 10k events in memory

  /**
   * Log a security event
   */
  log(event: Omit<SecurityEvent, 'timestamp'>): void {
    const fullEvent: SecurityEvent = {
      ...event,
      timestamp: new Date(),
    };

    this.events.push(fullEvent);

    // Keep only recent events
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[SECURITY]', {
        type: fullEvent.type,
        severity: fullEvent.severity,
        userId: fullEvent.userId,
        email: fullEvent.email,
        details: fullEvent.details,
      });
    }

    // In production, you would send this to a logging service
    // like Sentry, LogRocket, or your own logging infrastructure
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to external logging service
      // this.sendToLoggingService(fullEvent);
    }
  }

  /**
   * Get recent security events
   */
  getRecentEvents(limit: number = 100): SecurityEvent[] {
    return this.events.slice(-limit).reverse();
  }

  /**
   * Get events by user
   */
  getEventsByUser(userId: number, limit: number = 50): SecurityEvent[] {
    return this.events
      .filter(event => event.userId === userId)
      .slice(-limit)
      .reverse();
  }

  /**
   * Get events by type
   */
  getEventsByType(type: SecurityEventType, limit: number = 50): SecurityEvent[] {
    return this.events
      .filter(event => event.type === type)
      .slice(-limit)
      .reverse();
  }

  /**
   * Get high severity events
   */
  getHighSeverityEvents(limit: number = 50): SecurityEvent[] {
    return this.events
      .filter(event => event.severity === 'high' || event.severity === 'critical')
      .slice(-limit)
      .reverse();
  }

  /**
   * Clear old events (cleanup)
   */
  clearOldEvents(olderThanDays: number = 30): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    this.events = this.events.filter(
      event => event.timestamp >= cutoffDate
    );
  }

  /**
   * Send to external logging service (placeholder)
   */
  private sendToLoggingService(event: SecurityEvent): void {
    // Implement integration with your logging service
    // Examples: Sentry, LogRocket, Datadog, etc.
  }
}

// Singleton instance
export const securityLogger = new SecurityLogger();

// Helper functions for common security events

export function logLoginSuccess(userId: number, email: string, ipAddress: string, userAgent: string) {
  securityLogger.log({
    type: 'login_success',
    userId,
    email,
    ipAddress,
    userAgent,
    severity: 'low',
  });
}

export function logLoginFailed(email: string, ipAddress: string, userAgent: string, reason: string) {
  securityLogger.log({
    type: 'login_failed',
    email,
    ipAddress,
    userAgent,
    details: { reason },
    severity: 'medium',
  });
}

export function logAccountLocked(userId: number, email: string, ipAddress: string, lockedUntil: Date) {
  securityLogger.log({
    type: 'account_locked',
    userId,
    email,
    ipAddress,
    details: { lockedUntil: lockedUntil.toISOString() },
    severity: 'high',
  });
}

export function logVPNDetected(userId: number, email: string, ipAddress: string, details: any) {
  securityLogger.log({
    type: 'vpn_detected',
    userId,
    email,
    ipAddress,
    details,
    severity: 'high',
  });
}

export function logVPNBlocked(userId: number, email: string, ipAddress: string, details: any) {
  securityLogger.log({
    type: 'vpn_blocked',
    userId,
    email,
    ipAddress,
    details,
    severity: 'critical',
  });
}

export function logReportSubmitted(reporterId: number, reportedUserId: number, reason: string) {
  securityLogger.log({
    type: 'report_submitted',
    userId: reporterId,
    details: { reportedUserId, reason },
    severity: 'medium',
  });
}

export function logAdminAction(adminId: number, action: string, targetUserId?: number, details?: any) {
  securityLogger.log({
    type: 'admin_action',
    userId: adminId,
    details: { action, targetUserId, ...details },
    severity: 'medium',
  });
}
