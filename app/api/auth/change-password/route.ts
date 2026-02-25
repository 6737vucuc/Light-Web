import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { users, securityLogs } from '@/lib/db/schema';
import { verifyAuth } from '@/lib/auth/verify';
import { eq } from 'drizzle-orm';
import { checkRateLimit, RateLimitConfigs, getClientIdentifier } from '@/lib/security/rate-limit';
import { detectVPN, getClientIP, shouldBlockIP } from '@/lib/security/vpn-detection';
import { ThreatDetection } from '@/lib/security/threat-detection';
import { getGeoLocation } from '@/lib/utils/geolocation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. RATE LIMITING - Strict for password changes
    const clientIdentifier = getClientIdentifier(request);
    const rateLimit = checkRateLimit(clientIdentifier, RateLimitConfigs.AUTH);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many password change attempts. Please try again later.' }, 
        { status: 429 }
      );
    }

    // 2. VPN DETECTION
    const clientIP = getClientIP(request);
    const vpnDetection = await detectVPN(clientIP);
    if (vpnDetection.isSuspicious && shouldBlockIP(vpnDetection)) {
      ThreatDetection.logThreat({
        userId: user.userId,
        ipAddress: clientIP,
        threatType: 'vpn_password_change',
        severity: 'high',
        description: `VPN/Proxy password change attempt`,
        timestamp: new Date(),
        blocked: true,
      });

      // Log security event
      const geo = await getGeoLocation(clientIP);
      await db.insert(securityLogs).values({
        userId: user.userId,
        event: 'password_change_blocked_vpn',
        ipAddress: clientIP,
        userAgent: request.headers.get('user-agent') || 'unknown',
        location: geo.formatted || 'Unknown',
        details: { reason: 'VPN/Proxy detected' }
      }).catch(err => console.error('Security log error:', err));

      return NextResponse.json(
        { error: 'VPN/Proxy connections are not allowed for changing passwords.' }, 
        { status: 403 }
      );
    }

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    // 3. INPUT VALIDATION
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current password and new password are required' },
        { status: 400 }
      );
    }

    // Password validation
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumbers = /\d/.test(newPassword);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      return NextResponse.json(
        { error: 'Password must contain uppercase, lowercase, and numbers' },
        { status: 400 }
      );
    }

    // Prevent reusing the same password
    if (currentPassword === newPassword) {
      return NextResponse.json(
        { error: 'New password must be different from current password' },
        { status: 400 }
      );
    }

    // Get current user data
    const currentUser = await db.query.users.findFirst({
      where: eq(users.id, user.userId),
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, currentUser.password);
    if (!isValidPassword) {
      // Log failed password change attempt
      const geo = await getGeoLocation(clientIP);
      await db.insert(securityLogs).values({
        userId: user.userId,
        event: 'password_change_failed',
        ipAddress: clientIP,
        userAgent: request.headers.get('user-agent') || 'unknown',
        location: geo.formatted || 'Unknown',
        details: { reason: 'Invalid current password' }
      }).catch(err => console.error('Security log error:', err));

      ThreatDetection.logThreat({
        userId: user.userId,
        ipAddress: clientIP,
        threatType: 'invalid_password_change',
        severity: 'medium',
        description: `Invalid current password during password change attempt`,
        timestamp: new Date(),
        blocked: false,
      });

      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 401 }
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await db
      .update(users)
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(eq(users.id, user.userId));

    // Log successful password change
    const geo = await getGeoLocation(clientIP);
    await db.insert(securityLogs).values({
      userId: user.userId,
      event: 'password_changed',
      ipAddress: clientIP,
      userAgent: request.headers.get('user-agent') || 'unknown',
      location: geo.formatted || 'Unknown',
      details: { timestamp: new Date().toISOString() }
    }).catch(err => console.error('Security log error:', err));

    console.log('Password changed securely', {
      userId: user.userId,
      ip: clientIP,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json(
      { error: 'Failed to change password' },
      { status: 500 }
    );
  }
}
