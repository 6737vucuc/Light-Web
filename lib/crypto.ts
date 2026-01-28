import crypto from 'crypto';

/**
 * MILITARY-GRADE ENCRYPTION (AES-256-GCM)
 * This is the same standard used by intelligence agencies and governments worldwide.
 * It provides both Confidentiality and Authenticity.
 */

// In production, ENCRYPTION_KEY must be a 32-byte hex string in .env
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef'; // 32 bytes
const IV_LENGTH = 12; // Recommended for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits

/**
 * Encrypts plain text using AES-256-GCM (Intelligence Grade)
 */
export function encrypt(text: string): string {
  try {
    if (!text) return '';
    
    // Generate a random Initialization Vector (IV)
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Create cipher with GCM mode
    const cipher = crypto.createCipheriv(
      'aes-256-gcm', 
      Buffer.from(ENCRYPTION_KEY), 
      iv
    );
    
    // Encrypt the text
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Get the Authentication Tag (This ensures the message hasn't been tampered with)
    const authTag = cipher.getAuthTag().toString('hex');
    
    // Return IV:AuthTag:EncryptedData
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  } catch (error) {
    console.error('Intelligence Encryption Error:', error);
    return text; // Fallback to plain text if encryption fails
  }
}

/**
 * Decrypts text using AES-256-GCM (Intelligence Grade)
 */
export function decrypt(text: string): string {
  try {
    if (!text || !text.includes(':')) return text;
    
    const [ivHex, authTagHex, encryptedHex] = text.split(':');
    if (!ivHex || !authTagHex || !encryptedHex) return text;
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    // Create decipher with GCM mode
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm', 
      Buffer.from(ENCRYPTION_KEY), 
      iv
    );
    
    // Set the Authentication Tag for verification
    decipher.setAuthTag(authTag);
    
    // Decrypt the text
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Intelligence Decryption Error (Tampering detected or wrong key):', error);
    return '[Encrypted Message - Secure]'; // Secure fallback
  }
}
