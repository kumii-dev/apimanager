/**
 * Configuration Module
 * ISO 27001 A.12 - Operations Security
 * Centralized, validated configuration
 */

import { config as dotenvConfig } from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenvConfig();

/**
 * Environment schema with security validation
 * OWASP ASVS V14 - Configuration
 */
const envSchema = z.object({
  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000').transform(Number),

  // Supabase (ISO 27001 A.5 - Access Control)
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(32),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(32),

  // Cryptography (ISO 27001 A.10)
  KMS_MASTER_KEY: z.string().min(32),

  // Redis (optional)
  REDIS_URL: z.string().optional(),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_TLS: z.string().default('false').transform(val => val === 'true'),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: z.string().default('60000').transform(Number),
  RATE_LIMIT_MAX_REQUESTS: z.string().default('100').transform(Number),
  RATE_LIMIT_ADMIN_MAX_REQUESTS: z.string().default('1000').transform(Number),

  // CORS
  CORS_ALLOWED_ORIGINS: z.string().default('http://localhost:5173'),
  CORS_CREDENTIALS: z.string().default('true').transform(val => val === 'true'),

  // Request limits
  REQUEST_SIZE_LIMIT: z.string().default('10mb'),
  REQUEST_TIMEOUT_MS: z.string().default('30000').transform(Number),

  // Circuit breaker
  CIRCUIT_BREAKER_THRESHOLD: z.string().default('5').transform(Number),
  CIRCUIT_BREAKER_RESET_TIMEOUT_MS: z.string().default('60000').transform(Number),

  // Cache
  CACHE_DEFAULT_TTL_SECONDS: z.string().default('60').transform(Number),
  CACHE_MAX_SIZE_MB: z.string().default('100').transform(Number),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  LOG_PRETTY: z.string().default('true').transform(val => val === 'true'),

  // SSRF protection
  SSRF_BLOCKED_CIDRS: z.string().default('10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,127.0.0.0/8,169.254.0.0/16'),
  SSRF_BLOCKED_HOSTNAMES: z.string().default('localhost,metadata.google.internal'),

  // Upstream defaults
  UPSTREAM_TIMEOUT_MS: z.string().default('30000').transform(Number),
  UPSTREAM_MAX_REDIRECTS: z.string().default('3').transform(Number),

  // Monitoring
  METRICS_ENABLED: z.string().default('true').transform(val => val === 'true'),

  // AI Services (optional)
  OPENAI_API_KEY: z.string().optional(),

  // Development mode
  DEV_MODE: z.string().default('false').transform(val => val === 'true'),
  DEV_BYPASS_AUTH: z.string().default('false').transform(val => val === 'true'),
});

/**
 * Validated configuration
 * Throws if environment is invalid (fail-fast, secure by default)
 */
const parseEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
      throw new Error(`Configuration validation failed:\n${messages.join('\n')}`);
    }
    throw error;
  }
};

const env = parseEnv();

/**
 * Application configuration
 * ISO 27001 A.12 compliant
 */
export const config = {
  env: env.NODE_ENV,
  port: env.PORT,
  isDevelopment: env.NODE_ENV === 'development',
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',

  // Supabase
  supabase: {
    url: env.SUPABASE_URL,
    anonKey: env.SUPABASE_ANON_KEY,
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
  },

  // Cryptography
  crypto: {
    masterKey: env.KMS_MASTER_KEY,
    algorithm: 'aes-256-gcm' as const,
  },

  // AI services
  ai: {
    openaiApiKey: env.OPENAI_API_KEY,
  },

  // Redis
  redis: {
    url: env.REDIS_URL,
    password: env.REDIS_PASSWORD,
    tls: env.REDIS_TLS,
    enabled: !!env.REDIS_URL,
  },

  // Rate limiting
  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
    adminMaxRequests: env.RATE_LIMIT_ADMIN_MAX_REQUESTS,
  },

  // CORS
  cors: {
    allowedOrigins: env.CORS_ALLOWED_ORIGINS.split(',').map(o => o.trim()),
    credentials: env.CORS_CREDENTIALS,
  },

  // Request limits
  request: {
    sizeLimit: env.REQUEST_SIZE_LIMIT,
    timeoutMs: env.REQUEST_TIMEOUT_MS,
  },

  // Circuit breaker
  circuitBreaker: {
    threshold: env.CIRCUIT_BREAKER_THRESHOLD,
    resetTimeoutMs: env.CIRCUIT_BREAKER_RESET_TIMEOUT_MS,
  },

  // Cache
  cache: {
    defaultTtlSeconds: env.CACHE_DEFAULT_TTL_SECONDS,
    maxSizeMb: env.CACHE_MAX_SIZE_MB,
  },

  // Logging
  logging: {
    level: env.LOG_LEVEL,
    pretty: env.LOG_PRETTY,
  },

  // SSRF protection
  ssrf: {
    blockedCidrs: env.SSRF_BLOCKED_CIDRS.split(',').map(c => c.trim()),
    blockedHostnames: env.SSRF_BLOCKED_HOSTNAMES.split(',').map(h => h.trim()),
  },

  // Upstream
  upstream: {
    timeoutMs: env.UPSTREAM_TIMEOUT_MS,
    maxRedirects: env.UPSTREAM_MAX_REDIRECTS,
  },

  // Monitoring
  metrics: {
    enabled: env.METRICS_ENABLED,
  },

  // Development
  dev: {
    mode: env.DEV_MODE,
    bypassAuth: env.DEV_BYPASS_AUTH,
  },

  // Module prefixes (hardcoded for security)
  modules: {
    allowedPrefixes: [
      '/api/v1/market',
      '/api/v1/capital',
      '/api/v1/mentorship',
      '/api/v1/collaboration',
      '/api/v1/cms',
      '/api/v1/analytics',
    ] as const,
  },
};

/**
 * Validate configuration on startup
 * ISO 27001 A.12.1 - Operational procedures
 */
export const validateConfig = (): void => {
  // Validate master key length (must be 32 bytes base64 encoded)
  const keyBuffer = Buffer.from(config.crypto.masterKey, 'base64');
  if (keyBuffer.length !== 32) {
    throw new Error('KMS_MASTER_KEY must be 32 bytes (base64 encoded)');
  }

  // Warn about insecure dev mode in production
  if (config.isProduction && config.dev.mode) {
    console.warn('WARNING: DEV_MODE is enabled in production!');
  }

  if (config.isProduction && config.dev.bypassAuth) {
    throw new Error('DEV_BYPASS_AUTH cannot be enabled in production!');
  }

  // Validate CORS origins
  if (config.isProduction) {
    const hasLocalhostOrigin = config.cors.allowedOrigins.some(
      origin => origin.includes('localhost') || origin.includes('127.0.0.1')
    );
    if (hasLocalhostOrigin) {
      console.warn('WARNING: Localhost origins in CORS_ALLOWED_ORIGINS in production!');
    }
  }
};

export type Config = typeof config;
