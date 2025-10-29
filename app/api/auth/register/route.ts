import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'argon2';
import { db } from '@/lib/db';
import { users, verificationCodes } from '@/lib/db/schema';
import { sendVerificationCode, generateVerificationCode } from '@/lib/utils/email';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password, religion, birthDate, gender, country } = body;
    
    // Extract first and last name from full name
    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Validate input
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Check password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      );
    }

    // Generate verification code
    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Save verification code
    await db.insert(verificationCodes).values({
      email,
      code,
      expiresAt,
    });

    // Send verification email
    await sendVerificationCode(email, code, firstName || name);

    // Hash password
    const hashedPassword = await hash(password);

    // Store user data temporarily (will be activated after verification)
    await db.insert(users).values({
      name,
      firstName,
      lastName,
      birthDate: birthDate || null,
      email,
      password: hashedPassword,
      religion,
      gender,
      country,
      emailVerified: false,
    });

    return NextResponse.json({
      message: 'Verification code sent to your email',
      email,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'An error occurred during registration' },
      { status: 500 }
    );
  }
}

