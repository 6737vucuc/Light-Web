// Real-time Security Monitoring System
import { EventEmitter } from 'events';

interface SecurityEvent {
  id: string;
  type: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  metadata: Record<string, any>;
  timestamp: Date;
  userId?: number;
  ipAddress?: string;
}

interface MonitoringMetrics {
  totalRequests: number;
  failedRequests: number;
  blockedRequests: number;
  activeUsers: number;
  suspiciousActivities: number;
  averageResponseTime: number;
  errorRate: number;
  threatLevel: 'low' | 'medium' | 'high' | 'critical';
}

class SecurityMonitor extends EventEmitter {
  private events: SecurityEvent[] = [];
  private metrics: MonitoringMetrics = {
    totalRequests: 0,
    failedRequests: 0,
    blockedRequests: 0,
    activeUsers: 0,
    suspiciousActivities: 0,
    averageResponseTime: 0,
    errorRate: 0,
    threatLevel: 'low',
  };
  private responseTimes: number[] = [];
  private activeUserSessions: Set<number> = new Set();

  constructor() {
    super();
    this.startMonitoring();
  }

  // Log security event
  logEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): void {
    const securityEvent: SecurityEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: new Date(),
    };

    this.events.push(securityEvent);
    this.emit('event', securityEvent);

    // Update metrics
    this.updateMetrics(securityEvent);

    // Alert on critical events
    if (securityEvent.severity === 'critical') {
      this.emit('critical', securityEvent);
      this.sendAlert(securityEvent);
    }

    // Keep only last 10000 events
    if (this.events.length > 10000) {
      this.events.shift();
    }
  }

  // Track request
  trackRequest(
    userId?: number,
    ipAddress?: string,
    responseTime?: number,
    success: boolean = true
  ): void {
    this.metrics.totalRequests++;

    if (!success) {
      this.metrics.failedRequests++;
    }

    if (responseTime) {
      this.responseTimes.push(responseTime);
      if (this.responseTimes.length > 1000) {
        this.responseTimes.shift();
      }
      this.updateAverageResponseTime();
    }

    if (userId) {
      this.activeUserSessions.add(userId);
    }

    this.updateErrorRate();
    this.updateThreatLevel();
  }

  // Track blocked request
  trackBlockedRequest(reason: string, ipAddress: string): void {
    this.metrics.blockedRequests++;
    
    this.logEvent({
      type: 'blocked_request',
      severity: 'warning',
      message: `Request blocked: ${reason}`,
      metadata: { reason, ipAddress },
      ipAddress,
    });
  }

  // Track suspicious activity
  trackSuspiciousActivity(
    type: string,
    userId?: number,
    ipAddress?: string,
    details?: any
  ): void {
    this.metrics.suspiciousActivities++;

    this.logEvent({
      type: 'suspicious_activity',
      severity: 'warning',
      message: `Suspicious activity detected: ${type}`,
      metadata: { type, details },
      userId,
      ipAddress,
    });
  }

  // Track user session
  trackUserSession(userId: number, action: 'login' | 'logout'): void {
    if (action === 'login') {
      this.activeUserSessions.add(userId);
      this.logEvent({
        type: 'user_login',
        severity: 'info',
        message: 'User logged in',
        metadata: { action },
        userId,
      });
    } else {
      this.activeUserSessions.delete(userId);
      this.logEvent({
        type: 'user_logout',
        severity: 'info',
        message: 'User logged out',
        metadata: { action },
        userId,
      });
    }

    this.metrics.activeUsers = this.activeUserSessions.size;
  }

  // Get current metrics
  getMetrics(): MonitoringMetrics {
    return { ...this.metrics };
  }

  // Get recent events
  getRecentEvents(limit: number = 100, severity?: string): SecurityEvent[] {
    let events = this.events.slice(-limit).reverse();
    
    if (severity) {
      events = events.filter(e => e.severity === severity);
    }

    return events;
  }

  // Get events by type
  getEventsByType(type: string, limit: number = 100): SecurityEvent[] {
    return this.events
      .filter(e => e.type === type)
      .slice(-limit)
      .reverse();
  }

  // Get events by user
  getEventsByUser(userId: number, limit: number = 100): SecurityEvent[] {
    return this.events
      .filter(e => e.userId === userId)
      .slice(-limit)
      .reverse();
  }

  // Get threat timeline
  getThreatTimeline(hours: number = 24): {
    timestamp: Date;
    count: number;
    severity: string;
  }[] {
    const now = Date.now();
    const cutoff = now - hours * 60 * 60 * 1000;
    
    const timeline: Map<number, { count: number; severity: string }> = new Map();

    this.events
      .filter(e => e.timestamp.getTime() > cutoff)
      .forEach(event => {
        const hour = Math.floor(event.timestamp.getTime() / (60 * 60 * 1000));
        const existing = timeline.get(hour) || { count: 0, severity: 'low' };
        
        existing.count++;
        if (this.compareSeverity(event.severity, existing.severity) > 0) {
          existing.severity = event.severity;
        }
        
        timeline.set(hour, existing);
      });

    return Array.from(timeline.entries())
      .map(([hour, data]) => ({
        timestamp: new Date(hour * 60 * 60 * 1000),
        count: data.count,
        severity: data.severity,
      }))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  // Generate report
  generateReport(period: 'hour' | 'day' | 'week' = 'day'): {
    period: string;
    metrics: MonitoringMetrics;
    topThreats: { type: string; count: number }[];
    criticalEvents: SecurityEvent[];
    recommendations: string[];
  } {
    const hours = period === 'hour' ? 1 : period === 'day' ? 24 : 168;
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    
    const recentEvents = this.events.filter(
      e => e.timestamp.getTime() > cutoff
    );

    // Count threats by type
    const threatCounts: Map<string, number> = new Map();
    recentEvents.forEach(event => {
      threatCounts.set(event.type, (threatCounts.get(event.type) || 0) + 1);
    });

    const topThreats = Array.from(threatCounts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const criticalEvents = recentEvents
      .filter(e => e.severity === 'critical')
      .slice(-20)
      .reverse();

    const recommendations = this.generateRecommendations();

    return {
      period,
      metrics: this.metrics,
      topThreats,
      criticalEvents,
      recommendations,
    };
  }

  // Private methods
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private updateMetrics(event: SecurityEvent): void {
    // Update metrics based on event
    if (event.type === 'suspicious_activity') {
      this.metrics.suspiciousActivities++;
    }
  }

  private updateAverageResponseTime(): void {
    if (this.responseTimes.length === 0) return;
    
    const sum = this.responseTimes.reduce((a, b) => a + b, 0);
    this.metrics.averageResponseTime = sum / this.responseTimes.length;
  }

  private updateErrorRate(): void {
    if (this.metrics.totalRequests === 0) {
      this.metrics.errorRate = 0;
      return;
    }
    
    this.metrics.errorRate = 
      (this.metrics.failedRequests / this.metrics.totalRequests) * 100;
  }

  private updateThreatLevel(): void {
    const errorRate = this.metrics.errorRate;
    const blockedRate = 
      (this.metrics.blockedRequests / Math.max(this.metrics.totalRequests, 1)) * 100;
    const suspiciousRate = 
      (this.metrics.suspiciousActivities / Math.max(this.metrics.totalRequests, 1)) * 100;

    if (errorRate > 50 || blockedRate > 20 || suspiciousRate > 10) {
      this.metrics.threatLevel = 'critical';
    } else if (errorRate > 30 || blockedRate > 10 || suspiciousRate > 5) {
      this.metrics.threatLevel = 'high';
    } else if (errorRate > 10 || blockedRate > 5 || suspiciousRate > 2) {
      this.metrics.threatLevel = 'medium';
    } else {
      this.metrics.threatLevel = 'low';
    }
  }

  private compareSeverity(a: string, b: string): number {
    const levels = { info: 0, warning: 1, error: 2, critical: 3 };
    return (levels[a as keyof typeof levels] || 0) - (levels[b as keyof typeof levels] || 0);
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    if (this.metrics.errorRate > 10) {
      recommendations.push('High error rate detected. Review application logs and fix errors.');
    }

    if (this.metrics.blockedRequests > 100) {
      recommendations.push('Many requests are being blocked. Review security rules.');
    }

    if (this.metrics.suspiciousActivities > 50) {
      recommendations.push('Elevated suspicious activity. Consider enabling stricter security measures.');
    }

    if (this.metrics.averageResponseTime > 1000) {
      recommendations.push('Slow response times detected. Optimize application performance.');
    }

    if (this.metrics.threatLevel === 'critical' || this.metrics.threatLevel === 'high') {
      recommendations.push('High threat level. Immediate security review recommended.');
    }

    return recommendations;
  }

  private sendAlert(event: SecurityEvent): void {
    // TODO: Send email/SMS/Slack notification
    console.error('SECURITY ALERT:', event);
  }

  private startMonitoring(): void {
    // Reset metrics every hour
    setInterval(() => {
      this.metrics.totalRequests = 0;
      this.metrics.failedRequests = 0;
      this.metrics.blockedRequests = 0;
      this.metrics.suspiciousActivities = 0;
      this.responseTimes = [];
    }, 60 * 60 * 1000);

    // Clean up old events every day
    setInterval(() => {
      const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      this.events = this.events.filter(
        e => e.timestamp.getTime() > oneWeekAgo
      );
    }, 24 * 60 * 60 * 1000);

    // Update active users every 5 minutes
    setInterval(() => {
      this.metrics.activeUsers = this.activeUserSessions.size;
    }, 5 * 60 * 1000);
  }
}

// Export singleton instance
export const securityMonitor = new SecurityMonitor();

// Helper functions
export const logSecurityEvent = (
  type: string,
  severity: 'info' | 'warning' | 'error' | 'critical',
  message: string,
  metadata?: Record<string, any>,
  userId?: number,
  ipAddress?: string
) => {
  securityMonitor.logEvent({
    type,
    severity,
    message,
    metadata: metadata || {},
    userId,
    ipAddress,
  });
};

export const trackRequest = (
  userId?: number,
  ipAddress?: string,
  responseTime?: number,
  success: boolean = true
) => {
  securityMonitor.trackRequest(userId, ipAddress, responseTime, success);
};

export const trackSuspiciousActivity = (
  type: string,
  userId?: number,
  ipAddress?: string,
  details?: any
) => {
  securityMonitor.trackSuspiciousActivity(type, userId, ipAddress, details);
};
