import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, passwordResets, securityLogs } from '@/lib/db/schema';
import { eq, and, gt } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { checkRateLimit, RateLimitConfigs, getClientIdentifier } from '@/lib/security/rate-limit';
import { detectVPN, getClientIP, shouldBlockIP } from '@/lib/security/vpn-detection';
import { ThreatDetection } from '@/lib/security/threat-detection';
import { getGeoLocation } from '@/lib/utils/geolocation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // 1. RATE LIMITING
    const clientId = getClientIdentifier(request);
    const rateLimit = checkRateLimit(clientId, RateLimitConfigs.AUTH);
    
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many password reset attempts. Please try again later.' }, 
        { status: 429 }
      );
    }

    // 2. VPN DETECTION
    const clientIP = getClientIP(request);
    const vpnDetection = await detectVPN(clientIP);
    if (vpnDetection.isSuspicious && shouldBlockIP(vpnDetection)) {
      ThreatDetection.logThreat({
        userId: null,
        ipAddress: clientIP,
        threatType: 'vpn_password_reset_confirm',
        severity: 'high',
        description: `VPN/Proxy password reset confirmation attempt`,
        timestamp: new Date(),
        blocked: true,
      });
      return NextResponse.json(
        { error: 'VPN/Proxy connections are not allowed for resetting passwords.' }, 
        { status: 403 }
      );
    }

    const body = await request.json();
    const { token, newPassword } = body;

    if (!token || !newPassword) {
      return NextResponse.json(
        { error: 'Token and new password are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Check password complexity
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumbers = /\d/.test(newPassword);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      return NextResponse.json(
        { error: 'Password must contain uppercase, lowercase, and numbers' },
        { status: 400 }
      );
    }

    // Hash the token to compare with database
    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find valid reset token
    const resetRecord = await db.query.passwordResets.findFirst({
      where: and(
        eq(passwordResets.token, resetTokenHash),
        gt(passwordResets.expiresAt, new Date())
      ),
    });

    if (!resetRecord) {
      ThreatDetection.logThreat({
        userId: null,
        ipAddress: clientIP,
        threatType: 'invalid_reset_token',
        severity: 'medium',
        description: `Invalid or expired reset token attempt`,
        timestamp: new Date(),
        blocked: true,
      });
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    // Get user info for logging
    const user = await db.query.users.findFirst({
      where: eq(users.id, resetRecord.user_id)
    });

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    await db
      .update(users)
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(eq(users.id, resetRecord.user_id));

    // Delete used reset token
    await db
      .delete(passwordResets)
      .where(eq(passwordResets.id, resetRecord.id));

    // Log successful password reset
    if (user) {
      const geo = await getGeoLocation(clientIP);
      await db.insert(securityLogs).values({
        userId: user.id,
        event: 'password_reset_completed',
        ipAddress: clientIP,
        userAgent: request.headers.get('user-agent') || 'unknown',
        location: geo.formatted || 'Unknown',
        details: { timestamp: new Date().toISOString() }
      }).catch(err => console.error('Security log error:', err));

      console.log('Password reset completed securely', {
        userId: user.id,
        ip: clientIP,
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json({
      message: 'Password reset successfully. You can now log in with your new password.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    );
  }
}
