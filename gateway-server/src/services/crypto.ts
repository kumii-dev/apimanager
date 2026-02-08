/**
 * Cryptography Service
 * ISO 27001 A.10.1 - Cryptographic Controls
 * NIST 800-175B Compliant (AES-256-GCM)
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { config } from '../config';

/**
 * Encrypted data structure
 */
export interface EncryptedData {
  encryptedValue: string; // Base64 encoded
  iv: string; // Initialization vector (Base64)
  tag: string; // Authentication tag (Base64)
}

/**
 * Encryption service using AES-256-GCM
 * 
 * Security Features:
 * - AES-256-GCM (FIPS 140-2 approved)
 * - Authenticated encryption (integrity + confidentiality)
 * - Random IV per encryption (prevents pattern analysis)
 * - Authentication tag prevents tampering
 * 
 * @class CryptoService
 */
export class CryptoService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyBuffer: Buffer;

  constructor() {
    // Decode master key from base64
    this.keyBuffer = Buffer.from(config.crypto.masterKey, 'base64');
    
    if (this.keyBuffer.length !== 32) {
      throw new Error('Master key must be 32 bytes');
    }
  }

  /**
   * Encrypt plaintext secret
   * ISO 27001 A.10.1.1 - Cryptographic controls
   * 
   * @param plaintext - Secret to encrypt
   * @returns Encrypted data with IV and auth tag
   */
  encrypt(plaintext: string): EncryptedData {
    try {
      // Generate random IV (12 bytes recommended for GCM)
      const iv = randomBytes(12);

      // Create cipher
      const cipher = createCipheriv(this.algorithm, this.keyBuffer, iv);

      // Encrypt
      let encrypted = cipher.update(plaintext, 'utf8', 'base64');
      encrypted += cipher.final('base64');

      // Get authentication tag
      const tag = cipher.getAuthTag();

      return {
        encryptedValue: encrypted,
        iv: iv.toString('base64'),
        tag: tag.toString('base64'),
      };
    } catch (error) {
      throw new Error(`Encryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Decrypt encrypted secret
   * ISO 27001 A.10.1.2 - Key management
   * 
   * @param encryptedData - Data to decrypt
   * @returns Decrypted plaintext
   * @throws Error if decryption fails or authentication fails
   */
  decrypt(encryptedData: EncryptedData): string {
    try {
      // Decode base64 values
      const iv = Buffer.from(encryptedData.iv, 'base64');
      const tag = Buffer.from(encryptedData.tag, 'base64');

      // Create decipher
      const decipher = createDecipheriv(this.algorithm, this.keyBuffer, iv);
      
      // Set authentication tag
      decipher.setAuthTag(tag);

      // Decrypt
      let decrypted = decipher.update(encryptedData.encryptedValue, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      // Authentication failure or decryption error
      throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Authentication failed'}`);
    }
  }

  /**
   * Redact sensitive data in logs
   * ISO 27001 A.12.4.1 - Event logging
   * 
   * @param text - Text to redact
   * @returns Redacted text
   */
  redact(text: string): string {
    if (!text || text.length === 0) {
      return '[EMPTY]';
    }

    if (text.length <= 4) {
      return '***';
    }

    // Show first 2 and last 2 characters
    const first = text.substring(0, 2);
    const last = text.substring(text.length - 2);
    return `${first}${'*'.repeat(Math.min(text.length - 4, 20))}${last}`;
  }

  /**
   * Securely compare two strings (timing-safe)
   * Prevents timing attacks
   * 
   * @param a - First string
   * @param b - Second string
   * @returns True if equal
   */
  secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);

    return require('crypto').timingSafeEqual(bufA, bufB);
  }
}

/**
 * Singleton instance
 */
export const cryptoService = new CryptoService();
