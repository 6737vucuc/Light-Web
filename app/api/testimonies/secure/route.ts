import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { testimonies, users } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { verifyAuth } from '@/lib/auth/verify';
import { checkRateLimit, RateLimitConfigs, getClientIdentifier } from '@/lib/security/rate-limit';
import { detectVPN, getClientIP, shouldBlockIP } from '@/lib/security/vpn-detection';
import { ThreatDetection } from '@/lib/security/threat-detection';
import { InputValidator } from '@/lib/security/input-validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/testimonies/secure
 * Fetch approved testimonies with advanced security checks
 * - VPN Detection
 * - Rate Limiting
 * - Threat Detection
 * - Input Validation
 * - Authentication Check
 */
export async function GET(request: NextRequest) {
  try {
    // 1. AUTHENTICATION CHECK
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in to view testimonies.' },
        { status: 401 }
      );
    }

    // 2. RATE LIMITING
    const clientIdentifier = getClientIdentifier(request);
    const rateLimit = checkRateLimit(clientIdentifier, RateLimitConfigs.API);
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Too many requests. Please try again later.',
          retryAfter: Math.ceil((rateLimit.resetTime - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimit.resetTime - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    // 3. VPN DETECTION
    const clientIP = getClientIP(request);
    const vpnDetection = await detectVPN(clientIP);
    
    if (vpnDetection.isSuspicious) {
      // Log VPN detection for security monitoring
      console.warn('SECURITY: VPN/Proxy detected for testimonies access', {
        userId: user.id,
        ip: clientIP,
        type: vpnDetection.isVPN ? 'VPN' : vpnDetection.isProxy ? 'Proxy' : 'Other',
        country: vpnDetection.country,
        service: vpnDetection.service,
      });

      // Block if using VPN/Proxy/Tor
      if (shouldBlockIP(vpnDetection)) {
        ThreatDetection.logThreat({
          userId: user.id,
          ipAddress: clientIP,
          threatType: 'vpn_access_attempt',
          severity: 'medium',
          description: `VPN/Proxy access attempt to testimonies: ${vpnDetection.service || 'Unknown'}`,
          timestamp: new Date(),
          blocked: true,
        });

        return NextResponse.json(
          {
            error: 'Access denied. VPN/Proxy connections are not allowed for security reasons.',
            details: 'Please disable your VPN and try again.',
          },
          { status: 403 }
        );
      }
    }

    // 4. THREAT DETECTION - Check for suspicious patterns
    const userAgent = request.headers.get('user-agent') || '';
    if (ThreatDetection.detectBot(userAgent, {})) {
      ThreatDetection.logThreat({
        userId: user.id,
        ipAddress: clientIP,
        threatType: 'bot_activity',
        severity: 'medium',
        description: 'Bot activity detected accessing testimonies',
        timestamp: new Date(),
        blocked: false,
      });
    }

    // 5. FETCH APPROVED TESTIMONIES
    const result = await db
      .select({
        id: testimonies.id,
        userId: testimonies.userId,
        userName: users.name,
        userAvatar: users.avatar,
        content: testimonies.content,
        religion: testimonies.religion,
        createdAt: testimonies.createdAt,
        approvedAt: testimonies.approvedAt,
        likes: testimonies.id,
      })
      .from(testimonies)
      .leftJoin(users, eq(testimonies.userId, users.id))
      .where(eq(testimonies.isApproved, true))
      .orderBy(desc(testimonies.createdAt));

    // 6. VALIDATE AND SANITIZE CONTENT
    const safeTestimonies = result
      .filter(t => t.content && t.content.trim().length > 0)
      .map(t => {
        // Validate content length
        if (!InputValidator.isValidContent(t.content, 5000)) {
          return null;
        }

        // Check for malicious patterns
        if (InputValidator.containsMaliciousPattern(t.content)) {
          console.warn('Malicious pattern detected in testimony:', t.id);
          return null;
        }

        return {
          id: t.id,
          userId: t.userId,
          userName: t.userName || 'Anonymous User',
          userAvatar: t.userAvatar || null,
          content: t.content,
          religion: t.religion || 'Christian',
          createdAt: t.createdAt,
          approvedAt: t.approvedAt,
          likes: 0,
        };
      })
      .filter(t => t !== null);

    // 7. LOG SUCCESSFUL ACCESS
    console.log('Testimonies accessed securely', {
      userId: user.id,
      ip: clientIP,
      count: safeTestimonies.length,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      testimonies: safeTestimonies,
      security: {
        vpnDetected: vpnDetection.isSuspicious,
        rateLimit: {
          remaining: rateLimit.remaining,
          resetTime: new Date(rateLimit.resetTime).toISOString(),
        },
      },
    });
  } catch (error) {
    console.error('Get testimonies error:', error);
    
    ThreatDetection.logThreat({
      ipAddress: getClientIP(request),
      threatType: 'api_error',
      severity: 'low',
      description: `Error fetching testimonies: ${error instanceof Error ? error.message : 'Unknown'}`,
      timestamp: new Date(),
      blocked: false,
    });

    return NextResponse.json(
      { error: 'Failed to fetch testimonies', testimonies: [] },
      { status: 500 }
    );
  }
}
