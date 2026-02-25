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
    
    if (vpnDetection.isSuspicious && shouldBlockIP(vpnDetection)) {
      return NextResponse.json(
        {
          error: 'Access denied. VPN/Proxy connections are not allowed for security reasons.',
          details: 'Please disable your VPN and try again.',
        },
        { status: 403 }
      );
    }

    // 4. FETCH APPROVED TESTIMONIES
    // Use leftJoin to ensure we get testimonies even if user data is missing
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
        isApproved: testimonies.isApproved,
      })
      .from(testimonies)
      .leftJoin(users, eq(testimonies.userId, users.id))
      .where(eq(testimonies.isApproved, true))
      .orderBy(desc(testimonies.createdAt));

    // 5. VALIDATE AND SANITIZE CONTENT
    const safeTestimonies = result
      .filter(t => t.content && t.content.trim().length > 0)
      .map(t => {
        // Basic sanitization and validation
        if (InputValidator.containsMaliciousPattern(t.content)) {
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
    return NextResponse.json(
      { error: 'Failed to fetch testimonies', testimonies: [] },
      { status: 500 }
    );
  }
}
