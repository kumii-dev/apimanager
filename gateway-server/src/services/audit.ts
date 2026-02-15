/**
 * Audit Logging Service
 * ISO 27001 A.12.4 - Logging and Monitoring
 * NIST 800-92 - Guide to Computer Security Log Management
 */

import pino from 'pino';
import { createClient } from '@supabase/supabase-js';
import { config } from '../config';

/**
 * Security event severity levels
 */
export type AuditSeverity = 'debug' | 'info' | 'warn' | 'error' | 'critical';

/**
 * Security event status
 */
export type AuditStatus = 'success' | 'failure' | 'pending';

/**
 * Audit log entry structure
 */
export interface AuditLogEntry {
  tenantId?: string;
  userId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
  severity?: AuditSeverity;
  status?: AuditStatus;
}

/**
 * Security actions enum
 */
export const AuditActions = {
  // Authentication
  AUTH_LOGIN: 'auth.login',
  AUTH_LOGOUT: 'auth.logout',
  AUTH_REFRESH: 'auth.refresh',
  AUTH_FAILURE: 'auth.failure',
  
  // Authorization
  AUTHZ_FAILURE: 'authz.failure',
  AUTHZ_SUCCESS: 'authz.success',
  
  // Connectors
  CONNECTOR_CREATE: 'connector.create',
  CONNECTOR_UPDATE: 'connector.update',
  CONNECTOR_DELETE: 'connector.delete',
  CONNECTOR_READ: 'connector.read',
  CONNECTOR_LIST: 'connector.list',
  
  // Secrets
  SECRET_ROTATE: 'secret.rotate',
  SECRET_CREATE: 'secret.create',
  SECRET_ACCESS: 'secret.access',
  
  // Routes
  ROUTE_CREATE: 'route.create',
  ROUTE_UPDATE: 'route.update',
  ROUTE_DELETE: 'route.delete',
  ROUTE_READ: 'route.read',
  ROUTE_LIST: 'route.list',
  ROUTE_TEST: 'route.test',
  
  // Proxy
  PROXY_REQUEST: 'proxy.request',
  PROXY_SUCCESS: 'proxy.success',
  PROXY_FAILURE: 'proxy.failure',
  
  // Security Events
  RATE_LIMIT_EXCEEDED: 'security.rate_limit_exceeded',
  SSRF_ATTEMPT: 'security.ssrf_attempt',
  INVALID_INPUT: 'security.invalid_input',
  CIRCUIT_BREAKER_OPEN: 'security.circuit_breaker_open',
  SUSPICIOUS_ACTIVITY: 'security.suspicious_activity',
} as const;

/**
 * Audit Logger Service
 * Structured logging with redaction
 * 
 * @class AuditLogger
 */
export class AuditLogger {
  private logger: pino.Logger;

  constructor() {
    // Use plain JSON logging for production/serverless
    // pino-pretty is a dev dependency and not available in production builds
    this.logger = pino({
      level: config.logging.level,
      redact: {
        paths: [
          'password',
          'secret',
          'token',
          'authorization',
          'apiKey',
          'api_key',
          '*.password',
          '*.secret',
          '*.token',
          '*.authorization',
          'req.headers.authorization',
          'req.headers["x-api-key"]',
          'details.secret',
          'details.password',
        ],
        remove: true,
      },
      serializers: {
        err: pino.stdSerializers.err,
        req: pino.stdSerializers.req,
        res: pino.stdSerializers.res,
      },
    });
  }

  /**
   * Log audit event
   * ISO 27001 A.12.4.1
   * 
   * @param entry - Audit log entry
   */
  log(entry: AuditLogEntry): void {
    const {
      severity = 'info',
      status = 'success',
      ...rest
    } = entry;

    const logData = {
      timestamp: new Date().toISOString(),
      ...rest,
      status,
      // Add context
      environment: config.env,
    };

    // Log based on severity
    switch (severity) {
      case 'debug':
        this.logger.debug(logData, entry.action);
        break;
      case 'info':
        this.logger.info(logData, entry.action);
        break;
      case 'warn':
        this.logger.warn(logData, entry.action);
        break;
      case 'error':
        this.logger.error(logData, entry.action);
        break;
      case 'critical':
        this.logger.fatal(logData, entry.action);
        break;
    }

    // Persist to Supabase audit_logs table
    // Always persist audit logs (development and production)
    this.persistToDatabase(entry).catch(err => {
      this.logger.error({ err }, 'Failed to persist audit log to database');
    });
  }

  /**
   * Persist audit log to database
   * 
   * @param entry - Audit log entry
   */
  private async persistToDatabase(entry: AuditLogEntry): Promise<void> {
    try {
      // Create Supabase client with service role for audit logs
      const supabase = createClient(
        config.supabase.url,
        config.supabase.serviceRoleKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );

      const { error } = await supabase
        .from('audit_logs')
        .insert({
          tenant_id: entry.tenantId,
          user_id: entry.userId,
          action: entry.action,
          resource_type: entry.resourceType,
          resource_id: entry.resourceId,
          request_id: entry.requestId,
          ip_address: entry.ipAddress,
          user_agent: entry.userAgent,
          details: entry.details,
          severity: entry.severity || 'info',
          status: entry.status || 'success',
        });

      if (error) {
        throw error;
      }
    } catch (err) {
      // Don't throw - logging errors shouldn't crash the app
      this.logger.error({ err }, 'Failed to persist audit log to database');
    }
  }

  /**
   * Log authentication event
   */
  logAuth(params: {
    action: string;
    userId?: string;
    tenantId?: string;
    requestId?: string;
    ipAddress?: string;
    userAgent?: string;
    success: boolean;
    details?: Record<string, any>;
  }): void {
    this.log({
      action: params.action,
      resourceType: 'auth',
      userId: params.userId,
      tenantId: params.tenantId,
      requestId: params.requestId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      details: params.details,
      severity: params.success ? 'info' : 'warn',
      status: params.success ? 'success' : 'failure',
    });
  }

  /**
   * Log security event
   */
  logSecurityEvent(params: {
    action: string;
    userId?: string;
    tenantId?: string;
    requestId?: string;
    ipAddress?: string;
    userAgent?: string;
    details?: Record<string, any>;
    severity?: AuditSeverity;
  }): void {
    this.log({
      action: params.action,
      resourceType: 'security',
      userId: params.userId,
      tenantId: params.tenantId,
      requestId: params.requestId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      details: params.details,
      severity: params.severity || 'warn',
      status: 'failure',
    });
  }

  /**
   * Log admin action
   */
  logAdminAction(params: {
    action: string;
    resourceType: string;
    resourceId?: string;
    userId: string;
    tenantId: string;
    requestId?: string;
    ipAddress?: string;
    userAgent?: string;
    details?: Record<string, any>;
    success: boolean;
  }): void {
    this.log({
      action: params.action,
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      userId: params.userId,
      tenantId: params.tenantId,
      requestId: params.requestId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      details: params.details,
      severity: 'info',
      status: params.success ? 'success' : 'failure',
    });
  }

  /**
   * Log proxy request
   */
  logProxyRequest(params: {
    userId?: string;
    tenantId?: string;
    requestId?: string;
    method: string;
    path: string;
    statusCode?: number;
    duration?: number;
    connectorId?: string;
    success: boolean;
  }): void {
    this.log({
      action: params.success ? AuditActions.PROXY_SUCCESS : AuditActions.PROXY_FAILURE,
      resourceType: 'proxy',
      resourceId: params.connectorId,
      userId: params.userId,
      tenantId: params.tenantId,
      requestId: params.requestId,
      details: {
        method: params.method,
        path: params.path,
        statusCode: params.statusCode,
        duration: params.duration,
      },
      severity: params.success ? 'info' : 'warn',
      status: params.success ? 'success' : 'failure',
    });
  }

  /**
   * Get raw pino logger for custom logging
   */
  getRawLogger(): pino.Logger {
    return this.logger;
  }
}

/**
 * Singleton instance
 */
export const auditLogger = new AuditLogger();
