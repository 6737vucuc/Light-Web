export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createToken } from '@/lib/auth/jwt';
import { sendAccountLockoutAlert } from '@/lib/security-email';
import { detectVPN, shouldBlockConnection, getBlockReason } from '@/lib/utils/vpn-detection';
import { vpnLogs, securityLogs } from '@/lib/db/schema';
import { Internal2FA } from '@/lib/auth/internal-2fa';

import { checkRateLimit, getClientIdentifier, createRateLimitResponse, RateLimitConfigs } from '@/lib/security/rate-limit';

// Account lockout configuration
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 30;

export async function POST(request: NextRequest) {
  try {
    // Get client IP and User Agent
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    // VPN Detection - Run in background
    const performVPNDetection = async () => {
      try {
        const vpnResult = await detectVPN(clientIp);
        if (vpnResult) {
          const shouldBlock = shouldBlockConnection(vpnResult);
          try {
            await db.insert(vpnLogs).values({
              userId: null,
              ipAddress: vpnResult.ipAddress || clientIp,
              country: vpnResult.country || null,
              isVPN: vpnResult.isVPN || false,
              isBlocked: shouldBlock,
              blockReason: shouldBlock ? getBlockReason(vpnResult) : null,
              userAgent: userAgent,
              requestPath: '/api/auth/login',
              requestMethod: 'POST',
            });
          } catch (logError) {
            console.error('VPN log insert failed:', logError);
          }
        }
      } catch (vpnError) {
        console.error('VPN detection failed:', vpnError);
      }
    };
    
    performVPNDetection().catch(err => console.error('Background VPN detection error:', err));
    
    // Apply rate limiting
    const clientId = getClientIdentifier(request);
    let rateLimit = { allowed: true, remaining: 10, resetTime: Date.now() + 300000 };
    
    try {
      rateLimit = checkRateLimit(clientId, RateLimitConfigs.AUTH);
      if (!rateLimit.allowed) {
        return createRateLimitResponse(rateLimit.resetTime);
      }
    } catch (e) {
      console.error('Rate limit check failed:', e);
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const { email, password, twoFactorCode, trustDevice, persistentDeviceId } = body;

    // Input validation
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Find user
    let user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase().trim()),
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Check account lockout
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      return NextResponse.json({ error: 'Account temporarily locked' }, { status: 423 });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      const newFailedAttempts = (user.failedLoginAttempts || 0) + 1;
      const now = new Date();
      
      if (newFailedAttempts >= MAX_FAILED_ATTEMPTS) {
        const lockedUntil = new Date(now.getTime() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
        await db.update(users).set({ failedLoginAttempts: newFailedAttempts, lockedUntil }).where(eq(users.id, user.id));
        
        // Log security event
        await db.insert(securityLogs).values({
          userId: user.id,
          event: 'account_locked',
          ipAddress: clientIp,
          userAgent: userAgent,
          details: { attempts: newFailedAttempts }
        });

        await sendAccountLockoutAlert(user.name, user.email, MAX_FAILED_ATTEMPTS, LOCKOUT_DURATION_MINUTES);
        return NextResponse.json({ error: 'Account locked' }, { status: 423 });
      } else {
        await db.update(users).set({ failedLoginAttempts: newFailedAttempts }).where(eq(users.id, user.id));
        
        // Log security event
        await db.insert(securityLogs).values({
          userId: user.id,
          event: 'login_failed',
          ipAddress: clientIp,
          userAgent: userAgent,
          details: { attempt: newFailedAttempts }
        });

        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }
    }

    // --- NEW INTERNAL 2FA SYSTEM ---
    
    // Use persistent device ID from client if available, otherwise generate one
    const deviceId = persistentDeviceId || Internal2FA.generateDeviceId(userAgent, clientIp);
    const isTrusted = await Internal2FA.isDeviceTrusted(user.id, deviceId);

    // If 2FA is enabled for all users (or this user) and device is NOT trusted
    if (!isTrusted) {
      // If code not provided, send it and ask for it
      if (!twoFactorCode) {
        await Internal2FA.sendCode(user.id, user.email, user.name, clientIp, userAgent);
        return NextResponse.json({
          requires2FA: true,
          method: 'email',
          message: 'A verification code has been sent to your email as this is a new device.'
        }, { status: 200 });
      }

      // Verify the provided code
      const isCodeValid = await Internal2FA.verifyCode(user.id, twoFactorCode);
      if (!isCodeValid) {
        return NextResponse.json({ error: 'Invalid or expired verification code' }, { status: 401 });
      }

      // If user checked "Trust this device", add it to trusted devices
      if (trustDevice) {
        await Internal2FA.trustDevice(user.id, deviceId, {
          browser: userAgent,
          ip: clientIp,
          location: 'Detected'
        }, user.email, user.name);
      }
    }

    // --- END INTERNAL 2FA SYSTEM ---

    // Reset failed attempts
    await db.update(users).set({
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastSeen: new Date(),
    }).where(eq(users.id, user.id));

    // Log security event
    await db.insert(securityLogs).values({
      userId: user.id,
      event: 'login_success',
      ipAddress: clientIp,
      userAgent: userAgent,
      location: 'Detected'
    });

    // Create JWT token
    const token = await createToken({
      userId: user.id,
      email: user.email,
      isAdmin: user.isAdmin,
      name: user.name,
      avatar: user.avatar,
    });

    const response = NextResponse.json({
      message: 'Login successful',
      user: { id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin },
      deviceId: deviceId // Return the deviceId to be stored on client
    });

    // Set Cookies
    const cookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: 'lax' as const,
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    };

    response.cookies.set('auth_token', token, cookieOptions);
    response.cookies.set('token', token, cookieOptions);

    return response;
  } catch (error: any) {
    console.error('CRITICAL LOGIN ERROR:', error);
    return NextResponse.json({ error: 'An error occurred during login' }, { status: 500 });
  }
}
