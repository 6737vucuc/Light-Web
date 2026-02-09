import crypto from 'crypto';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { send2FACodeAlert } from '@/lib/security-email';

// Two-Factor Authentication Implementation with Database Storage
export class TwoFactorAuth {
  // Generate secret key for TOTP
  static generateSecret(): string {
    return crypto.randomBytes(20).toString('hex');
  }

  // Generate backup codes
  static generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }

  // Generate TOTP code
  static generateTOTP(secret: string, window: number = 0): string {
    const epoch = Math.floor(Date.now() / 1000);
    const time = Math.floor(epoch / 30) + window;
    
    const hmac = crypto.createHmac('sha1', Buffer.from(secret, 'hex'));
    const timeBuffer = Buffer.alloc(8);
    timeBuffer.writeBigInt64BE(BigInt(time));
    hmac.update(timeBuffer);
    
    const hash = hmac.digest();
    const offset = hash[hash.length - 1] & 0x0f;
    const binary = ((hash[offset] & 0x7f) << 24) |
                   ((hash[offset + 1] & 0xff) << 16) |
                   ((hash[offset + 2] & 0xff) << 8) |
                   (hash[offset + 3] & 0xff);
    
    const otp = binary % 1000000;
    return otp.toString().padStart(6, '0');
  }

  // Verify TOTP code
  static verifyTOTP(secret: string, token: string, window: number = 1): boolean {
    for (let i = -window; i <= window; i++) {
      const validToken = this.generateTOTP(secret, i);
      if (validToken === token) {
        return true;
      }
    }
    return false;
  }

  // Enable 2FA for user
  static async enable2FA(userId: number): Promise<{
    secret: string;
    backupCodes: string[];
    qrCode: string;
  }> {
    const secret = this.generateSecret();
    const backupCodes = this.generateBackupCodes();
    
    // Store in database (not enabled yet, will be enabled after verification)
    await db
      .update(users)
      .set({
        twoFactorSecret: secret,
        twoFactorBackupCodes: backupCodes as any,
        twoFactorEnabled: false, // Will be enabled after verification
      })
      .where(eq(users.id, userId));

    // Generate QR code data
    const qrCode = `otpauth://totp/LightOfLife:user${userId}?secret=${secret}&issuer=LightOfLife`;

    return { secret, backupCodes, qrCode };
  }

  // Verify and activate 2FA
  static async verify2FA(userId: number, token: string): Promise<boolean> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user || !user.twoFactorSecret) {
      return false;
    }

    const isValid = this.verifyTOTP(user.twoFactorSecret, token);
    if (isValid) {
      await db
        .update(users)
        .set({
          twoFactorEnabled: true,
          twoFactorVerifiedAt: new Date(),
        })
        .where(eq(users.id, userId));
      return true;
    }

    return false;
  }

  // Disable 2FA
  static async disable2FA(userId: number, token: string): Promise<boolean> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return false;
    }

    const isValid = this.verifyTOTP(user.twoFactorSecret, token);
    if (isValid) {
      await db
        .update(users)
        .set({
          twoFactorEnabled: false,
          twoFactorSecret: null,
          twoFactorBackupCodes: null,
          twoFactorVerifiedAt: null,
        })
        .where(eq(users.id, userId));
      return true;
    }

    return false;
  }

  // Verify backup code
  static async verifyBackupCode(userId: number, code: string): Promise<boolean> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user || !user.twoFactorEnabled || !user.twoFactorBackupCodes) {
      return false;
    }

    const backupCodes = user.twoFactorBackupCodes as string[];
    const index = backupCodes.findIndex((c: string) => c === code.toUpperCase());
    
    if (index !== -1) {
      // Remove used backup code
      const updatedCodes = backupCodes.filter((_: string, i: number) => i !== index);
      await db
        .update(users)
        .set({
          twoFactorBackupCodes: updatedCodes as any,
        })
        .where(eq(users.id, userId));
      return true;
    }

    return false;
  }

  // Check if 2FA is enabled for user
  static async is2FAEnabled(userId: number): Promise<boolean> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    return user?.twoFactorEnabled || false;
  }

  // Get remaining backup codes
  static async getRemainingBackupCodes(userId: number): Promise<string[]> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    return (user?.twoFactorBackupCodes as string[]) || [];
  }

  // Verify 2FA during login
  static async verify2FALogin(userId: number, token: string): Promise<boolean> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      return false;
    }

    // Try TOTP first
    if (this.verifyTOTP(user.twoFactorSecret, token)) {
      return true;
    }

    // Try backup code
    return await this.verifyBackupCode(userId, token);
  }
}

// Email-based 2FA (alternative to TOTP)
interface EmailCodeStore {
  [email: string]: {
    code: string;
    expiresAt: number;
    attempts: number;
    userName: string;
  };
}

const emailCodeStore: EmailCodeStore = {};

export class Email2FA {
  // Generate 6-digit code
  static generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Send verification code via email
  static async sendCode(email: string, userName: string = 'User'): Promise<boolean> {
    const code = this.generateCode();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    emailCodeStore[email] = {
      code,
      expiresAt,
      attempts: 0,
      userName,
    };

    try {
      await send2FACodeAlert(userName, email, code);
      return true;
    } catch (error) {
      console.error('Failed to send 2FA email:', error);
      return false;
    }
  }

  // Verify code
  static verifyCode(email: string, code: string): boolean {
    const record = emailCodeStore[email];
    if (!record) {
      return false;
    }

    // Check expiration
    if (Date.now() > record.expiresAt) {
      delete emailCodeStore[email];
      return false;
    }

    // Check attempts
    if (record.attempts >= 5) {
      delete emailCodeStore[email];
      return false;
    }

    // Verify code
    if (record.code === code) {
      delete emailCodeStore[email];
      return true;
    }

    record.attempts++;
    return false;
  }
}
