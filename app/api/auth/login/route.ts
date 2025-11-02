export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { users, vpnLogs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createToken } from '@/lib/auth/jwt';
import { detectVPN, getClientIP } from '@/lib/utils/vpn';
import { checkRateLimit, getClientIdentifier, createRateLimitResponse, RateLimitConfigs } from '@/lib/security/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting - strict for login attempts
    const clientId = getClientIdentifier(request);
    const rateLimit = checkRateLimit(clientId, RateLimitConfigs.AUTH);
    
    if (!rateLimit.allowed) {
      console.warn(`Rate limit exceeded for login attempt from: ${clientId}`);
      return createRateLimitResponse(rateLimit.resetTime);
    }

    const body = await request.json();
    const { email, password } = body;

    // Input validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Find user
    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase().trim()),
    });

    if (!user) {
      // Use generic error message to prevent user enumeration
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check if email is verified
    if (!user.emailVerified) {
      return NextResponse.json(
        { error: 'Please verify your email first' },
        { status: 401 }
      );
    }

    // Check if user is banned
    if (user.isBanned) {
      if (user.bannedUntil && new Date(user.bannedUntil) > new Date()) {
        return NextResponse.json(
          {
            error: 'Your account has been banned',
            bannedUntil: user.bannedUntil,
            message: `Your account has been banned. Please come back after ${new Date(user.bannedUntil).toLocaleDateString('en-US')}`,
          },
          { status: 403 }
        );
      } else {
        // Unban user if ban period has expired
        await db
          .update(users)
          .set({ isBanned: false, bannedUntil: null })
          .where(eq(users.id, user.id));
      }
    }

    // Verify password - use constant-time comparison
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      // Log failed login attempt
      console.warn(`Failed login attempt for email: ${email} from IP: ${clientId}`);
      
      // Use generic error message to prevent user enumeration
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Detect VPN (non-blocking)
    const clientIP = getClientIP(request);
    let vpnDetection = { isVpn: false, data: null };
    
    // Run VPN detection in background without blocking login
    detectVPN(clientIP)
      .then(async (detection) => {
        vpnDetection = detection;
        // Log VPN detection asynchronously
        try {
          await db.insert(vpnLogs).values({
            userId: user.id,
            ipAddress: clientIP,
            isVpn: detection.isVpn,
            vpnData: detection.data,
            action: 'login',
          });
        } catch (error) {
          console.error('VPN logging error:', error);
        }
      })
      .catch((error) => {
        console.error('VPN detection error:', error);
      });

    // Create JWT token with minimal payload
    const token = await createToken({
      userId: user.id,
      email: user.email,
      isAdmin: user.isAdmin,
    });

    // Update last seen
    await db
      .update(users)
      .set({ lastSeen: new Date() })
      .where(eq(users.id, user.id));

    // Create response with minimal user data
    const response = NextResponse.json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        isAdmin: user.isAdmin,
      },
      vpnDetected: vpnDetection.isVpn,
    });

    // Set secure cookie with strict settings
    response.cookies.set('token', token, {
      httpOnly: true, // Prevent XSS attacks
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'strict', // Prevent CSRF attacks
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/', // Available across the entire site
    });

    // Add rate limit headers
    response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString());
    response.headers.set('X-RateLimit-Reset', new Date(rateLimit.resetTime).toISOString());

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    );
  }
}
