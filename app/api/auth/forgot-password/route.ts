import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, passwordResets } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
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
      userId: user.id,
      token: resetTokenHash,
      expiresAt,
    });

    // Send email (using environment variables for email service)
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/reset-password?token=${resetToken}`;
    
    // Here you would integrate with an email service like SendGrid, Resend, etc.
    // For now, we'll log it (in production, send actual email)
    console.log('Password reset link:', resetUrl);
    
    // Example email content
    const emailContent = `
      Hello ${user.name},
      
      You requested to reset your password. Click the link below to reset it:
      
      ${resetUrl}
      
      This link will expire in 1 hour.
      
      If you didn't request this, please ignore this email.
      
      Best regards,
      Light of Life Team
    `;

    // TODO: Send actual email using your email service
    // await sendEmail({
    //   to: user.email,
    //   subject: 'Reset Your Password',
    //   text: emailContent,
    // });

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
