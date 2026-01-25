// Account Lockout System
// Prevents brute force attacks by locking accounts after failed login attempts

import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const LOCKOUT_CONFIG = {
  MAX_FAILED_ATTEMPTS: 5,
  LOCKOUT_DURATION_MINUTES: 30,
  RESET_ATTEMPTS_AFTER_MINUTES: 60,
};

/**
 * Record a failed login attempt
 */
export async function recordFailedLogin(userId: number): Promise<{
  isLocked: boolean;
  lockedUntil?: Date;
  remainingAttempts: number;
}> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    throw new Error('User not found');
  }

  const now = new Date();
  let failedAttempts = (user.failedLoginAttempts || 0) + 1;

  // Check if we should reset the counter
  if (user.lastFailedLogin) {
    const minutesSinceLastFail = 
      (now.getTime() - new Date(user.lastFailedLogin).getTime()) / (1000 * 60);
    
    if (minutesSinceLastFail > LOCKOUT_CONFIG.RESET_ATTEMPTS_AFTER_MINUTES) {
      failedAttempts = 1; // Reset counter
    }
  }

  // Lock account if max attempts reached
  if (failedAttempts >= LOCKOUT_CONFIG.MAX_FAILED_ATTEMPTS) {
    const lockedUntil = new Date(
      now.getTime() + LOCKOUT_CONFIG.LOCKOUT_DURATION_MINUTES * 60 * 1000
    );

    await db.update(users)
      .set({
        failedLoginAttempts: failedAttempts,
        lastFailedLogin: now,
        lockedUntil: lockedUntil,
        updatedAt: now,
      })
      .where(eq(users.id, userId));

    return {
      isLocked: true,
      lockedUntil,
      remainingAttempts: 0,
    };
  }

  // Update failed attempts
  await db.update(users)
    .set({
      failedLoginAttempts: failedAttempts,
      lastFailedLogin: now,
      updatedAt: now,
    })
    .where(eq(users.id, userId));

  return {
    isLocked: false,
    remainingAttempts: LOCKOUT_CONFIG.MAX_FAILED_ATTEMPTS - failedAttempts,
  };
}

/**
 * Reset failed login attempts after successful login
 */
export async function resetFailedAttempts(userId: number): Promise<void> {
  await db.update(users)
    .set({
      failedLoginAttempts: 0,
      lastFailedLogin: null,
      lockedUntil: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}

/**
 * Check if account is currently locked
 */
export async function isAccountLocked(userId: number): Promise<{
  isLocked: boolean;
  lockedUntil?: Date;
  minutesRemaining?: number;
}> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user || !user.lockedUntil) {
    return { isLocked: false };
  }

  const now = new Date();
  const lockedUntil = new Date(user.lockedUntil);

  // Check if lockout period has expired
  if (now >= lockedUntil) {
    // Auto-unlock
    await resetFailedAttempts(userId);
    return { isLocked: false };
  }

  const minutesRemaining = Math.ceil(
    (lockedUntil.getTime() - now.getTime()) / (1000 * 60)
  );

  return {
    isLocked: true,
    lockedUntil,
    minutesRemaining,
  };
}

/**
 * Check account lockout by email (before authentication)
 */
export async function checkAccountLockoutByEmail(email: string): Promise<{
  isLocked: boolean;
  lockedUntil?: Date;
  minutesRemaining?: number;
  userId?: number;
}> {
  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user) {
    return { isLocked: false };
  }

  const lockStatus = await isAccountLocked(user.id);
  
  return {
    ...lockStatus,
    userId: user.id,
  };
}

/**
 * Manually unlock account (admin function)
 */
export async function unlockAccount(userId: number): Promise<void> {
  await resetFailedAttempts(userId);
}
