import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, passwordResets } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '@/lib/email';
import { checkRateLimit, getClientIdentifier, createRateLimitResponse, RateLimitConfigs } from '@/lib/security/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const clientId = getClientIdentifier(request);
    const rateLimit = checkRateLimit(clientId, RateLimitConfigs.AUTH);
    
    if (!rateLimit.allowed) {
      return createRateLimitResponse(rateLimit.resetTime);
    }

    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        message: 'If an account exists with this email, you will receive a password reset link.',
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour

    // Save reset token to database
    await db.insert(passwordResets).values({
      user_id: user.id,
      token: resetTokenHash,
      expiresAt,
    });

    // Create reset URL
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/reset-password?token=${resetToken}`;
    
    // Send email using Nodemailer
    try {
      await sendPasswordResetEmail(user.email, user.name, resetUrl);
      console.log('Password reset email sent successfully to:', user.email);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      // Still return success to prevent email enumeration
      // In production, you might want to log this error for monitoring
    }

    return NextResponse.json({
      message: 'If an account exists with this email, you will receive a password reset link.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
