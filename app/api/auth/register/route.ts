import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { users, verificationCodes } from '@/lib/db/schema';
import { sendVerificationCode, generateVerificationCode } from '@/lib/utils/email';
import { eq } from 'drizzle-orm';
import { checkRateLimit, getClientIdentifier, createRateLimitResponse, RateLimitConfigs } from '@/lib/security/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // Apply strict rate limiting for registration
    const clientId = getClientIdentifier(request);
    const rateLimit = checkRateLimit(clientId, RateLimitConfigs.REGISTER);
    
    if (!rateLimit.allowed) {
      console.warn(`Rate limit exceeded for registration attempt from: ${clientId}`);
      return createRateLimitResponse(rateLimit.resetTime);
    }

    const body = await request.json();
    const { name, email, password, religion, birthDate, gender, country } = body;
    
    // Extract first and last name from full name
    const nameParts = name?.trim().split(' ') || [];
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Comprehensive input validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Name validation
    if (name.trim().length < 2 || name.trim().length > 100) {
      return NextResponse.json(
        { error: 'Name must be between 2 and 100 characters' },
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

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Strong password validation
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Check password complexity
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      return NextResponse.json(
        { error: 'Password must contain uppercase, lowercase, and numbers' },
        { status: 400 }
      );
    }

    // Check for common weak passwords
    const weakPasswords = ['password', '12345678', 'qwerty123', 'abc123456'];
    if (weakPasswords.some(weak => password.toLowerCase().includes(weak))) {
      return NextResponse.json(
        { error: 'Password is too weak. Please choose a stronger password' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, normalizedEmail),
    });

    if (existingUser) {
      // Use generic message to prevent user enumeration
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
      email: normalizedEmail,
      code,
      expiresAt,
    });

    // Send verification email
    try {
      await sendVerificationCode(normalizedEmail, code, firstName || name);
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      return NextResponse.json(
        { error: 'Failed to send verification email. Please try again.' },
        { status: 500 }
      );
    }

    // Hash password with bcrypt (secure and compatible with Vercel)
    const hashedPassword = await bcrypt.hash(password, 12);

    // Store user data temporarily (will be activated after verification)
    await db.insert(users).values({
      name: name.trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      birthDate: birthDate || null,
      email: normalizedEmail,
      password: hashedPassword,
      religion: religion || null,
      gender: gender || null,
      country: country || null,
      emailVerified: false,
      isAdmin: false,
      isBanned: false,
    });

    // Log successful registration (without sensitive data)
    console.log(`New user registered: ${normalizedEmail} from IP: ${clientId}`);

    const response = NextResponse.json({
      message: 'Verification code sent to your email',
      email: normalizedEmail,
    });

    // Add rate limit headers
    response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString());
    response.headers.set('X-RateLimit-Reset', new Date(rateLimit.resetTime).toISOString());

    return response;
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'An error occurred during registration' },
      { status: 500 }
    );
  }
}
