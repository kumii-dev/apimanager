/**
 * SSRF Protection Tests
 * ISO 27001 A.14.2 - Security Testing
 * OWASP A10:2021 - SSRF
 */

import { SSRFProtectionService } from '../src/services/ssrf';

describe('SSRF Protection Service', () => {
  let ssrfProtection: SSRFProtectionService;

  beforeEach(() => {
    ssrfProtection = new SSRFProtectionService();
  });

  describe('Private IP Ranges (RFC 1918)', () => {
    test('should block 10.0.0.0/8', () => {
      expect(() => ssrfProtection.validateUrl('http://10.0.0.1')).toThrow();
      expect(() => ssrfProtection.validateUrl('http://10.255.255.255')).toThrow();
    });

    test('should block 172.16.0.0/12', () => {
      expect(() => ssrfProtection.validateUrl('http://172.16.0.1')).toThrow();
      expect(() => ssrfProtection.validateUrl('http://172.31.255.255')).toThrow();
    });

    test('should block 192.168.0.0/16', () => {
      expect(() => ssrfProtection.validateUrl('http://192.168.1.1')).toThrow();
      expect(() => ssrfProtection.validateUrl('http://192.168.255.255')).toThrow();
    });
  });

  describe('Loopback Addresses', () => {
    test('should block localhost', () => {
      expect(() => ssrfProtection.validateUrl('http://localhost')).toThrow();
    });

    test('should block 127.0.0.0/8', () => {
      expect(() => ssrfProtection.validateUrl('http://127.0.0.1')).toThrow();
      expect(() => ssrfProtection.validateUrl('http://127.0.0.2')).toThrow();
      expect(() => ssrfProtection.validateUrl('http://127.255.255.255')).toThrow();
    });
  });

  describe('Link-Local Addresses', () => {
    test('should block 169.254.0.0/16', () => {
      expect(() => ssrfProtection.validateUrl('http://169.254.1.1')).toThrow();
      expect(() => ssrfProtection.validateUrl('http://169.254.169.254')).toThrow();
    });
  });

  describe('Cloud Metadata Endpoints', () => {
    test('should block AWS metadata', () => {
      expect(() => ssrfProtection.validateUrl('http://169.254.169.254/latest/meta-data')).toThrow();
    });

    test('should block GCP metadata', () => {
      expect(() => ssrfProtection.validateUrl('http://metadata.google.internal')).toThrow();
    });
  });

  describe('Protocol Restrictions', () => {
    test('should only allow HTTP and HTTPS', () => {
      expect(() => ssrfProtection.validateUrl('ftp://example.com')).toThrow();
      expect(() => ssrfProtection.validateUrl('file:///etc/passwd')).toThrow();
      expect(() => ssrfProtection.validateUrl('gopher://example.com')).toThrow();
      expect(() => ssrfProtection.validateUrl('data:text/html,<script>alert(1)</script>')).toThrow();
    });

    test('should allow HTTP and HTTPS', () => {
      expect(() => ssrfProtection.validateUrl('http://example.com')).not.toThrow();
      expect(() => ssrfProtection.validateUrl('https://example.com')).not.toThrow();
    });
  });

  describe('IP Address Obfuscation', () => {
    test('should block decimal IP notation', () => {
      // 127.0.0.1 = 2130706433
      expect(() => ssrfProtection.validateUrl('http://2130706433')).toThrow();
    });

    test('should block hexadecimal IP notation', () => {
      // 127.0.0.1 = 0x7f000001
      expect(() => ssrfProtection.validateUrl('http://0x7f000001')).toThrow();
    });
  });

  describe('URL Encoding Attacks', () => {
    test('should block null byte injection', () => {
      expect(() => ssrfProtection.validateUrl('http://example.com%00.localhost')).toThrow();
    });

    test('should block CRLF injection', () => {
      expect(() => ssrfProtection.validateUrl('http://example.com%0d%0a')).toThrow();
    });

    test('should block double-encoded path traversal', () => {
      expect(() => ssrfProtection.validateUrl('http://example.com%2e%2e')).toThrow();
    });
  });

  describe('DNS Rebinding Protection', () => {
    test('should block nip.io domains', () => {
      expect(() => ssrfProtection.validateUrl('http://127.0.0.1.nip.io')).toThrow();
    });

    test('should block xip.io domains', () => {
      expect(() => ssrfProtection.validateUrl('http://127.0.0.1.xip.io')).toThrow();
    });

    test('should block sslip.io domains', () => {
      expect(() => ssrfProtection.validateUrl('http://127.0.0.1.sslip.io')).toThrow();
    });
  });

  describe('Credential Injection', () => {
    test('should block credentials in URL', () => {
      expect(() => ssrfProtection.validateUrl('http://user:pass@example.com')).toThrow();
      expect(() => ssrfProtection.validateUrl('http://admin@localhost')).toThrow();
    });
  });

  describe('Valid URLs', () => {
    test('should allow public domains', () => {
      expect(() => ssrfProtection.validateUrl('https://api.example.com')).not.toThrow();
      expect(() => ssrfProtection.validateUrl('https://jsonplaceholder.typicode.com')).not.toThrow();
      expect(() => ssrfProtection.validateUrl('https://api.github.com')).not.toThrow();
    });

    test('should allow public IPs', () => {
      expect(() => ssrfProtection.validateUrl('http://8.8.8.8')).not.toThrow();
      expect(() => ssrfProtection.validateUrl('http://1.1.1.1')).not.toThrow();
    });
  });

  describe('isAllowed method', () => {
    test('should return false for blocked URLs', () => {
      expect(ssrfProtection.isAllowed('http://localhost')).toBe(false);
      expect(ssrfProtection.isAllowed('http://10.0.0.1')).toBe(false);
    });

    test('should return true for allowed URLs', () => {
      expect(ssrfProtection.isAllowed('https://example.com')).toBe(true);
      expect(ssrfProtection.isAllowed('https://api.github.com')).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    test('should handle invalid URLs gracefully', () => {
      expect(() => ssrfProtection.validateUrl('not-a-url')).toThrow('Invalid URL format');
      expect(() => ssrfProtection.validateUrl('')).toThrow();
    });

    test('should handle malformed IPs', () => {
      expect(() => ssrfProtection.validateUrl('http://999.999.999.999')).toThrow();
      expect(() => ssrfProtection.validateUrl('http://256.0.0.1')).toThrow();
    });

    test('should handle control characters', () => {
      expect(() => ssrfProtection.validateUrl('http://example.com\x00')).toThrow();
    });
  });
});
