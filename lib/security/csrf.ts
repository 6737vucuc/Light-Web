import crypto from 'crypto';

// CSRF Token Management
interface CSRFTokenStore {
  [userId: string]: {
    token: string;
    createdAt: number;
  };
}

const tokenStore: CSRFTokenStore = {};
const TOKEN_EXPIRY = 60 * 60 * 1000; // 1 hour

export class CSRFProtection {
  // Generate CSRF token
  static generateToken(userId: number): string {
    const token = crypto.randomBytes(32).toString('hex');
    
    tokenStore[userId.toString()] = {
      token,
      createdAt: Date.now(),
    };

    return token;
  }

  // Verify CSRF token
  static verifyToken(userId: number, token: string): boolean {
    const record = tokenStore[userId.toString()];
    
    if (!record) {
      return false;
    }

    // Check if token expired
    if (Date.now() - record.createdAt > TOKEN_EXPIRY) {
      delete tokenStore[userId.toString()];
      return false;
    }

    // Verify token
    return record.token === token;
  }

  // Remove token
  static removeToken(userId: number): void {
    delete tokenStore[userId.toString()];
  }

  // Clean up expired tokens
  static cleanupExpiredTokens(): void {
    const now = Date.now();
    Object.keys(tokenStore).forEach(userId => {
      if (now - tokenStore[userId].createdAt > TOKEN_EXPIRY) {
        delete tokenStore[userId];
      }
    });
  }
}

// Clean up expired tokens every 10 minutes
setInterval(() => {
  CSRFProtection.cleanupExpiredTokens();
}, 10 * 60 * 1000);
