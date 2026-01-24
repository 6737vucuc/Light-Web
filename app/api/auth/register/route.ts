import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { checkRateLimit, getClientIdentifier, createRateLimitResponse, RateLimitConfigs } from '@/lib/security/rate-limit';
import { createToken } from '@/lib/auth/jwt';
import { sendVerificationCode, generateVerificationCode } from '@/lib/utils/email';
import { verificationCodes, vpnLogs } from '@/lib/db/schema';
import { detectVPN, shouldBlockConnection, getBlockReason } from '@/lib/utils/vpn-detection';

export async function POST(request: NextRequest) {
  try {
    // Get client IP
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    
    // VPN Detection with error handling
    let vpnResult;
    let shouldBlock = false;
    
    try {
      vpnResult = await detectVPN(clientIp);
      shouldBlock = shouldBlockConnection(vpnResult);
    } catch (vpnError) {
      console.error('VPN detection failed:', vpnError);
      // On VPN detection error, allow registration (fail-open)
      vpnResult = {
        ipAddress: clientIp,
        isVPN: false,
        isTor: false,
        isProxy: false,
        isHosting: false,
        isAnonymous: false,
        riskScore: 0,
        threatLevel: 'low' as const,
        detectionService: 'error',
        detectionData: { error: vpnError instanceof Error ? vpnError.message : 'Unknown error' },
      };
    }
    
    // Log VPN detection
    try {
      await db.insert(vpnLogs).values({
        userId: null,
        ipAddress: vpnResult.ipAddress,
        country: vpnResult.country,
        countryCode: vpnResult.countryCode,
        city: vpnResult.city,
        region: vpnResult.region,
        isp: vpnResult.isp,
        organization: vpnResult.organization,
        asn: vpnResult.asn,
        isVPN: vpnResult.isVPN,
        isTor: vpnResult.isTor,
        isProxy: vpnResult.isProxy,
        isHosting: vpnResult.isHosting,
        isAnonymous: vpnResult.isAnonymous,
        riskScore: vpnResult.riskScore,
        threatLevel: vpnResult.threatLevel,
        detectionService: vpnResult.detectionService,
        detectionData: vpnResult.detectionData ? JSON.stringify(vpnResult.detectionData) : null,
        isBlocked: shouldBlock,
        blockReason: shouldBlock ? getBlockReason(vpnResult) : null,
        userAgent: request.headers.get('user-agent') || null,
        requestPath: '/api/auth/register',
        requestMethod: 'POST',
      });
    } catch (logError) {
      console.error('Failed to log VPN detection:', logError);
    }
    
    // Block if VPN/Tor detected
    if (shouldBlock) {
      return NextResponse.json(
        { 
          error: getBlockReason(vpnResult),
          vpnDetected: true,
          threatLevel: vpnResult.threatLevel,
        },
        { status: 403 }
      );
    }
    
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
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      );
    }

    // Hash password with 10 rounds
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with email verification pending (emailVerified: false)
    const [newUser] = await db.insert(users).values({
      name: name.trim(),
      username: normalizedEmail.split('@')[0] + Math.floor(Math.random() * 10000),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      birthDate: birthDate || null,
      email: normalizedEmail,
      password: hashedPassword,
      religion: religion || null,
      gender: gender || null,
      country: country || null,
      emailVerified: false, // يتطلب تحقق من البريد الإلكتروني
      isAdmin: false,
      isBanned: false,
    }).returning();

    // Generate and send verification code
    const verificationCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store verification code in database
    await db.insert(verificationCodes).values({
      email: normalizedEmail,
      code: verificationCode,
      expiresAt,
    });

    // Send verification email
    try {
      await sendVerificationCode(normalizedEmail, verificationCode, newUser.name);
      console.log(`Verification code sent to: ${normalizedEmail}`);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Continue registration even if email fails
    }

    // Log successful registration
    console.log(`New user registered: ${normalizedEmail} from IP: ${clientId}`);

    const response = NextResponse.json({
      message: 'Registration successful. Please check your email for verification code.',
      requiresVerification: true,
      email: normalizedEmail,
    });

    // Add rate limit headers
    response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString());
    response.headers.set('X-RateLimit-Reset', new Date(rateLimit.resetTime).toISOString());

    return response;
  } catch (error: any) {
    console.error('Registration error:', error);
    
    let errorMessage = 'An error occurred during registration';
    
    if (error?.message?.includes('duplicate key')) {
      errorMessage = 'Email already registered';
    } else if (error?.message?.includes('database')) {
      errorMessage = 'Database connection error. Please try again later.';
    } else if (error?.code === 'ECONNREFUSED') {
      errorMessage = 'Unable to connect to database. Please try again later.';
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined 
      },
      { status: 500 }
    );
  }
}
