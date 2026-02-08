/**
 * SSRF Protection Service
 * OWASP A10:2021 - Server-Side Request Forgery
 * ISO 27001 A.14.2 - Security in development
 */

import { URL } from 'url';
import { config } from '../config';

/**
 * CIDR range representation
 */
interface CIDRRange {
  network: bigint;
  mask: bigint;
}

/**
 * SSRF Protection Service
 * Prevents Server-Side Request Forgery attacks
 * 
 * Blocked by default:
 * - Private networks (RFC 1918)
 * - Loopback addresses
 * - Link-local addresses
 * - Cloud metadata endpoints
 * 
 * @class SSRFProtectionService
 */
export class SSRFProtectionService {
  private readonly blockedCidrs: CIDRRange[];
  private readonly blockedHostnames: Set<string>;

  constructor() {
    this.blockedCidrs = config.ssrf.blockedCidrs.map(cidr => this.parseCIDR(cidr));
    this.blockedHostnames = new Set(
      config.ssrf.blockedHostnames.map(h => h.toLowerCase())
    );
  }

  /**
   * Validate URL for SSRF threats
   * 
   * @param url - URL to validate
   * @throws Error if URL is blocked
   */
  validateUrl(url: string): void {
    let parsed: URL;

    try {
      parsed = new URL(url);
    } catch (error) {
      throw new Error('Invalid URL format');
    }

    // Only allow HTTP and HTTPS
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error(`Protocol ${parsed.protocol} not allowed`);
    }

    // Check hostname blocklist
    const hostname = parsed.hostname.toLowerCase();
    if (this.blockedHostnames.has(hostname)) {
      throw new Error(`Hostname ${hostname} is blocked`);
    }

    // Check for IP address in hostname
    const ip = this.extractIP(hostname);
    if (ip !== null) {
      this.validateIP(ip);
    }

    // Check for @ in URL (credential injection)
    if (url.includes('@')) {
      throw new Error('URL contains credentials, which is not allowed');
    }

    // Check for suspicious patterns
    this.validateSuspiciousPatterns(url);
  }

  /**
   * Extract IP address from hostname
   * 
   * @param hostname - Hostname to check
   * @returns IP address as bigint or null
   */
  private extractIP(hostname: string): bigint | null {
    // IPv4 pattern
    const ipv4Pattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const match = hostname.match(ipv4Pattern);

    if (match) {
      const octets = match.slice(1).map(Number);
      
      // Validate octets
      if (octets.some(o => o > 255)) {
        throw new Error('Invalid IP address');
      }

      // Convert to bigint
      const num = (octets[0] << 24) |
        (octets[1] << 16) |
        (octets[2] << 8) |
        octets[3];
      return BigInt(num >>> 0);
    }

    // Check for decimal IP (e.g., http://2130706433)
    const decimalPattern = /^\d+$/;
    if (decimalPattern.test(hostname)) {
      const num = BigInt(hostname);
      if (num <= 0xFFFFFFFFn) {
        return num;
      }
    }

    // Check for hex IP (e.g., 0x7f000001)
    const hexPattern = /^0x[0-9a-f]+$/i;
    if (hexPattern.test(hostname)) {
      const num = BigInt(hostname);
      if (num <= 0xFFFFFFFFn) {
        return num;
      }
    }

    return null;
  }

  /**
   * Validate IP address against blocked ranges
   * 
   * @param ip - IP address as bigint
   * @throws Error if IP is in blocked range
   */
  private validateIP(ip: bigint): void {
    for (const range of this.blockedCidrs) {
      if ((ip & range.mask) === range.network) {
        const ipStr = this.ipToString(ip);
        throw new Error(`IP address ${ipStr} is in blocked range`);
      }
    }
  }

  /**
   * Convert IP bigint to string
   * 
   * @param ip - IP as bigint
   * @returns IP string (x.x.x.x)
   */
  private ipToString(ip: bigint): string {
    const num = Number(ip);
    return [
      (num >>> 24) & 0xFF,
      (num >>> 16) & 0xFF,
      (num >>> 8) & 0xFF,
      num & 0xFF,
    ].join('.');
  }

  /**
   * Parse CIDR notation
   * 
   * @param cidr - CIDR string (e.g., "10.0.0.0/8")
   * @returns CIDR range
   */
  private parseCIDR(cidr: string): CIDRRange {
    const [ipStr, maskBitsStr] = cidr.split('/');
    const maskBits = parseInt(maskBitsStr, 10);

    if (maskBits < 0 || maskBits > 32) {
      throw new Error(`Invalid CIDR mask: ${maskBits}`);
    }

    // Parse IP
    const octets = ipStr.split('.').map(Number);
    if (octets.length !== 4 || octets.some(o => o < 0 || o > 255)) {
      throw new Error(`Invalid IP in CIDR: ${ipStr}`);
    }

    const num = (octets[0] << 24) |
      (octets[1] << 16) |
      (octets[2] << 8) |
      octets[3];
    const ip = BigInt(num >>> 0);

    // Calculate mask
    const mask = maskBits === 0 
      ? 0n 
      : (0xFFFFFFFFn << BigInt(32 - maskBits)) & 0xFFFFFFFFn;

    const network = ip & mask;

    return { network, mask };
  }

  /**
   * Validate suspicious patterns in URL
   * 
   * @param url - URL to check
   * @throws Error if suspicious pattern detected
   */
  private validateSuspiciousPatterns(url: string): void {
    // Check for URL encoding obfuscation
    const encodedPatterns = [
      /%00/, // Null byte
      /%0d/, // Carriage return
      /%0a/, // Line feed
      /%09/, // Tab
      /%2e%2e/, // Double-encoded ..
    ];

    for (const pattern of encodedPatterns) {
      if (pattern.test(url.toLowerCase())) {
        throw new Error('URL contains suspicious encoded characters');
      }
    }

    // Check for Unicode obfuscation
    if (/[\u0000-\u001f\u007f-\u009f]/.test(url)) {
      throw new Error('URL contains control characters');
    }

    // Check for DNS rebinding patterns
    if (/(?:\d{1,3}\.){3}\d{1,3}\..*\.(?:nip\.io|xip\.io|sslip\.io)/i.test(url)) {
      throw new Error('URL contains DNS rebinding pattern');
    }
  }

  /**
   * Check if URL is allowed (doesn't throw)
   * 
   * @param url - URL to check
   * @returns True if allowed
   */
  isAllowed(url: string): boolean {
    try {
      this.validateUrl(url);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Singleton instance
 */
export const ssrfProtection = new SSRFProtectionService();
