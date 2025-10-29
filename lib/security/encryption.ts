/**
 * Advanced Encryption System for Private Messages
 * Uses AES-256-GCM for authenticated encryption
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

// Encryption key from environment (256-bit)
const ENCRYPTION_KEY = process.env.MESSAGE_ENCRYPTION_KEY || process.env.JWT_SECRET;

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 32) {
  throw new Error('MESSAGE_ENCRYPTION_KEY must be set and at least 32 characters long');
}

// Derive a 32-byte key from the hex string
function deriveKey(secret: string): Buffer {
  return createHash('sha256').update(secret).digest();
}

const KEY = deriveKey(ENCRYPTION_KEY);

/**
 * Encrypt message content using AES-256-GCM
 * Returns: base64 encoded string containing IV + Auth Tag + Encrypted Data
 */
export function encryptMessage(plaintext: string): string {
  try {
    // Generate random IV (Initialization Vector) - 12 bytes for GCM
    const iv = randomBytes(12);
    
    // Create cipher with AES-256-GCM
    const cipher = createCipheriv('aes-256-gcm', KEY, iv);
    
    // Encrypt the message
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    // Get authentication tag (16 bytes)
    const authTag = cipher.getAuthTag();
    
    // Combine IV + Auth Tag + Encrypted Data
    const combined = Buffer.concat([
      iv,
      authTag,
      Buffer.from(encrypted, 'base64')
    ]);
    
    // Return as base64 string
    return combined.toString('base64');
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt message');
  }
}

/**
 * Decrypt message content using AES-256-GCM
 * Input: base64 encoded string containing IV + Auth Tag + Encrypted Data
 */
export function decryptMessage(encryptedData: string): string {
  try {
    // Decode base64 string
    const combined = Buffer.from(encryptedData, 'base64');
    
    // Extract components
    const iv = combined.subarray(0, 12); // First 12 bytes
    const authTag = combined.subarray(12, 28); // Next 16 bytes
    const encrypted = combined.subarray(28); // Rest is encrypted data
    
    // Create decipher
    const decipher = createDecipheriv('aes-256-gcm', KEY, iv);
    decipher.setAuthTag(authTag);
    
    // Decrypt the message
    let decrypted = decipher.update(encrypted.toString('base64'), 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt message');
  }
}

/**
 * Hash sensitive data (for comparison without storing plaintext)
 */
export function hashData(data: string): string {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Generate secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return randomBytes(length).toString('hex');
}

/**
 * Encrypt session data
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
 * Create encrypted session token with expiration
 */
export function createEncryptedSession(userId: number, expiresInMs: number = 7 * 24 * 60 * 60 * 1000): string {
  const sessionData = {
    userId,
    createdAt: Date.now(),
    expiresAt: Date.now() + expiresInMs,
    nonce: generateSecureToken(16), // Add randomness to prevent replay attacks
  };
  
  return encryptSessionData(sessionData);
}

/**
 * Verify and decrypt session token
 */
export function verifyEncryptedSession(token: string): { valid: boolean; userId?: number } {
  try {
    const sessionData = decryptSessionData(token);
    
    if (!sessionData) {
      return { valid: false };
    }
    
    // Check expiration
    if (Date.now() > sessionData.expiresAt) {
      return { valid: false };
    }
    
    return { valid: true, userId: sessionData.userId };
  } catch (error) {
    return { valid: false };
  }
}

/**
 * Encrypt file metadata
 */
export function encryptFileMetadata(metadata: any): string {
  return encryptMessage(JSON.stringify(metadata));
}

/**
 * Decrypt file metadata
 */
export function decryptFileMetadata(encryptedMetadata: string): any {
  try {
    const jsonString = decryptMessage(encryptedMetadata);
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('File metadata decryption error:', error);
    return null;
  }
}
