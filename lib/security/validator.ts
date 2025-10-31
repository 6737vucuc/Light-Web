/**
 * Security Validator Library
 * Comprehensive input validation and sanitization
 */

// SQL Injection patterns
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE)\b)/gi,
  /(--|\#|\/\*|\*\/)/g,
  /(\bOR\b.*=.*|1=1|'=')/gi,
  /(\bAND\b.*=.*)/gi,
  /(;|\||&&)/g
];

// XSS patterns
const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<embed|<object/gi,
  /eval\(|expression\(/gi
];

// Path Traversal patterns
const PATH_TRAVERSAL_PATTERNS = [
  /\.\./g,
  /\.\\/g,
  /\.\.%2f/gi,
  /\.\.%5c/gi,
  /%2e%2e/gi
];

// Command Injection patterns
const COMMAND_INJECTION_PATTERNS = [
  /[;&|`$(){}[\]<>]/g,
  /\$\(/g,
  /`/g
];

/**
 * Validate and sanitize string input
 */
export function validateString(input: string, maxLength: number = 1000): {
  isValid: boolean;
  sanitized: string;
  errors: string[];
} {
  const errors: string[] = [];
  let sanitized = input;

  // Check length
  if (input.length > maxLength) {
    errors.push(`Input exceeds maximum length of ${maxLength}`);
    sanitized = input.substring(0, maxLength);
  }

  // Check for SQL injection
  for (const pattern of SQL_INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      errors.push('Potential SQL injection detected');
      sanitized = input.replace(pattern, '');
      break;
    }
  }

  // Check for XSS
  for (const pattern of XSS_PATTERNS) {
    if (pattern.test(input)) {
      errors.push('Potential XSS attack detected');
      sanitized = input.replace(pattern, '');
      break;
    }
  }

  // Check for path traversal
  for (const pattern of PATH_TRAVERSAL_PATTERNS) {
    if (pattern.test(input)) {
      errors.push('Potential path traversal detected');
      sanitized = input.replace(pattern, '');
      break;
    }
  }

  return {
    isValid: errors.length === 0,
    sanitized: sanitized.trim(),
    errors
  };
}

/**
 * Validate email format
 */
export function validateEmail(email: string): {
  isValid: boolean;
  sanitized: string;
  errors: string[];
} {
  const errors: string[] = [];
  const sanitized = email.toLowerCase().trim();

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  if (!emailRegex.test(sanitized)) {
    errors.push('Invalid email format');
  }

  if (sanitized.length > 255) {
    errors.push('Email too long');
  }

  return {
    isValid: errors.length === 0,
    sanitized,
    errors
  };
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): {
  isValid: boolean;
  strength: 'weak' | 'medium' | 'strong' | 'very-strong';
  errors: string[];
} {
  const errors: string[] = [];
  let strength: 'weak' | 'medium' | 'strong' | 'very-strong' = 'weak';

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (password.length < 6) {
    return { isValid: false, strength: 'weak', errors };
  }

  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChars = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);

  let strengthScore = 0;
  if (hasUpperCase) strengthScore++;
  if (hasLowerCase) strengthScore++;
  if (hasNumbers) strengthScore++;
  if (hasSpecialChars) strengthScore++;
  if (password.length >= 12) strengthScore++;
  if (password.length >= 16) strengthScore++;

  if (!hasUpperCase) errors.push('Password should contain uppercase letters');
  if (!hasLowerCase) errors.push('Password should contain lowercase letters');
  if (!hasNumbers) errors.push('Password should contain numbers');
  if (!hasSpecialChars) errors.push('Password should contain special characters');

  if (strengthScore <= 2) strength = 'weak';
  else if (strengthScore === 3) strength = 'medium';
  else if (strengthScore === 4) strength = 'strong';
  else strength = 'very-strong';

  return {
    isValid: errors.length === 0 && strengthScore >= 3,
    strength,
    errors
  };
}

/**
 * Validate URL
 */
export function validateURL(url: string): {
  isValid: boolean;
  sanitized: string;
  errors: string[];
} {
  const errors: string[] = [];
  let sanitized = url.trim();

  try {
    const urlObj = new URL(sanitized);
    
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      errors.push('Only HTTP and HTTPS protocols are allowed');
    }

    // Check for suspicious patterns
    if (/javascript:/gi.test(sanitized)) {
      errors.push('JavaScript protocol not allowed');
    }

    sanitized = urlObj.toString();
  } catch {
    errors.push('Invalid URL format');
  }

  return {
    isValid: errors.length === 0,
    sanitized,
    errors
  };
}

/**
 * Validate integer
 */
export function validateInteger(value: any, min?: number, max?: number): {
  isValid: boolean;
  value: number;
  errors: string[];
} {
  const errors: string[] = [];
  const parsed = parseInt(value, 10);

  if (isNaN(parsed)) {
    errors.push('Value must be a valid integer');
    return { isValid: false, value: 0, errors };
  }

  if (min !== undefined && parsed < min) {
    errors.push(`Value must be at least ${min}`);
  }

  if (max !== undefined && parsed > max) {
    errors.push(`Value must be at most ${max}`);
  }

  return {
    isValid: errors.length === 0,
    value: parsed,
    errors
  };
}

/**
 * Validate file upload
 */
export function validateFile(
  file: { name: string; size: number; type: string },
  options: {
    maxSize?: number; // in bytes
    allowedTypes?: string[];
    allowedExtensions?: string[];
  } = {}
): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const {
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
  } = options;

  // Check file size
  if (file.size > maxSize) {
    errors.push(`File size exceeds maximum of ${maxSize / 1024 / 1024}MB`);
  }

  // Check file type
  if (!allowedTypes.includes(file.type)) {
    errors.push(`File type ${file.type} is not allowed`);
  }

  // Check file extension
  const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
  if (!allowedExtensions.includes(extension)) {
    errors.push(`File extension ${extension} is not allowed`);
  }

  // Check for double extensions (potential bypass attempt)
  const parts = file.name.split('.');
  if (parts.length > 2) {
    errors.push('Files with multiple extensions are not allowed');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Sanitize HTML content
 */
export function sanitizeHTML(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/<embed|<object/gi, '');
}

/**
 * Validate JSON input
 */
export function validateJSON(input: string): {
  isValid: boolean;
  parsed: any;
  errors: string[];
} {
  const errors: string[] = [];
  let parsed: any = null;

  try {
    parsed = JSON.parse(input);
  } catch (error) {
    errors.push('Invalid JSON format');
  }

  return {
    isValid: errors.length === 0,
    parsed,
    errors
  };
}

/**
 * Validate phone number
 */
export function validatePhoneNumber(phone: string): {
  isValid: boolean;
  sanitized: string;
  errors: string[];
} {
  const errors: string[] = [];
  const sanitized = phone.replace(/[^\d+]/g, '');

  const phoneRegex = /^\+?[1-9]\d{1,14}$/;

  if (!phoneRegex.test(sanitized)) {
    errors.push('Invalid phone number format');
  }

  return {
    isValid: errors.length === 0,
    sanitized,
    errors
  };
}

/**
 * Validate date
 */
export function validateDate(dateString: string): {
  isValid: boolean;
  date: Date | null;
  errors: string[];
} {
  const errors: string[] = [];
  const date = new Date(dateString);

  if (isNaN(date.getTime())) {
    errors.push('Invalid date format');
    return { isValid: false, date: null, errors };
  }

  return {
    isValid: true,
    date,
    errors
  };
}

/**
 * Check for command injection
 */
export function checkCommandInjection(input: string): {
  isSafe: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  for (const pattern of COMMAND_INJECTION_PATTERNS) {
    if (pattern.test(input)) {
      errors.push('Potential command injection detected');
      break;
    }
  }

  return {
    isSafe: errors.length === 0,
    errors
  };
}

export default {
  validateString,
  validateEmail,
  validatePassword,
  validateURL,
  validateInteger,
  validateFile,
  sanitizeHTML,
  validateJSON,
  validatePhoneNumber,
  validateDate,
  checkCommandInjection
};
