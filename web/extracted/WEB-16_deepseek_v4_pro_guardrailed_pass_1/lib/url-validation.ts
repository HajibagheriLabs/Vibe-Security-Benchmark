// lib/url-validation.ts
import { lookup } from 'dns/promises';
import { isIP } from 'net';

interface UrlValidationResult {
  isValid: boolean;
  reason?: string;
  hostname?: string;
}

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '::',
  '0:0:0:0:0:0:0:1',
  '0:0:0:0:0:0:0:0',
]);

const BLOCKED_IP_RANGES = [
  /^10\./,                    // 10.0.0.0/8
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
  /^192\.168\./,              // 192.168.0.0/16
  /^169\.254\./,              // 169.254.0.0/16 (link-local)
  /^127\./,                   // 127.0.0.0/8
  /^0\./,                     // 0.0.0.0/8
  /^100\.(6[4-9]|[7-9][0-9]|1[0-1][0-9]|12[0-7])\./, // 100.64.0.0/10 (CGN)
  /^192\.0\.0\./,             // 192.0.0.0/24
  /^192\.0\.2\./,             // 192.0.2.0/24 (TEST-NET-1)
  /^198\.18\./,               // 198.18.0.0/15
  /^198\.51\.100\./,          // 198.51.100.0/24 (TEST-NET-2)
  /^203\.0\.113\./,           // 203.0.113.0/24 (TEST-NET-3)
  /^224\./,                   // 224.0.0.0/4 (multicast)
  /^240\./,                   // 240.0.0.0/4 (reserved)
];

export async function validateWebhookUrl(urlString: string): Promise<UrlValidationResult> {
  try {
    const url = new URL(urlString);
    
    // Check protocol
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { isValid: false, reason: 'Only HTTP and HTTPS protocols are allowed' };
    }

    // Check for credentials in URL
    if (url.username || url.password) {
      return { isValid: false, reason: 'URL must not contain credentials' };
    }

    const hostname = url.hostname.toLowerCase();
    
    // Check blocked hostnames
    if (BLOCKED_HOSTNAMES.has(hostname)) {
      return { isValid: false, reason: 'Target hostname is not allowed' };
    }

    // Check if hostname is an IP address
    if (isIP(hostname)) {
      if (isBlockedIp(hostname)) {
        return { isValid: false, reason: 'Target IP address is not allowed' };
      }
      return { isValid: true, hostname };
    }

    // Resolve DNS and check all resolved IPs
    try {
      const addresses = await lookup(hostname, { all: true });
      
      for (const addr of addresses) {
        if (isBlockedIp(addr.address)) {
          return { isValid: false, reason: 'Target resolves to a blocked IP address' };
        }
      }
      
      return { isValid: true, hostname };
    } catch (dnsError) {
      return { isValid: false, reason: 'Unable to resolve target hostname' };
    }

  } catch (error) {
    return { isValid: false, reason: 'Invalid URL format' };
  }
}

function isBlockedIp(ip: string): boolean {
  // Check IPv6 localhost
  if (ip === '::1' || ip === '::') return true;
  
  // Check IPv4-mapped IPv6 addresses
  if (ip.startsWith('::ffff:')) {
    const ipv4 = ip.substring(7);
    return isBlockedIp(ipv4);
  }

  // Check against blocked ranges
  for (const pattern of BLOCKED_IP_RANGES) {
    if (pattern.test(ip)) return true;
  }

  return false;
}