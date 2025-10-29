import { SignJWT, jwtVerify } from 'jose';

// Ensure JWT_SECRET is set and strong
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be set and at least 32 characters long for security');
}

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

// Token expiration times
const ACCESS_TOKEN_EXPIRY = '15m'; // Short-lived access tokens
const REFRESH_TOKEN_EXPIRY = '7d'; // Longer refresh tokens

export async function createToken(payload: any, type: 'access' | 'refresh' = 'access') {
  const expirationTime = type === 'access' ? ACCESS_TOKEN_EXPIRY : REFRESH_TOKEN_EXPIRY;
  
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expirationTime)
    .setIssuer('light-of-life-app')
    .setAudience('light-of-life-users')
    .sign(secret);
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret, {
      issuer: 'light-of-life-app',
      audience: 'light-of-life-users',
    });
    return payload;
  } catch (error) {
    // Log security events (token tampering attempts)
    console.warn('Token verification failed:', error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}
