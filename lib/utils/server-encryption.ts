import crypto from 'crypto';

// Use a strong encryption key from environment or generate one
// In production, this MUST be set in environment variables
const ENCRYPTION_KEY = process.env.MESSAGE_ENCRYPTION_KEY || 'your-32-byte-secret-key-here-change-this-in-production!!';
const ALGORITHM = 'aes-256-gcm';

// Ensure key is 32 bytes
function getKey(): Buffer {
  const key = ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32);
  return Buffer.from(key);
}

export function encryptMessage(text: string): string {
  try {
    // Generate a random IV for each encryption
    const iv = crypto.randomBytes(16);
    
    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
    
    // Encrypt the text
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Get the auth tag
    const authTag = cipher.getAuthTag();
    
    // Combine IV + authTag + encrypted data
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt message');
  }
}

export function decryptMessage(encryptedText: string): string {
  try {
    // Split the encrypted text
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    
    // Set the auth tag
    decipher.setAuthTag(authTag);
    
    // Decrypt the text
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    // Return encrypted text if decryption fails (backward compatibility)
    return encryptedText;
  }
}

