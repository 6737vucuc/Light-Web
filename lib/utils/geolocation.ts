
/**
 * Simple Geolocation utility using ip-api.com
 * No API key required for the free tier (limited to 45 requests per minute)
 */

export interface GeoLocation {
  city?: string;
  country?: string;
  countryCode?: string;
  regionName?: string;
  isp?: string;
  formatted?: string;
}

export async function getGeoLocation(ip: string): Promise<GeoLocation> {
  // Handle local/unknown IPs
  if (!ip || ip === 'unknown' || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return { formatted: 'Local/Internal Network' };
  }

  try {
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,regionName,city,isp`);
    
    if (!response.ok) {
      return { formatted: 'Unknown Location' };
    }

    const data = await response.json();

    if (data.status === 'success') {
      return {
        city: data.city,
        country: data.country,
        countryCode: data.countryCode,
        regionName: data.regionName,
        isp: data.isp,
        formatted: `${data.city}, ${data.country}`
      };
    }

    return { formatted: 'Unknown Location' };
  } catch (error) {
    console.error('Geolocation lookup failed:', error);
    return { formatted: 'Unknown Location' };
  }
}
