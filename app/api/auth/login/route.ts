import { NextRequest, NextResponse } from 'next/server';
import { verify } from 'argon2';
import { db } from '@/lib/db';
import { users, vpnLogs } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createToken } from '@/lib/auth/jwt';
import { detectVPN, getClientIP } from '@/lib/utils/vpn';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find user
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) {
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

    // Verify password
    const isValidPassword = await verify(user.password, password);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Detect VPN
    const clientIP = getClientIP(request);
    const vpnDetection = await detectVPN(clientIP);

    // Log VPN detection
    await db.insert(vpnLogs).values({
      userId: user.id,
      ipAddress: clientIP,
      isVpn: vpnDetection.isVpn,
      vpnData: vpnDetection.data,
    });

    // Create JWT token
    const token = await createToken({
      userId: user.id,
      email: user.email,
      isAdmin: user.isAdmin,
    });

    // Create response
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

    // Set cookie
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'An error occurred during login' },
      { status: 500 }
    );
  }
}

