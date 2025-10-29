/**
 * SECURE FILE UPLOAD SYSTEM
 * 
 * Military-grade file upload security
 * Protects against malicious file uploads
 */

import crypto from 'crypto';
import { logSecurityEvent } from './advanced-protection';

/**
 * Allowed file types with MIME validation
 */
export const ALLOWED_FILE_TYPES = {
  images: {
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    mimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    maxSize: 5 * 1024 * 1024, // 5MB
  },
  documents: {
    extensions: ['.pdf', '.doc', '.docx'],
    mimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    maxSize: 10 * 1024 * 1024, // 10MB
  },
  videos: {
    extensions: ['.mp4', '.webm'],
    mimeTypes: ['video/mp4', 'video/webm'],
    maxSize: 50 * 1024 * 1024, // 50MB
  },
};

/**
 * Dangerous file signatures (magic bytes)
 */
const DANGEROUS_SIGNATURES = [
  { signature: '4D5A', description: 'Windows Executable (EXE)' },
  { signature: '504B0304', description: 'ZIP Archive (could contain malware)' },
  { signature: '7F454C46', description: 'ELF Executable (Linux)' },
  { signature: 'CAFEBABE', description: 'Java Class File' },
  { signature: 'D0CF11E0A1B11AE1', description: 'Microsoft Office (could contain macros)' },
  { signature: '25504446', description: 'PDF (check for embedded scripts)' },
];

/**
 * Validate file upload
 */
export function validateFileUpload(file: {
  name: string;
  size: number;
  type: string;
  buffer?: Buffer;
}): {
  valid: boolean;
  error?: string;
  warnings?: string[];
} {
  const warnings: string[] = [];

  // 1. Check filename
  const filenameValidation = validateFilename(file.name);
  if (!filenameValidation.valid) {
    return { valid: false, error: filenameValidation.error };
  }

  // 2. Get file extension
  const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

  // 3. Find allowed category
  let category: keyof typeof ALLOWED_FILE_TYPES | null = null;
  for (const [cat, config] of Object.entries(ALLOWED_FILE_TYPES)) {
    if (config.extensions.includes(extension)) {
      category = cat as keyof typeof ALLOWED_FILE_TYPES;
      break;
    }
  }

  if (!category) {
    return {
      valid: false,
      error: `File type not allowed. Allowed extensions: ${Object.values(ALLOWED_FILE_TYPES)
        .flatMap(c => c.extensions)
        .join(', ')}`,
    };
  }

  const config = ALLOWED_FILE_TYPES[category];

  // 4. Validate MIME type
  if (!config.mimeTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Invalid MIME type. Expected: ${config.mimeTypes.join(', ')}, Got: ${file.type}`,
    };
  }

  // 5. Check file size
  if (file.size > config.maxSize) {
    return {
      valid: false,
      error: `File size exceeds limit. Maximum: ${config.maxSize / 1024 / 1024}MB`,
    };
  }

  if (file.size === 0) {
    return {
      valid: false,
      error: 'File is empty',
    };
  }

  // 6. Check magic bytes (if buffer provided)
  if (file.buffer) {
    const magicBytesCheck = checkMagicBytes(file.buffer, file.type);
    if (!magicBytesCheck.valid) {
      return { valid: false, error: magicBytesCheck.error };
    }
    if (magicBytesCheck.warnings) {
      warnings.push(...magicBytesCheck.warnings);
    }
  }

  return { valid: true, warnings: warnings.length > 0 ? warnings : undefined };
}

/**
 * Validate filename
 */
export function validateFilename(filename: string): {
  valid: boolean;
  error?: string;
} {
  // 1. Check for null bytes
  if (filename.includes('\0')) {
    return { valid: false, error: 'Filename contains null bytes' };
  }

  // 2. Check for path traversal
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return { valid: false, error: 'Filename contains invalid characters' };
  }

  // 3. Check for double extensions
  const parts = filename.split('.');
  if (parts.length > 2) {
    return { valid: false, error: 'Double extensions not allowed' };
  }

  // 4. Check length
  if (filename.length > 255) {
    return { valid: false, error: 'Filename too long (max 255 characters)' };
  }

  if (filename.length < 3) {
    return { valid: false, error: 'Filename too short' };
  }

  // 5. Check for dangerous patterns
  const dangerousPatterns = [
    /\.exe$/i,
    /\.bat$/i,
    /\.cmd$/i,
    /\.com$/i,
    /\.pif$/i,
    /\.scr$/i,
    /\.vbs$/i,
    /\.js$/i,
    /\.jar$/i,
    /\.sh$/i,
    /\.php$/i,
    /\.asp$/i,
    /\.jsp$/i,
  ];

  if (dangerousPatterns.some(pattern => pattern.test(filename))) {
    return { valid: false, error: 'Dangerous file extension detected' };
  }

  return { valid: true };
}

/**
 * Check file magic bytes (file signature)
 */
export function checkMagicBytes(buffer: Buffer, expectedMimeType: string): {
  valid: boolean;
  error?: string;
  warnings?: string[];
} {
  const warnings: string[] = [];

  // Get first 8 bytes
  const header = buffer.subarray(0, 8).toString('hex').toUpperCase();

  // Check for dangerous signatures
  for (const dangerous of DANGEROUS_SIGNATURES) {
    if (header.startsWith(dangerous.signature)) {
      return {
        valid: false,
        error: `Dangerous file signature detected: ${dangerous.description}`,
      };
    }
  }

  // Validate against expected MIME type
  const validSignatures: { [key: string]: string[] } = {
    'image/jpeg': ['FFD8FF'],
    'image/png': ['89504E47'],
    'image/gif': ['474946383761', '474946383961'], // GIF87a, GIF89a
    'image/webp': ['52494646'], // RIFF
    'application/pdf': ['25504446'], // %PDF
    'video/mp4': ['00000018', '00000020'], // ftyp
    'video/webm': ['1A45DFA3'], // EBML
  };

  const expectedSignatures = validSignatures[expectedMimeType];
  if (expectedSignatures) {
    const matches = expectedSignatures.some(sig => header.startsWith(sig));
    if (!matches) {
      return {
        valid: false,
        error: 'File content does not match declared MIME type (possible file type spoofing)',
      };
    }
  }

  return { valid: true, warnings: warnings.length > 0 ? warnings : undefined };
}

/**
 * Sanitize filename
 */
export function sanitizeFilename(filename: string): string {
  // Remove path components
  filename = filename.replace(/^.*[\\\/]/, '');

  // Remove dangerous characters
  filename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');

  // Remove multiple dots
  filename = filename.replace(/\.{2,}/g, '.');

  // Remove leading dots
  filename = filename.replace(/^\.+/, '');

  // Ensure extension is preserved
  const parts = filename.split('.');
  if (parts.length > 2) {
    filename = parts[0] + '.' + parts[parts.length - 1];
  }

  // Limit length
  if (filename.length > 255) {
    const ext = filename.substring(filename.lastIndexOf('.'));
    filename = filename.substring(0, 255 - ext.length) + ext;
  }

  return filename;
}

/**
 * Generate secure filename
 */
export function generateSecureFilename(originalFilename: string): string {
  const extension = originalFilename.substring(originalFilename.lastIndexOf('.'));
  const hash = crypto.randomBytes(16).toString('hex');
  const timestamp = Date.now();

  return `${timestamp}_${hash}${extension}`;
}

/**
 * Scan file for malware patterns (basic)
 */
export function scanForMalware(buffer: Buffer): {
  clean: boolean;
  threats?: string[];
} {
  const threats: string[] = [];
  const content = buffer.toString('utf8', 0, Math.min(buffer.length, 10000));

  // Check for script tags
  if (/<script/i.test(content)) {
    threats.push('Script tag detected');
  }

  // Check for PHP code
  if (/<\?php/i.test(content)) {
    threats.push('PHP code detected');
  }

  // Check for eval
  if (/eval\s*\(/i.test(content)) {
    threats.push('Eval function detected');
  }

  // Check for base64 encoded scripts
  if (/base64_decode/i.test(content)) {
    threats.push('Base64 decode detected');
  }

  return {
    clean: threats.length === 0,
    threats: threats.length > 0 ? threats : undefined,
  };
}

/**
 * Complete file upload validation
 */
export async function validateAndProcessFileUpload(file: {
  name: string;
  size: number;
  type: string;
  buffer: Buffer;
  userId: number;
  ip: string;
}): Promise<{
  success: boolean;
  error?: string;
  secureFilename?: string;
  warnings?: string[];
}> {
  // 1. Validate file
  const validation = validateFileUpload(file);
  if (!validation.valid) {
    logSecurityEvent({
      type: 'FILE_UPLOAD_REJECTED',
      severity: 'MEDIUM',
      ip: file.ip,
      details: `File upload rejected: ${validation.error}`,
    });

    return { success: false, error: validation.error };
  }

  // 2. Scan for malware
  const malwareScan = scanForMalware(file.buffer);
  if (!malwareScan.clean) {
    logSecurityEvent({
      type: 'MALWARE_DETECTED',
      severity: 'CRITICAL',
      ip: file.ip,
      details: `Malware detected in file upload: ${malwareScan.threats?.join(', ')}`,
    });

    return {
      success: false,
      error: 'File contains potentially malicious content',
    };
  }

  // 3. Generate secure filename
  const secureFilename = generateSecureFilename(file.name);

  // 4. Log successful upload
  logSecurityEvent({
    type: 'FILE_UPLOAD_SUCCESS',
    severity: 'LOW',
    ip: file.ip,
    details: `File uploaded successfully: ${file.name} -> ${secureFilename}`,
  });

  return {
    success: true,
    secureFilename,
    warnings: validation.warnings,
  };
}
