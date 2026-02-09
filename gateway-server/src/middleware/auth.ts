/**
 * Authentication Middleware
 * ISO 27001 A.9 - Access Control
 * OWASP ASVS V2 - Authentication
 */

import { Request, Response, NextFunction } from 'express';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config';
import { auditLogger, AuditActions } from '../services/audit';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      id: string;
      user?: {
        id: string;
        email: string;
        role: string;
        tenantId: string;
      };
    }
  }
}

/**
 * User roles (RBAC)
 */
export enum UserRole {
  PLATFORM_ADMIN = 'platform_admin',
  TENANT_ADMIN = 'tenant_admin',
  STAFF = 'staff',
  USER = 'user',
}

/**
 * Auth middleware options
 */
interface AuthMiddlewareOptions {
  requireAuth?: boolean;
  allowedRoles?: UserRole[];
}

/**
 * Supabase client (singleton)
 */
let supabaseClient: SupabaseClient | null = null;

const getSupabaseClient = (): SupabaseClient => {
  if (!supabaseClient) {
    supabaseClient = createClient(
      config.supabase.url,
      config.supabase.anonKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        global: {
          fetch: (url, options = {}) => {
            return fetch(url, {
              ...options,
              signal: AbortSignal.timeout(10000), // 10 second timeout
            });
          },
        },
      }
    );
  }
  return supabaseClient;
};

/**
 * Authentication middleware
 * Validates JWT token from Supabase Auth
 * 
 * @param options - Middleware options
 */
export const authMiddleware = (options: AuthMiddlewareOptions = {}) => {
  const { requireAuth = true, allowedRoles = [] } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Development bypass (DANGEROUS - only for local testing)
      if (config.dev.bypassAuth) {
        req.user = {
          id: 'dev-user',
          email: 'dev@localhost',
          role: UserRole.PLATFORM_ADMIN,
          tenantId: '00000000-0000-0000-0000-000000000001',
        };
        return next();
      }

      // Extract token
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        if (!requireAuth) {
          return next();
        }

        auditLogger.logAuth({
          action: AuditActions.AUTH_FAILURE,
          requestId: String(req.id),
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          success: false,
          details: { reason: 'missing_token' },
        });

        res.status(401).json({
          error: 'Unauthorized',
          message: 'Missing or invalid authorization header',
        });
        return;
      }

      const token = authHeader.substring(7);

      // Verify token with Supabase (with timeout)
      const supabase = getSupabaseClient();
      
      let user;
      let error;
      
      try {
        const response = await Promise.race([
          supabase.auth.getUser(token),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Auth timeout')), 8000)
          )
        ]);
        user = response.data.user;
        error = response.error;
      } catch (err) {
        console.error('Auth verification error:', err);
        res.status(500).json({
          error: 'Internal Server Error',
          message: 'Authentication service timeout',
        });
        return;
      }

      if (error || !user) {
        if (!requireAuth) {
          return next();
        }

        auditLogger.logAuth({
          action: AuditActions.AUTH_FAILURE,
          requestId: String(req.id),
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          success: false,
          details: { reason: 'invalid_token', error: error?.message },
        });

        res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid or expired token',
        });
        return;
      }

      // Get user profile with role and tenant (with timeout)
      const serviceSupabase = createClient(
        config.supabase.url,
        config.supabase.serviceRoleKey,
        {
          global: {
            fetch: (url, options = {}) => {
              return fetch(url, {
                ...options,
                signal: AbortSignal.timeout(8000), // 8 second timeout
              });
            },
          },
        }
      );

      let profile;
      let profileError;
      
      try {
        const response = await Promise.race([
          serviceSupabase
            .from('profiles')
            .select('id, email, role, tenant_id')
            .eq('id', user.id)
            .single(),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Profile query timeout')), 8000)
          )
        ]);
        profile = response.data;
        profileError = response.error;
      } catch (err) {
        console.error('Profile query error:', err);
        res.status(500).json({
          error: 'Internal Server Error',
          message: 'Database query timeout',
        });
        return;
      }

      if (profileError || !profile) {
        auditLogger.logAuth({
          action: AuditActions.AUTH_FAILURE,
          userId: user.id,
          requestId: String(req.id),
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          success: false,
          details: { reason: 'profile_not_found' },
        });

        res.status(403).json({
          error: 'Forbidden',
          message: 'User profile not found',
        });
        return;
      }

      // Check role authorization
      if (allowedRoles.length > 0 && !allowedRoles.includes(profile.role as UserRole)) {
        auditLogger.logSecurityEvent({
          action: AuditActions.AUTHZ_FAILURE,
          userId: profile.id,
          tenantId: profile.tenant_id,
          requestId: String(req.id),
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          details: {
            requiredRoles: allowedRoles,
            userRole: profile.role,
            path: req.path,
          },
          severity: 'warn',
        });

        res.status(403).json({
          error: 'Forbidden',
          message: 'Insufficient permissions',
        });
        return;
      }

      // Attach user to request
      req.user = {
        id: profile.id,
        email: profile.email,
        role: profile.role,
        tenantId: profile.tenant_id,
      };

      // Log successful authentication
      auditLogger.logAuth({
        action: AuditActions.AUTH_LOGIN,
        userId: profile.id,
        tenantId: profile.tenant_id,
        requestId: String(req.id),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        success: true,
      });

      next();
    } catch (error) {
      auditLogger.getRawLogger().error({ error, requestId: req.id }, 'Auth middleware error');
      
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Authentication failed',
      });
    }
  };
};

/**
 * Require specific role(s)
 */
export const requireRole = (...roles: UserRole[]) => {
  return authMiddleware({ requireAuth: true, allowedRoles: roles });
};

/**
 * Require admin (platform or tenant)
 */
export const requireAdmin = () => {
  return requireRole(UserRole.PLATFORM_ADMIN, UserRole.TENANT_ADMIN);
};

/**
 * Require platform admin
 */
export const requirePlatformAdmin = () => {
  return requireRole(UserRole.PLATFORM_ADMIN);
};
