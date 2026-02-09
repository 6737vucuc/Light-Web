import { db } from '@/lib/db';
import { internalTwoFactorCodes, trustedDevices, users, securityLogs } from '@/lib/db/schema';
import { eq, and, gte, desc } from 'drizzle-orm';
import { sendInternal2FACode, sendNewDeviceAlert } from '@/lib/security-email';
import crypto from 'crypto';
import { getGeoLocation } from '@/lib/utils/geolocation';

export class Internal2FA {
  /**
   * Generate a secure 6-digit numeric code
   */
  private static generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Create and send a 2FA code via email
   */
  static async sendCode(userId: number, email: string, name: string, ip?: string, browser?: string): Promise<boolean> {
    const code = this.generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Get real location if IP is provided
    let location = 'Unknown';
    if (ip) {
      const geo = await getGeoLocation(ip);
      location = geo.formatted || 'Unknown';
    }

    try {
      // Store in database
      await db.insert(internalTwoFactorCodes).values({
        userId,
        code,
        expiresAt,
      });

      // Send email
      return await sendInternal2FACode(name, email, code, location, browser);
    } catch (error) {
      console.error('Error in Internal2FA.sendCode:', error);
      return false;
    }
  }

  /**
   * Verify a 2FA code
   */
  static async verifyCode(userId: number, code: string): Promise<boolean> {
    try {
      const record = await db.query.internalTwoFactorCodes.findFirst({
        where: and(
          eq(internalTwoFactorCodes.userId, userId),
          eq(internalTwoFactorCodes.code, code),
          eq(internalTwoFactorCodes.isUsed, false),
          gte(internalTwoFactorCodes.expiresAt, new Date())
        ),
        orderBy: [desc(internalTwoFactorCodes.createdAt)],
      });

      if (!record) return false;

      // Mark as used
      await db
        .update(internalTwoFactorCodes)
        .set({ isUsed: true })
        .where(eq(internalTwoFactorCodes.id, record.id));

      // Log security event
      await db.insert(securityLogs).values({
        userId,
        event: '2fa_verified',
        details: { code: '******' }
      });

      return true;
    } catch (error) {
      console.error('Error in Internal2FA.verifyCode:', error);
      return false;
    }
  }

  /**
   * Check if a device is already trusted
   */
  static async isDeviceTrusted(userId: number, deviceId: string): Promise<boolean> {
    try {
      const device = await db.query.trustedDevices.findFirst({
        where: and(
          eq(trustedDevices.userId, userId),
          eq(trustedDevices.deviceId, deviceId),
          eq(trustedDevices.isTrusted, true)
        ),
      });

      if (device) {
        // Update last used
        await db
          .update(trustedDevices)
          .set({ lastUsed: new Date() })
          .where(eq(trustedDevices.id, device.id));
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error in Internal2FA.isDeviceTrusted:', error);
      return false;
    }
  }

  /**
   * Trust a new device
   */
  static async trustDevice(
    userId: number, 
    deviceId: string, 
    info: { 
      name?: string; 
      browser?: string; 
      os?: string; 
      ip?: string;
      location?: string;
    },
    userEmail: string,
    userName: string
  ): Promise<boolean> {
    try {
      // Get real location if IP is provided and location is not specific
      let finalLocation = info.location || 'Unknown';
      if (info.ip && (!info.location || info.location === 'Detected' || info.location === 'Unknown')) {
        const geo = await getGeoLocation(info.ip);
        finalLocation = geo.formatted || 'Unknown';
      }

      await db.insert(trustedDevices).values({
        userId,
        deviceId,
        deviceName: info.name || `${info.browser} on ${info.os}`,
        browser: info.browser,
        os: info.os,
        ipAddress: info.ip,
        location: finalLocation
      });

      // Log security event
      await db.insert(securityLogs).values({
        userId,
        event: 'device_trusted',
        ipAddress: info.ip,
        location: info.location,
        userAgent: info.browser,
        details: { device: info.os }
      });

      // Send alert email
      await sendNewDeviceAlert(userName, userEmail, {
        browser: info.browser || 'Unknown',
        os: info.os || 'Unknown',
        ip: info.ip || 'Unknown',
        location: finalLocation,
      });

      return true;
    } catch (error) {
      console.error('Error in Internal2FA.trustDevice:', error);
      return false;
    }
  }

  /**
   * Generate a unique device fingerprint/ID
   */
  static generateDeviceId(userAgent: string, ip: string): string {
    return crypto
      .createHash('sha256')
      .update(`${userAgent}-${ip}`)
      .digest('hex');
  }
}
