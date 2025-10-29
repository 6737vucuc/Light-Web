// Input validation and sanitization

export class InputValidator {
  // Email validation
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email) && email.length <= 255;
  }

  // Password validation
  static isValidPassword(password: string): boolean {
    // At least 8 characters, contains uppercase, lowercase, number, and special char
    const minLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    return minLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar;
  }

  // Name validation
  static isValidName(name: string): boolean {
    const nameRegex = /^[a-zA-Z\s'-]{2,100}$/;
    return nameRegex.test(name);
  }

  // Content validation (posts, messages)
  static isValidContent(content: string, maxLength: number = 5000): boolean {
    return content.length > 0 && content.length <= maxLength;
  }

  // URL validation
  static isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return ['http:', 'https:'].includes(urlObj.protocol);
    } catch {
      return false;
    }
  }

  // Sanitize HTML to prevent XSS
  static sanitizeHtml(input: string): string {
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  // Sanitize SQL input (basic protection)
  static sanitizeSql(input: string): string {
    return input.replace(/['";\\]/g, '');
  }

  // Check for malicious patterns
  static containsMaliciousPattern(input: string): boolean {
    const maliciousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe/i,
      /eval\(/i,
      /expression\(/i,
      /vbscript:/i,
      /data:text\/html/i,
    ];

    return maliciousPatterns.some(pattern => pattern.test(input));
  }

  // Validate file upload
  static isValidFileUpload(file: File, allowedTypes: string[], maxSize: number): {
    valid: boolean;
    error?: string;
  } {
    // Check file size
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File size exceeds ${maxSize / 1024 / 1024}MB limit`,
      };
    }

    // Check file type
    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Invalid file type',
      };
    }

    // Check file name for malicious patterns
    if (this.containsMaliciousPattern(file.name)) {
      return {
        valid: false,
        error: 'Invalid file name',
      };
    }

    return { valid: true };
  }

  // Validate integer
  static isValidInteger(value: any, min?: number, max?: number): boolean {
    const num = parseInt(value);
    if (isNaN(num)) return false;
    if (min !== undefined && num < min) return false;
    if (max !== undefined && num > max) return false;
    return true;
  }

  // Validate date
  static isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  }

  // Validate age (for birth date)
  static isValidAge(birthDate: string, minAge: number = 18): boolean {
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age >= minAge && age <= 120;
  }

  // Validate country code
  static isValidCountry(country: string): boolean {
    // Basic validation - can be extended with full country list
    return country.length >= 2 && country.length <= 100 && /^[a-zA-Z\s]+$/.test(country);
  }

  // Validate gender
  static isValidGender(gender: string): boolean {
    const validGenders = ['Male', 'Female', 'Other'];
    return validGenders.includes(gender);
  }
}

// Allowed file types
export const AllowedFileTypes = {
  IMAGES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  VIDEOS: ['video/mp4', 'video/webm', 'video/ogg'],
  DOCUMENTS: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
};

// Max file sizes (in bytes)
export const MaxFileSizes = {
  IMAGE: 5 * 1024 * 1024, // 5MB
  VIDEO: 50 * 1024 * 1024, // 50MB
  DOCUMENT: 10 * 1024 * 1024, // 10MB
  AVATAR: 2 * 1024 * 1024, // 2MB
};
