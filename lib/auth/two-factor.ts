import crypto from 'crypto';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// Two-Factor Authentication Implementation
interface TwoFactorStore {
  [userId: string]: {
    secret: string;
    backupCodes: string[];
    enabled: boolean;
    verifiedAt?: Date;
  };
}

const twoFactorStore: TwoFactorStore = {};

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
    
    // Store in memory (should be stored in database in production)
    twoFactorStore[userId.toString()] = {
      secret,
      backupCodes,
      enabled: false, // Will be enabled after verification
    };

    // Generate QR code data
    const qrCode = `otpauth://totp/LightOfLife:user${userId}?secret=${secret}&issuer=LightOfLife`;

    return { secret, backupCodes, qrCode };
  }

  // Verify and activate 2FA
  static async verify2FA(userId: number, token: string): Promise<boolean> {
    const userRecord = twoFactorStore[userId.toString()];
    if (!userRecord) {
      return false;
    }

    const isValid = this.verifyTOTP(userRecord.secret, token);
    if (isValid) {
      userRecord.enabled = true;
      userRecord.verifiedAt = new Date();
      return true;
    }

    return false;
  }

  // Disable 2FA
  static async disable2FA(userId: number, token: string): Promise<boolean> {
    const userRecord = twoFactorStore[userId.toString()];
    if (!userRecord || !userRecord.enabled) {
      return false;
    }

    const isValid = this.verifyTOTP(userRecord.secret, token);
    if (isValid) {
      delete twoFactorStore[userId.toString()];
      return true;
    }

    return false;
  }

  // Verify backup code
  static verifyBackupCode(userId: number, code: string): boolean {
    const userRecord = twoFactorStore[userId.toString()];
    if (!userRecord || !userRecord.enabled) {
      return false;
    }

    const index = userRecord.backupCodes.indexOf(code.toUpperCase());
    if (index !== -1) {
      // Remove used backup code
      userRecord.backupCodes.splice(index, 1);
      return true;
    }

    return false;
  }

  // Check if 2FA is enabled for user
  static is2FAEnabled(userId: number): boolean {
    const userRecord = twoFactorStore[userId.toString()];
    return userRecord?.enabled || false;
  }

  // Get remaining backup codes
  static getRemainingBackupCodes(userId: number): string[] {
    const userRecord = twoFactorStore[userId.toString()];
    return userRecord?.backupCodes || [];
  }
}

// Email-based 2FA (alternative to TOTP)
interface EmailCodeStore {
  [email: string]: {
    code: string;
    expiresAt: number;
    attempts: number;
  };
}

const emailCodeStore: EmailCodeStore = {};

export class Email2FA {
  // Generate 6-digit code
  static generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Send verification code via email
  static async sendCode(email: string): Promise<boolean> {
    const code = this.generateCode();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    emailCodeStore[email] = {
      code,
      expiresAt,
      attempts: 0,
    };

    // TODO: Send email with code
    console.log(`2FA Code for ${email}: ${code}`);

    return true;
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
    if (record.attempts >= 3) {
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

// SMS-based 2FA (for future implementation)
export class SMS2FA {
  static async sendCode(phoneNumber: string): Promise<boolean> {
    // TODO: Implement SMS sending via Twilio or similar service
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`SMS Code for ${phoneNumber}: ${code}`);
    return true;
  }

  static verifyCode(phoneNumber: string, code: string): boolean {
    // TODO: Implement verification
    return true;
  }
}
