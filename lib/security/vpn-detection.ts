/**
 * VPN DETECTION SYSTEM
 * 
 * Uses IPinfo API to detect VPN, Proxy, and Tor connections
 * 
 * Features:
 * - VPN detection
 * - Proxy detection
 * - Tor detection
 * - Hosting/Datacenter detection
 * - Geolocation data
 */

interface IPInfoResponse {
  ip: string;
  hostname?: string;
  city?: string;
  region?: string;
  country?: string;
  loc?: string;
  org?: string;
  postal?: string;
  timezone?: string;
  privacy?: {
    vpn: boolean;
    proxy: boolean;
    tor: boolean;
    relay: boolean;
    hosting: boolean;
    service?: string;
  };
  abuse?: {
    address?: string;
    country?: string;
    email?: string;
    name?: string;
    network?: string;
    phone?: string;
  };
  company?: {
    name?: string;
    domain?: string;
    type?: string;
  };
}

interface VPNDetectionResult {
  isVPN: boolean;
  isProxy: boolean;
  isTor: boolean;
  isHosting: boolean;
  isRelay: boolean;
  isSuspicious: boolean;
  ip: string;
  country?: string;
  city?: string;
  org?: string;
  service?: string;
  details: IPInfoResponse;
}

const IPINFO_TOKEN = process.env.IPINFO_API_KEY || 'd6034ac9c81c27';

/**
 * Detect VPN/Proxy using IPinfo API
 */
export async function detectVPN(ip: string): Promise<VPNDetectionResult> {
  try {
    // Call IPinfo API with privacy detection
    const response = await fetch(
      `https://ipinfo.io/${ip}?token=${IPINFO_TOKEN}`,
      {
        headers: {
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`IPinfo API error: ${response.status}`);
    }

    const data: IPInfoResponse = await response.json();

    // Determine if connection is suspicious
    const isVPN = data.privacy?.vpn || false;
    const isProxy = data.privacy?.proxy || false;
    const isTor = data.privacy?.tor || false;
    const isHosting = data.privacy?.hosting || false;
    const isRelay = data.privacy?.relay || false;

    const isSuspicious = isVPN || isProxy || isTor || isHosting || isRelay;

    return {
      isVPN,
      isProxy,
      isTor,
      isHosting,
      isRelay,
      isSuspicious,
      ip: data.ip,
      country: data.country,
      city: data.city,
      org: data.org,
      service: data.privacy?.service,
      details: data,
    };
  } catch (error) {
    console.error('VPN detection error:', error);
    
    // Return safe default on error
    return {
      isVPN: false,
      isProxy: false,
      isTor: false,
      isHosting: false,
      isRelay: false,
      isSuspicious: false,
      ip,
      details: { ip } as IPInfoResponse,
    };
  }
}

/**
 * Get client IP from request
 */
export function getClientIP(request: Request): string {
  // Try various headers in order of preference
  const headers = request.headers;
  
  // Cloudflare
  const cfConnectingIP = headers.get('cf-connecting-ip');
  if (cfConnectingIP) return cfConnectingIP;
  
  // Standard forwarded headers
  const xForwardedFor = headers.get('x-forwarded-for');
  if (xForwardedFor) {
    const ips = xForwardedFor.split(',');
    return ips[0].trim();
  }
  
  const xRealIP = headers.get('x-real-ip');
  if (xRealIP) return xRealIP;
  
  // Vercel
  const vercelForwardedFor = headers.get('x-vercel-forwarded-for');
  if (vercelForwardedFor) {
    const ips = vercelForwardedFor.split(',');
    return ips[0].trim();
  }
  
  // Fallback
  return '0.0.0.0';
}

/**
 * Check if IP should be blocked based on VPN detection
 */
export function shouldBlockIP(result: VPNDetectionResult): boolean {
  // Block if using VPN, Proxy, or Tor
  return result.isVPN || result.isProxy || result.isTor;
}

/**
 * Get human-readable description of connection type
 */
export function getConnectionTypeDescription(result: VPNDetectionResult): string {
  if (result.isTor) return 'Tor Network';
  if (result.isVPN) return `VPN${result.service ? ` (${result.service})` : ''}`;
  if (result.isProxy) return 'Proxy Server';
  if (result.isHosting) return 'Hosting/Datacenter';
  if (result.isRelay) return 'Relay Server';
  return 'Direct Connection';
}

/**
 * Log VPN detection for security monitoring
 */
export function logVPNDetection(
  userId: number | null,
  result: VPNDetectionResult,
  action: string
): void {
  if (result.isSuspicious) {
    console.warn('SECURITY: VPN/Proxy detected', {
      userId,
      action,
      ip: result.ip,
      type: getConnectionTypeDescription(result),
      country: result.country,
      city: result.city,
      org: result.org,
      service: result.service,
    });
  }
}
