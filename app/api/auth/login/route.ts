export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createToken } from '@/lib/auth/jwt';
import { sendAccountLockoutNotification } from '@/lib/utils/email';

import { checkRateLimit, getClientIdentifier, createRateLimitResponse, RateLimitConfigs } from '@/lib/security/rate-limit';

// Account lockout configuration
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 30;

export async function POST(request: NextRequest) {
  try {
    // VPN Detection temporarily disabled for debugging
    // TODO: Re-enable after fixing JSON response issue
    
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
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400, headers: { 'Content-Type': 'application/json' } }
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
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if account is locked
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      const remainingMinutes = Math.ceil(
        (new Date(user.lockedUntil).getTime() - new Date().getTime()) / (1000 * 60)
      );
      
      console.warn(`Login attempt on locked account: ${email} from IP: ${clientId}`);
      
      return NextResponse.json(
        {
          error: 'Account temporarily locked',
          message: `Your account has been locked due to multiple failed login attempts. Please try again in ${remainingMinutes} minutes.`,
          lockedUntil: user.lockedUntil,
        },
        { status: 423, headers: { 'Content-Type': 'application/json' } } // 423 Locked
      );
    }

    // Check if email is verified
    if (!user.emailVerified) {
      return NextResponse.json(
        { error: 'Please verify your email first' },
        { status: 401, headers: { 'Content-Type': 'application/json' } }
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
          { status: 403, headers: { 'Content-Type': 'application/json' } }
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
      // Increment failed login attempts
      const newFailedAttempts = (user.failedLoginAttempts || 0) + 1;
      const now = new Date();
      
      // Check if we should lock the account
      if (newFailedAttempts >= MAX_FAILED_ATTEMPTS) {
        const lockedUntil = new Date(now.getTime() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
        
        await db
          .update(users)
          .set({
            failedLoginAttempts: newFailedAttempts,
            lastFailedLogin: now,
            lockedUntil: lockedUntil,
          })
          .where(eq(users.id, user.id));
        
        console.warn(`Account locked due to ${newFailedAttempts} failed attempts: ${email} from IP: ${clientId}`);
        
        // Send email notification about account lockout
        try {
          await sendAccountLockoutNotification(
            user.email,
            user.name,
            clientId,
            lockedUntil
          );
          console.log(`Account lockout notification sent to: ${email}`);
        } catch (emailError) {
          console.error('Failed to send account lockout notification:', emailError);
          // Don't fail the request if email fails
        }
        
        return NextResponse.json(
          {
            error: 'Account locked',
            message: `Your account has been locked for ${LOCKOUT_DURATION_MINUTES} minutes due to multiple failed login attempts.`,
            lockedUntil: lockedUntil,
          },
          { status: 423, headers: { 'Content-Type': 'application/json' } }
        );
      } else {
        // Just increment the counter
        await db
          .update(users)
          .set({
            failedLoginAttempts: newFailedAttempts,
            lastFailedLogin: now,
          })
          .where(eq(users.id, user.id));
        
        const remainingAttempts = MAX_FAILED_ATTEMPTS - newFailedAttempts;
        
        console.warn(`Failed login attempt ${newFailedAttempts}/${MAX_FAILED_ATTEMPTS} for email: ${email} from IP: ${clientId}`);
        
        return NextResponse.json(
          {
            error: 'Invalid email or password',
            message: `Invalid credentials. ${remainingAttempts} attempt(s) remaining before account lockout.`,
            remainingAttempts,
          },
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Password is correct - reset failed attempts and unlock if needed
    await db
      .update(users)
      .set({
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastFailedLogin: null,
        lastSeen: new Date(),
      })
      .where(eq(users.id, user.id));

    // Create JWT token with minimal payload
    const token = await createToken({
      userId: user.id,
      email: user.email,
      isAdmin: user.isAdmin,
    });

    // Create response with minimal user data
    const response = NextResponse.json(
      {
        message: 'Login successful',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          isAdmin: user.isAdmin,
        },
      },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

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

    console.log(`Successful login for: ${email} from IP: ${clientId}`);

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { 
        error: 'An error occurred during login',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}
