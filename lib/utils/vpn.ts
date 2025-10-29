import axios from 'axios';

export async function detectVPN(ipAddress: string) {
  try {
    const response = await axios.get(
      `https://ipinfo.io/${ipAddress}?token=${process.env.IPINFO_API_KEY}`
    );
    
    const data = response.data;
    
    // Check if the IP is from a VPN, proxy, or hosting provider
    const isVpn = 
      data.privacy?.vpn === true ||
      data.privacy?.proxy === true ||
      data.privacy?.hosting === true ||
      data.company?.type === 'hosting' ||
      data.company?.type === 'isp';
    
    return {
      isVpn,
      data,
    };
  } catch (error) {
    console.error('VPN detection error:', error);
    return {
      isVpn: false,
      data: null,
    };
  }
}

export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIp) {
    return realIp;
  }
  
  return 'unknown';
}

