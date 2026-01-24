/**
 * VPN Detection Utility
 * Detects VPN, Tor, Proxy, and suspicious connections using multiple services
 */

export interface VPNDetectionResult {
  ipAddress: string;
  country?: string;
  countryCode?: string;
  city?: string;
  region?: string;
  isp?: string;
  organization?: string;
  asn?: string;
  isVPN: boolean;
  isTor: boolean;
  isProxy: boolean;
  isHosting: boolean;
  isAnonymous: boolean;
  riskScore: number; // 0-100
  threatLevel: 'low' | 'medium' | 'high' | 'critical';
  detectionService: string;
  detectionData?: any;
}

/**
 * Detect VPN using ip-api.com (Free, no API key required)
 * Rate limit: 45 requests per minute
 */
export async function detectVPNWithIPAPI(ipAddress: string): Promise<VPNDetectionResult> {
  try {
    const response = await fetch(`http://ip-api.com/json/${ipAddress}?fields=status,message,country,countryCode,region,city,isp,org,as,proxy,hosting,query`);
    const data = await response.json();

    if (data.status === 'fail') {
      throw new Error(data.message || 'IP API request failed');
    }

    // Calculate risk score based on proxy and hosting flags
    let riskScore = 0;
    let isVPN = false;
    let isTor = false;
    let isProxy = data.proxy || false;
    let isHosting = data.hosting || false;
    let isAnonymous = false;

    // Check if ISP/Org contains VPN keywords
    const vpnKeywords = ['vpn', 'proxy', 'tor', 'anonymous', 'private', 'tunnel', 'hide', 'mask'];
    const ispLower = (data.isp || '').toLowerCase();
    const orgLower = (data.org || '').toLowerCase();
    
    for (const keyword of vpnKeywords) {
      if (ispLower.includes(keyword) || orgLower.includes(keyword)) {
        isVPN = true;
        riskScore += 30;
        break;
      }
    }

    // Check for Tor
    if (ispLower.includes('tor') || orgLower.includes('tor')) {
      isTor = true;
      riskScore += 50;
    }

    // Hosting providers are often used for VPNs
    if (isHosting) {
      riskScore += 20;
      isVPN = true;
    }

    // Proxy detected
    if (isProxy) {
      riskScore += 40;
      isAnonymous = true;
    }

    // Determine threat level
    let threatLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (riskScore >= 80) threatLevel = 'critical';
    else if (riskScore >= 60) threatLevel = 'high';
    else if (riskScore >= 30) threatLevel = 'medium';

    return {
      ipAddress: data.query,
      country: data.country,
      countryCode: data.countryCode,
      city: data.city,
      region: data.region,
      isp: data.isp,
      organization: data.org,
      asn: data.as,
      isVPN,
      isTor,
      isProxy,
      isHosting,
      isAnonymous,
      riskScore,
      threatLevel,
      detectionService: 'ip-api.com',
      detectionData: data,
    };
  } catch (error) {
    console.error('VPN detection error (IP-API):', error);
    // Return default result on error
    return {
      ipAddress,
      isVPN: false,
      isTor: false,
      isProxy: false,
      isHosting: false,
      isAnonymous: false,
      riskScore: 0,
      threatLevel: 'low',
      detectionService: 'ip-api.com',
      detectionData: { error: String(error) },
    };
  }
}

/**
 * Detect VPN using IPQualityScore (Requires API key)
 * More accurate but requires paid API
 */
export async function detectVPNWithIPQS(ipAddress: string): Promise<VPNDetectionResult> {
  const apiKey = process.env.IPQS_API_KEY;
  
  if (!apiKey) {
    console.warn('IPQS_API_KEY not set, falling back to IP-API');
    return detectVPNWithIPAPI(ipAddress);
  }

  try {
    const response = await fetch(
      `https://ipqualityscore.com/api/json/ip/${apiKey}/${ipAddress}?strictness=1&allow_public_access_points=true&fast=true`
    );
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'IPQS request failed');
    }

    // IPQS provides detailed fraud scores
    const riskScore = Math.min(data.fraud_score || 0, 100);
    let threatLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    
    if (riskScore >= 85) threatLevel = 'critical';
    else if (riskScore >= 75) threatLevel = 'high';
    else if (riskScore >= 50) threatLevel = 'medium';

    return {
      ipAddress: data.request_id || ipAddress,
      country: data.country_code,
      countryCode: data.country_code,
      city: data.city,
      region: data.region,
      isp: data.ISP,
      organization: data.organization,
      asn: data.ASN?.toString(),
      isVPN: data.vpn || false,
      isTor: data.tor || false,
      isProxy: data.proxy || false,
      isHosting: data.host || false,
      isAnonymous: data.vpn || data.tor || data.proxy || false,
      riskScore,
      threatLevel,
      detectionService: 'ipqualityscore.com',
      detectionData: data,
    };
  } catch (error) {
    console.error('VPN detection error (IPQS):', error);
    // Fallback to IP-API
    return detectVPNWithIPAPI(ipAddress);
  }
}

/**
 * Main VPN detection function
 * Tries IPQS first (if API key available), falls back to IP-API
 */
export async function detectVPN(ipAddress: string): Promise<VPNDetectionResult> {
  // Skip detection for localhost/private IPs/unknown
  if (
    ipAddress === '127.0.0.1' ||
    ipAddress === 'localhost' ||
    ipAddress === 'unknown' ||
    ipAddress === '' ||
    !ipAddress ||
    ipAddress.startsWith('192.168.') ||
    ipAddress.startsWith('10.') ||
    ipAddress.startsWith('172.')
  ) {
    return {
      ipAddress,
      isVPN: false,
      isTor: false,
      isProxy: false,
      isHosting: false,
      isAnonymous: false,
      riskScore: 0,
      threatLevel: 'low',
      detectionService: 'local',
      detectionData: { message: 'Local/Private IP - skipped detection' },
    };
  }

  // Try IPQS if API key is available, otherwise use IP-API
  if (process.env.IPQS_API_KEY) {
    return detectVPNWithIPQS(ipAddress);
  } else {
    return detectVPNWithIPAPI(ipAddress);
  }
}

/**
 * Check if connection should be blocked based on detection result
 */
export function shouldBlockConnection(result: VPNDetectionResult): boolean {
  // Block Tor connections (highest risk)
  if (result.isTor) return true;

  // Block high-risk VPNs
  if (result.isVPN && result.riskScore >= 70) return true;

  // Block critical threat level
  if (result.threatLevel === 'critical') return true;

  // Don't block by default
  return false;
}

/**
 * Get block reason message
 */
export function getBlockReason(result: VPNDetectionResult): string {
  if (result.isTor) {
    return 'Tor network detected - Access denied for security reasons';
  }
  
  if (result.isVPN && result.riskScore >= 70) {
    return `High-risk VPN detected (Risk Score: ${result.riskScore}) - Access denied`;
  }
  
  if (result.threatLevel === 'critical') {
    return `Critical threat level detected - Access denied`;
  }
  
  return 'Suspicious connection detected - Access denied';
}
