import crypto from 'crypto';

/**
 * Advanced Encryption Library
 * Provides high-level encryption for sensitive data
 */

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const ITERATIONS = 100000; // PBKDF2 iterations

// Get encryption key from environment
function getEncryptionKey(): Buffer {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET not found in environment variables');
  }
  // Derive a consistent key from JWT_SECRET
  return crypto.pbkdf2Sync(secret, 'encryption-salt', ITERATIONS, KEY_LENGTH, 'sha512');
}

/**
 * Encrypt sensitive data
 */
export function encrypt(text: string): string {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    // Combine IV + encrypted data + auth tag
    const result = iv.toString('hex') + ':' + encrypted + ':' + tag.toString('hex');
    
    return result;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt encrypted data
 */
export function decrypt(encryptedData: string): string {
  try {
    const key = getEncryptionKey();
    const parts = encryptedData.split(':');
    
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const tag = Buffer.from(parts[2], 'hex');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Hash password with salt using PBKDF2
 */
export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(SALT_LENGTH).toString('hex');
    
    crypto.pbkdf2(password, salt, ITERATIONS, KEY_LENGTH, 'sha512', (err, derivedKey) => {
      if (err) reject(err);
      
      const hash = derivedKey.toString('hex');
      resolve(`${salt}:${hash}`);
    });
  });
}

/**
 * Verify password against hash
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const [salt, originalHash] = hashedPassword.split(':');
    
    if (!salt || !originalHash) {
      resolve(false);
      return;
    }
    
    crypto.pbkdf2(password, salt, ITERATIONS, KEY_LENGTH, 'sha512', (err, derivedKey) => {
      if (err) reject(err);
      
      const hash = derivedKey.toString('hex');
      resolve(hash === originalHash);
    });
  });
}

/**
 * Generate secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash data using SHA-256
 */
export function hashData(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Generate HMAC signature
 */
export function generateHMAC(data: string, secret?: string): string {
  const key = secret || process.env.JWT_SECRET || '';
  return crypto.createHmac('sha512', key).update(data).digest('hex');
}

/**
 * Verify HMAC signature
 */
export function verifyHMAC(data: string, signature: string, secret?: string): boolean {
  const expectedSignature = generateHMAC(data, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Sanitize input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Validate and sanitize email
 */
export function sanitizeEmail(email: string): string {
  const sanitized = email.toLowerCase().trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(sanitized)) {
    throw new Error('Invalid email format');
  }
  
  return sanitized;
}

/**
 * Generate secure session token
 */
export function generateSessionToken(): string {
  return generateSecureToken(64);
}

/**
 * Encrypt sensitive user data
 */
export function encryptUserData(data: any): string {
  const jsonString = JSON.stringify(data);
  return encrypt(jsonString);
}

/**
 * Decrypt sensitive user data
 */
export function decryptUserData(encryptedData: string): any {
  const decrypted = decrypt(encryptedData);
  return JSON.parse(decrypted);
}

/**
 * Generate API key
 */
export function generateApiKey(): string {
  const timestamp = Date.now().toString();
  const random = generateSecureToken(32);
  return `lw_${hashData(timestamp + random).substring(0, 40)}`;
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

/**
 * Rate limit key generator
 */
export function generateRateLimitKey(identifier: string, action: string): string {
  return hashData(`${identifier}:${action}`);
}

/**
 * Mask sensitive data for logging
 */
export function maskSensitiveData(data: string, visibleChars: number = 4): string {
  if (data.length <= visibleChars) {
    return '***';
  }
  
  const visible = data.substring(0, visibleChars);
  const masked = '*'.repeat(data.length - visibleChars);
  return visible + masked;
}

export default {
  encrypt,
  decrypt,
  hashPassword,
  verifyPassword,
  generateSecureToken,
  hashData,
  generateHMAC,
  verifyHMAC,
  sanitizeInput,
  sanitizeEmail,
  generateSessionToken,
  encryptUserData,
  decryptUserData,
  generateApiKey,
  secureCompare,
  generateRateLimitKey,
  maskSensitiveData
};
