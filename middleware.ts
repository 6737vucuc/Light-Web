import { NextRequest, NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n';

// Create the i18n middleware
const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always'
});

// VPN Detection function (simplified for middleware)
async function detectVPNSimple(ipAddress: string): Promise<{
  isVPN: boolean;
  isTor: boolean;
  isProxy: boolean;
  isHosting: boolean;
  riskScore: number;
  country?: string;
  isp?: string;
}> {
  // Skip detection for localhost/private IPs
  if (
    ipAddress === '127.0.0.1' ||
    ipAddress === 'localhost' ||
    ipAddress === 'unknown' ||
    ipAddress.startsWith('192.168.') ||
    ipAddress.startsWith('10.') ||
    ipAddress.startsWith('172.')
  ) {
    return {
      isVPN: false,
      isTor: false,
      isProxy: false,
      isHosting: false,
      riskScore: 0,
    };
  }

  try {
    // Use IP-API for fast detection (free, no API key needed)
    const response = await fetch(
      `http://ip-api.com/json/${ipAddress}?fields=status,message,country,isp,org,proxy,hosting`,
      { 
        signal: AbortSignal.timeout(3000), // 3 second timeout
        cache: 'no-store'
      }
    );
    
    const data = await response.json();

    if (data.status === 'fail') {
      console.warn('VPN detection failed:', data.message);
      return {
        isVPN: false,
        isTor: false,
        isProxy: false,
        isHosting: false,
        riskScore: 0,
      };
    }

    // Check for VPN keywords in ISP/Organization
    const vpnKeywords = ['vpn', 'proxy', 'tor', 'anonymous', 'private', 'tunnel', 'hide', 'mask'];
    const ispLower = (data.isp || '').toLowerCase();
    const orgLower = (data.org || '').toLowerCase();
    
    let isVPN = false;
    let isTor = false;
    let riskScore = 0;

    // Check keywords
    for (const keyword of vpnKeywords) {
      if (ispLower.includes(keyword) || orgLower.includes(keyword)) {
        isVPN = true;
        riskScore += 30;
        
        if (keyword === 'tor') {
          isTor = true;
          riskScore += 50;
        }
        break;
      }
    }

    const isProxy = data.proxy || false;
    const isHosting = data.hosting || false;

    if (isHosting) {
      isVPN = true;
      riskScore += 20;
    }

    if (isProxy) {
      riskScore += 40;
    }

    return {
      isVPN,
      isTor,
      isProxy,
      isHosting,
      riskScore,
      country: data.country,
      isp: data.isp,
    };
  } catch (error) {
    console.error('VPN detection error in middleware:', error);
    // On error, allow access (fail open)
    return {
      isVPN: false,
      isTor: false,
      isProxy: false,
      isHosting: false,
      riskScore: 0,
    };
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip VPN detection for certain paths
  const skipPaths = [
    '/api/',
    '/_next/',
    '/_vercel/',
    '/favicon.ico',
    '/robots.txt',
    '/sitemap.xml',
    '/vpn-blocked', // Allow access to the blocked page itself
  ];

  const shouldSkipVPN = skipPaths.some(path => pathname.startsWith(path)) || 
                        pathname.includes('.');

  if (!shouldSkipVPN) {
    // Get client IP
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0] || 
                     request.headers.get('x-real-ip') || 
                     request.ip ||
                     'unknown';

    // Detect VPN
    const vpnResult = await detectVPNSimple(clientIp);

    // Block if VPN/Tor/Proxy detected
    if (vpnResult.isVPN || vpnResult.isTor || vpnResult.isProxy) {
      console.warn(`VPN/Tor/Proxy detected from IP: ${clientIp}, ISP: ${vpnResult.isp}, blocking access`);
      
      // Redirect to VPN blocked page
      const url = request.nextUrl.clone();
      url.pathname = '/en/vpn-blocked'; // Use English locale for blocked page
      
      const response = NextResponse.redirect(url);
      
      // Add headers with detection info
      response.headers.set('X-VPN-Detected', 'true');
      response.headers.set('X-VPN-Type', vpnResult.isTor ? 'tor' : vpnResult.isVPN ? 'vpn' : 'proxy');
      response.headers.set('X-Risk-Score', vpnResult.riskScore.toString());
      
      return response;
    }
  }

  // Continue with i18n middleware
  return intlMiddleware(request);
}

export const config = {
  // Match only internationalized pathnames
  matcher: [
    // Match all pathnames except for
    // - … if they start with `/_next` or `/_vercel`
    // - … the ones containing a dot (e.g. `favicon.ico`)
    '/((?!_next|_vercel|.*\\..*).*)'
  ]
};
