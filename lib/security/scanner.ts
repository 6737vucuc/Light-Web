// Automated Security Scanning System
export class SecurityScanner {
  // Scan for SQL injection attempts
  static scanSQLInjection(input: string): boolean {
    const sqlPatterns = [
      /(\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|\bCREATE\b)/i,
      /(\bUNION\b.*\bSELECT\b)/i,
      /(--|;|\/\*|\*\/)/,
      /(\bOR\b.*=.*)/i,
      /(\bAND\b.*=.*)/i,
    ];
    
    return sqlPatterns.some(pattern => pattern.test(input));
  }

  // Scan for XSS attempts
  static scanXSS(input: string): boolean {
    const xssPatterns = [
      /<script[^>]*>.*<\/script>/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe[^>]*>/i,
      /<embed[^>]*>/i,
      /<object[^>]*>/i,
    ];
    
    return xssPatterns.some(pattern => pattern.test(input));
  }

  // Scan for malicious file uploads
  static scanFileUpload(filename: string, content: Buffer): {
    safe: boolean;
    reason?: string;
  } {
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.sh', '.php', '.asp'];
    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    
    if (dangerousExtensions.includes(ext)) {
      return { safe: false, reason: 'Dangerous file extension' };
    }
    
    // Check for embedded scripts in images
    const contentStr = content.toString('utf-8', 0, Math.min(1000, content.length));
    if (this.scanXSS(contentStr)) {
      return { safe: false, reason: 'Embedded script detected' };
    }
    
    return { safe: true };
  }

  // Comprehensive input validation
  static validateInput(input: string, type: 'text' | 'email' | 'url'): {
    valid: boolean;
    sanitized: string;
    threats: string[];
  } {
    const threats: string[] = [];
    let sanitized = input;
    
    if (this.scanSQLInjection(input)) {
      threats.push('SQL Injection');
    }
    
    if (this.scanXSS(input)) {
      threats.push('XSS');
    }
    
    // Sanitize based on type
    switch (type) {
      case 'email':
        sanitized = input.toLowerCase().trim();
        break;
      case 'url':
        try {
          new URL(input);
        } catch {
          threats.push('Invalid URL');
        }
        break;
      case 'text':
      default:
        sanitized = input
          .replace(/<script[^>]*>.*<\/script>/gi, '')
          .replace(/javascript:/gi, '')
          .replace(/on\w+\s*=/gi, '');
    }
    
    return {
      valid: threats.length === 0,
      sanitized,
      threats,
    };
  }
}
