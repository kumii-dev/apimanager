/**
 * Rate Limiting Middleware
 * ISO 27001 A.12.1 - Operational Procedures
 * OWASP - DoS Protection
 */

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';
import { config } from '../config';
import { auditLogger, AuditActions } from '../services/audit';

/**
 * Rate limit options
 */
interface RateLimitOptions {
  windowMs?: number;
  maxRequests?: number;
  keyGenerator?: (req: Request) => string;
}

/**
 * Redis client (optional, falls back to memory)
 */
let redisClient: ReturnType<typeof createClient> | null = null;

/**
 * Initialize Redis client if configured
 */
const initRedis = async () => {
  if (!config.redis.enabled || redisClient) {
    return;
  }

  try {
    redisClient = createClient({
      url: config.redis.url,
      password: config.redis.password,
      socket: {
        tls: config.redis.tls,
      },
    });

    redisClient.on('error', (err) => {
      auditLogger.getRawLogger().error({ err }, 'Redis client error');
    });

    await redisClient.connect();
    auditLogger.getRawLogger().info('Redis connected for rate limiting');
  } catch (error) {
    auditLogger.getRawLogger().warn({ error }, 'Redis connection failed, using memory store');
    redisClient = null;
  }
};

// Initialize Redis
initRedis();

/**
 * Create rate limit middleware
 * 
 * @param options - Rate limit options
 */
export const rateLimitMiddleware = (options: RateLimitOptions = {}) => {
  const {
    windowMs = config.rateLimit.windowMs,
    maxRequests = config.rateLimit.maxRequests,
    keyGenerator,
  } = options;

  const limiterOptions: any = {
    windowMs,
    max: maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    // Custom key generator
    keyGenerator: keyGenerator || ((req: Request) => {
      // Use user ID if authenticated, otherwise IP
      return req.user?.id || req.ip || 'unknown';
    }),
    // Handler when limit exceeded
    handler: (req: Request, res: Response) => {
      auditLogger.logSecurityEvent({
        action: AuditActions.RATE_LIMIT_EXCEEDED,
        userId: req.user?.id,
        tenantId: req.user?.tenantId,
        requestId: req.id,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        details: {
          path: req.path,
          method: req.method,
        },
        severity: 'warn',
      });

      res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil(windowMs / 1000),
      });
    },
    // Skip function (e.g., for health checks)
    skip: (req: Request) => {
      return req.path === '/health' || req.path === '/readiness';
    },
  };

  // Use Redis store if available
  if (redisClient) {
    limiterOptions.store = new RedisStore({
      // @ts-expect-error - Types mismatch between redis and rate-limit-redis
      client: redisClient,
      prefix: 'rl:',
    });
  }

  return rateLimit(limiterOptions);
};

/**
 * Strict rate limiter for sensitive endpoints
 */
export const strictRateLimiter = rateLimitMiddleware({
  windowMs: 60000, // 1 minute
  maxRequests: 10, // Very limited
});

/**
 * Auth rate limiter for login endpoints
 */
export const authRateLimiter = rateLimitMiddleware({
  windowMs: 900000, // 15 minutes
  maxRequests: 5, // 5 attempts per 15 minutes
  keyGenerator: (req: Request) => {
    // Use email from body if present, otherwise IP
    const email = req.body?.email;
    return email || req.ip || 'unknown';
  },
});
