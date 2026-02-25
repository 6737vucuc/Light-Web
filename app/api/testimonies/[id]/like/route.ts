import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { testimonies } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { verifyAuth } from '@/lib/auth/verify';
import { checkRateLimit, RateLimitConfigs, getClientIdentifier } from '@/lib/security/rate-limit';
import { detectVPN, getClientIP, shouldBlockIP } from '@/lib/security/vpn-detection';
import { ThreatDetection } from '@/lib/security/threat-detection';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/testimonies/[id]/like
 * Like a testimony with advanced security checks
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. AUTHENTICATION CHECK
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. RATE LIMITING (Strict for likes to prevent spam)
    const clientIdentifier = getClientIdentifier(request);
    const rateLimit = checkRateLimit(clientIdentifier, RateLimitConfigs.API);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' }, 
        { status: 429 }
      );
    }

    // 3. VPN DETECTION
    const clientIP = getClientIP(request);
    const vpnDetection = await detectVPN(clientIP);
    if (vpnDetection.isSuspicious && shouldBlockIP(vpnDetection)) {
      return NextResponse.json(
        { error: 'Access denied. VPN/Proxy connections are not allowed.' }, 
        { status: 403 }
      );
    }

    const { id } = params;
    const testimonyId = parseInt(id);

    // 4. UPDATE LIKES IN DATABASE
    // Using sql helper for atomic increment
    const result = await db
      .update(testimonies)
      .set({
        likes: sql`${testimonies.likes} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(testimonies.id, testimonyId))
      .returning();

    if (result.length === 0) {
      return NextResponse.json({ error: 'Testimony not found' }, { status: 404 });
    }

    // 5. LOG SUCCESSFUL INTERACTION
    console.log('Testimony liked securely', {
      userId: user.id,
      testimonyId,
      ip: clientIP,
      newLikes: result[0].likes
    });

    return NextResponse.json({ 
      success: true, 
      likes: result[0].likes,
      message: 'Testimony liked successfully'
    });
  } catch (error) {
    console.error('Like testimony error:', error);
    return NextResponse.json(
      { error: 'Failed to like testimony' }, 
      { status: 500 }
    );
  }
}
