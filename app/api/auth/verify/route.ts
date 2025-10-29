import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, verificationCodes } from '@/lib/db/schema';
import { eq, and, gt } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, code } = body;

    if (!email || !code) {
      return NextResponse.json(
        { error: 'Email and code are required' },
        { status: 400 }
      );
    }

    // Find verification code
    const verificationCode = await db.query.verificationCodes.findFirst({
      where: and(
        eq(verificationCodes.email, email),
        eq(verificationCodes.code, code),
        gt(verificationCodes.expiresAt, new Date())
      ),
    });

    if (!verificationCode) {
      return NextResponse.json(
        { error: 'Invalid or expired verification code' },
        { status: 400 }
      );
    }

    // Update user email verification status
    await db
      .update(users)
      .set({ emailVerified: true })
      .where(eq(users.email, email));

    // Delete used verification code
    await db
      .delete(verificationCodes)
      .where(eq(verificationCodes.id, verificationCode.id));

    return NextResponse.json({
      message: 'Email verified successfully',
    });
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json(
      { error: 'An error occurred during verification' },
      { status: 500 }
    );
  }
}

