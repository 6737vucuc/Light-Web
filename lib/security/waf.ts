/**
 * WEB APPLICATION FIREWALL (WAF)
 * 
 * Enterprise-grade firewall protection
 * Similar to Cloudflare WAF, AWS WAF, Imperva
 */

import { NextRequest } from 'next/server';
import { validateSecureInput, logSecurityEvent } from './advanced-protection';
import { getClientIdentifier } from './rate-limit';

/**
 * IP Blacklist (can be extended with database)
 */
const IP_BLACKLIST = new Set<string>([
  // Add known malicious IPs here
]);

/**
 * IP Whitelist (trusted IPs)
 */
const IP_WHITELIST = new Set<string>([
  '127.0.0.1',
  '::1',
]);

/**
 * Country Blacklist (ISO country codes)
 */
const COUNTRY_BLACKLIST = new Set<string>([
  // Add countries if needed (e.g., 'CN', 'RU')
]);

/**
 * Malicious User Agents
 */
const MALICIOUS_USER_AGENTS = [
  /sqlmap/i,
  /nikto/i,
  /nmap/i,
  /masscan/i,
  /nessus/i,
  /burp/i,
  /metasploit/i,
  /havij/i,
  /acunetix/i,
  /w3af/i,
  /dirbuster/i,
  /gobuster/i,
  /wpscan/i,
  /nuclei/i,
];

/**
 * Suspicious Patterns in URLs
 */
const SUSPICIOUS_URL_PATTERNS = [
  /\.\.\//, // Path traversal
  /%2e%2e/, // Encoded path traversal
  /\/etc\/passwd/, // Linux system files
  /\/windows\/system32/, // Windows system files
  /\.php$/, // PHP files (if not using PHP)
  /\.asp$/, // ASP files
  /\.jsp$/, // JSP files
  /\/admin/, // Admin paths
  /\/phpmyadmin/, // phpMyAdmin
  /\/wp-admin/, // WordPress admin
  /\/wp-login/, // WordPress login
  /\.env/, // Environment files
  /\.git/, // Git files
  /\.svn/, // SVN files
  /\/backup/, // Backup files
  /\.sql/, // SQL files
  /\.bak/, // Backup files
];

/**
 * Attack Signatures
 */
interface AttackSignature {
  name: string;
  pattern: RegExp;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

const ATTACK_SIGNATURES: AttackSignature[] = [
  {
    name: 'SQL_INJECTION',
    pattern: /(\bunion\b|\bselect\b|\binsert\b|\bupdate\b|\bdelete\b|\bdrop\b)/gi,
    severity: 'CRITICAL',
  },
  {
    name: 'XSS',
    pattern: /<script|javascript:|onerror=|onload=/gi,
    severity: 'HIGH',
  },
  {
    name: 'COMMAND_INJECTION',
    pattern: /[;&|`$]/g,
    severity: 'CRITICAL',
  },
  {
    name: 'PATH_TRAVERSAL',
    pattern: /\.\.\//g,
    severity: 'HIGH',
  },
  {
    name: 'LDAP_INJECTION',
    pattern: /[*()\\]/g,
    severity: 'MEDIUM',
  },
];

/**
 * WAF Rule Engine
 */
export class WAF {
  /**
   * Check if IP is blacklisted
   */
  static isIPBlacklisted(ip: string): boolean {
    return IP_BLACKLIST.has(ip);
  }

  /**
   * Check if IP is whitelisted
   */
  static isIPWhitelisted(ip: string): boolean {
    return IP_WHITELIST.has(ip);
  }

  /**
   * Check User Agent
   */
  static isMaliciousUserAgent(userAgent: string): boolean {
    return MALICIOUS_USER_AGENTS.some(pattern => pattern.test(userAgent));
  }

  /**
   * Check URL for suspicious patterns
   */
  static hasSuspiciousURL(url: string): boolean {
    return SUSPICIOUS_URL_PATTERNS.some(pattern => pattern.test(url));
  }

  /**
   * Detect attack signatures
   */
  static detectAttackSignatures(input: string): AttackSignature[] {
    return ATTACK_SIGNATURES.filter(sig => sig.pattern.test(input));
  }

  /**
   * Main WAF inspection
   */
  static inspect(request: NextRequest): {
    allowed: boolean;
    reason?: string;
    severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  } {
    const clientId = getClientIdentifier(request);
    const userAgent = request.headers.get('user-agent') || '';
    const url = new URL(request.url);
    const fullURL = url.pathname + url.search;

    // 1. Check IP whitelist (always allow)
    if (this.isIPWhitelisted(clientId)) {
      return { allowed: true };
    }

    // 2. Check IP blacklist
    if (this.isIPBlacklisted(clientId)) {
      logSecurityEvent({
        type: 'WAF_BLOCKED_IP',
        severity: 'HIGH',
        ip: clientId,
        details: 'IP is blacklisted',
      });

      return {
        allowed: false,
        reason: 'IP blocked by WAF',
        severity: 'HIGH',
      };
    }

    // 3. Check malicious user agent
    if (this.isMaliciousUserAgent(userAgent)) {
      logSecurityEvent({
        type: 'WAF_BLOCKED_USER_AGENT',
        severity: 'MEDIUM',
        ip: clientId,
        details: `Malicious user agent: ${userAgent}`,
      });

      return {
        allowed: false,
        reason: 'Malicious user agent detected',
        severity: 'MEDIUM',
      };
    }

    // 4. Check suspicious URL patterns
    if (this.hasSuspiciousURL(fullURL)) {
      logSecurityEvent({
        type: 'WAF_BLOCKED_URL',
        severity: 'HIGH',
        ip: clientId,
        details: `Suspicious URL: ${fullURL}`,
      });

      return {
        allowed: false,
        reason: 'Suspicious URL pattern detected',
        severity: 'HIGH',
      };
    }

    // 5. Check for attack signatures in URL
    const urlSignatures = this.detectAttackSignatures(fullURL);
    if (urlSignatures.length > 0) {
      const maxSeverity = urlSignatures.reduce((max, sig) => {
        const severityLevels = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
        return severityLevels[sig.severity] > severityLevels[max] ? sig.severity : max;
      }, 'LOW' as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL');

      logSecurityEvent({
        type: 'WAF_ATTACK_SIGNATURE',
        severity: maxSeverity,
        ip: clientId,
        details: `Attack signatures detected: ${urlSignatures.map(s => s.name).join(', ')}`,
      });

      return {
        allowed: false,
        reason: 'Attack signature detected',
        severity: maxSeverity,
      };
    }

    // 6. Check HTTP method
    const allowedMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];
    if (!allowedMethods.includes(request.method)) {
      logSecurityEvent({
        type: 'WAF_INVALID_METHOD',
        severity: 'MEDIUM',
        ip: clientId,
        details: `Invalid HTTP method: ${request.method}`,
      });

      return {
        allowed: false,
        reason: 'Invalid HTTP method',
        severity: 'MEDIUM',
      };
    }

    // All checks passed
    return { allowed: true };
  }

  /**
   * Add IP to blacklist
   */
  static blacklistIP(ip: string): void {
    IP_BLACKLIST.add(ip);
    logSecurityEvent({
      type: 'IP_BLACKLISTED',
      severity: 'HIGH',
      ip,
      details: 'IP added to blacklist',
    });
  }

  /**
   * Remove IP from blacklist
   */
  static removeFromBlacklist(ip: string): void {
    IP_BLACKLIST.delete(ip);
  }

  /**
   * Get WAF statistics
   */
  static getStats(): {
    blacklistedIPs: number;
    whitelistedIPs: number;
    attackSignatures: number;
  } {
    return {
      blacklistedIPs: IP_BLACKLIST.size,
      whitelistedIPs: IP_WHITELIST.size,
      attackSignatures: ATTACK_SIGNATURES.length,
    };
  }
}

/**
 * WAF Middleware Response
 */
export function createWAFBlockResponse(reason: string): Response {
  return new Response(
    JSON.stringify({
      error: 'Access Denied',
      message: 'Your request has been blocked by our Web Application Firewall',
      reason,
      code: 'WAF_BLOCKED',
    }),
    {
      status: 403,
      headers: {
        'Content-Type': 'application/json',
        'X-WAF-Block': 'true',
      },
    }
  );
}
