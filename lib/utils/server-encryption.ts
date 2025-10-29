import crypto from 'crypto';

/**
 * Advanced Message Encryption System
 * Uses AES-256-GCM with strong 256-bit key
 * Provides authenticated encryption with additional data (AEAD)
 */

// Use the strong encryption key from environment
const ENCRYPTION_KEY = process.env.MESSAGE_ENCRYPTION_KEY || process.env.JWT_SECRET || '';

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 32) {
  throw new Error('MESSAGE_ENCRYPTION_KEY or JWT_SECRET must be set and at least 32 characters long');
}

const ALGORITHM = 'aes-256-gcm';

/**
 * Derive a secure 32-byte key from the hex string
 */
function getKey(): Buffer {
  // Use SHA-256 to derive a consistent 32-byte key
  return crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
}

/**
 * Encrypt message with AES-256-GCM
 * Format: IV(12 bytes):AuthTag(16 bytes):EncryptedData
 */
export function encryptMessage(text: string): string {
  try {
    if (!text || typeof text !== 'string') {
      throw new Error('Invalid input: text must be a non-empty string');
    }

    // Generate a random IV (12 bytes is optimal for GCM)
    const iv = crypto.randomBytes(12);
    
    // Create cipher with AES-256-GCM
    const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
    
    // Encrypt the text
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Get the authentication tag (16 bytes)
    const authTag = cipher.getAuthTag();
    
    // Combine IV + authTag + encrypted data (using : as separator)
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt message');
  }
}

/**
 * Decrypt message with AES-256-GCM
 * Input format: IV(12 bytes):AuthTag(16 bytes):EncryptedData
 */
export function decryptMessage(encryptedText: string): string {
  try {
    if (!encryptedText || typeof encryptedText !== 'string') {
      throw new Error('Invalid input: encryptedText must be a non-empty string');
    }

    // Split the encrypted text
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    // Validate IV and authTag sizes
    if (iv.length !== 12) {
      throw new Error('Invalid IV length');
    }
    if (authTag.length !== 16) {
      throw new Error('Invalid auth tag length');
    }
    
    // Create decipher with AES-256-GCM
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    
    // Set the authentication tag
    decipher.setAuthTag(authTag);
    
    // Decrypt the text
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt message - data may be corrupted or tampered with');
  }
}

/**
 * Encrypt session data (for secure session storage)
 */
export function encryptSessionData(data: any): string {
  const jsonString = JSON.stringify(data);
  return encryptMessage(jsonString);
}

/**
 * Decrypt session data
 */
export function decryptSessionData(encryptedData: string): any {
  try {
    const jsonString = decryptMessage(encryptedData);
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Session decryption error:', error);
    return null;
  }
}

/**
 * Generate secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash sensitive data (one-way hash for comparison)
 */
export function hashData(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Create HMAC for message authentication
 */
export function createHMAC(data: string): string {
  return crypto.createHmac('sha256', getKey()).update(data).digest('hex');
}

/**
 * Verify HMAC
 */
export function verifyHMAC(data: string, hmac: string): boolean {
  const expectedHMAC = createHMAC(data);
  return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expectedHMAC));
}
