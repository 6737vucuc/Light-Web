// VPN Detection System
// Detects VPN, Proxy, and Tor connections

import { db } from '@/lib/db';
import { vpnLogs } from '@/lib/db/schema';

export interface VPNDetectionResult {
  isVPN: boolean;
  isTor: boolean;
  isProxy: boolean;
  isHosting: boolean;
  isAnonymous: boolean;
  riskScore: number;
  threatLevel: 'low' | 'medium' | 'high' | 'critical';
  country?: string;
  countryCode?: string;
  city?: string;
  region?: string;
  isp?: string;
  organization?: string;
  asn?: string;
}

/**
 * Detect VPN using IP-API (Free service)
 * Note: For production, consider using paid services like:
 * - IPQualityScore
 * - IPHub
 * - VPNapi
 */
export async function detectVPN(ipAddress: string): Promise<VPNDetectionResult> {
  try {
    // Use ip-api.com for basic detection (free, 45 requests/minute)
    const response = await fetch(
      `http://ip-api.com/json/${ipAddress}?fields=status,message,country,countryCode,region,city,isp,org,as,proxy,hosting`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch IP data');
    }

    const data = await response.json();

    if (data.status === 'fail') {
      throw new Error(data.message || 'IP lookup failed');
    }

    // Calculate risk score based on various factors
    let riskScore = 0;
    const isProxy = data.proxy === true;
    const isHosting = data.hosting === true;
    
    // Simple heuristics for VPN/Tor detection
    const vpnKeywords = ['vpn', 'proxy', 'tunnel', 'anonymous', 'privacy'];
    const ispLower = (data.isp || '').toLowerCase();
    const orgLower = (data.org || '').toLowerCase();
    
    const isVPN = vpnKeywords.some(keyword => 
      ispLower.includes(keyword) || orgLower.includes(keyword)
    ) || isProxy || isHosting;

    const isTor = ispLower.includes('tor') || orgLower.includes('tor');

    // Calculate risk score
    if (isVPN) riskScore += 40;
    if (isTor) riskScore += 50;
    if (isProxy) riskScore += 30;
    if (isHosting) riskScore += 20;

    // Determine threat level
    let threatLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (riskScore >= 80) threatLevel = 'critical';
    else if (riskScore >= 60) threatLevel = 'high';
    else if (riskScore >= 30) threatLevel = 'medium';

    return {
      isVPN,
      isTor,
      isProxy,
      isHosting,
      isAnonymous: isVPN || isTor || isProxy,
      riskScore: Math.min(riskScore, 100),
      threatLevel,
      country: data.country,
      countryCode: data.countryCode,
      city: data.city,
      region: data.region,
      isp: data.isp,
      organization: data.org,
      asn: data.as,
    };
  } catch (error) {
    console.error('VPN detection error:', error);
    
    // Return safe defaults on error
    return {
      isVPN: false,
      isTor: false,
      isProxy: false,
      isHosting: false,
      isAnonymous: false,
      riskScore: 0,
      threatLevel: 'low',
    };
  }
}

/**
 * Log VPN detection to database
 */
export async function logVPNDetection(
  userId: number | null,
  ipAddress: string,
  detection: VPNDetectionResult,
  userAgent: string,
  requestPath: string,
  requestMethod: string,
  isBlocked: boolean = false,
  blockReason?: string
): Promise<number> {
  const [log] = await db.insert(vpnLogs).values({
    userId,
    ipAddress,
    country: detection.country,
    countryCode: detection.countryCode,
    city: detection.city,
    region: detection.region,
    isp: detection.isp,
    organization: detection.organization,
    asn: detection.asn,
    isVPN: detection.isVPN,
    isTor: detection.isTor,
    isProxy: detection.isProxy,
    isHosting: detection.isHosting,
    isAnonymous: detection.isAnonymous,
    riskScore: detection.riskScore,
    threatLevel: detection.threatLevel,
    detectionService: 'ip-api',
    detectionData: JSON.stringify(detection),
    isBlocked,
    blockReason,
    userAgent,
    requestPath,
    requestMethod,
    detectedAt: new Date(),
    createdAt: new Date(),
  }).returning({ id: vpnLogs.id });

  return log.id;
}

/**
 * Check if user should be blocked based on VPN detection
 */
export function shouldBlockVPN(detection: VPNDetectionResult): boolean {
  // Block if any of these conditions are true
  return detection.isVPN || detection.isTor || detection.isProxy || detection.riskScore >= 30;
}

/**
 * Get client IP from request headers
 */
export function getClientIP(headers: Headers): string {
  // Try various headers in order of preference
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIP = headers.get('x-real-ip');
  if (realIP) {
    return realIP.trim();
  }

  const cfConnectingIP = headers.get('cf-connecting-ip');
  if (cfConnectingIP) {
    return cfConnectingIP.trim();
  }

  return 'unknown';
}
