/**
 * Audit Logs Routes
 * ISO 27001 A.12.4 - Logging & Monitoring
 * Read-only access to audit logs
 */

import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { config } from '../config';

export const auditLogRoutes = Router();

// Auth is already handled by parent adminRoutes
// No need to apply requireAdmin() again here

// Create Supabase client
const getSupabaseClient = () => {
  return createClient(
    config.supabase.url,
    config.supabase.serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
};

/**
 * GET /admin/audit-logs
 * List audit logs with filtering and pagination
 */
auditLogRoutes.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 50,
      action,
      resource_type,
      severity,
      status,
      search,
    } = req.query;

    const supabase = getSupabaseClient();
    
    // Build query
    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // Apply filters
    if (action) {
      query = query.eq('action', action);
    }
    if (resource_type) {
      query = query.eq('resource_type', resource_type);
    }
    if (severity) {
      query = query.eq('severity', severity);
    }
    if (status) {
      query = query.eq('status', status);
    }
    if (search) {
      query = query.or(
        `action.ilike.%${search}%,resource_type.ilike.%${search}%,resource_id.ilike.%${search}%`
      );
    }

    // Apply pagination
    const pageNum = parseInt(String(page));
    const pageSizeNum = parseInt(String(pageSize));
    const from = (pageNum - 1) * pageSizeNum;
    const to = from + pageSizeNum - 1;
    
    query = query.range(from, to);

    // Execute query
    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    return res.json({
      logs: data || [],
      total: count || 0,
      page: pageNum,
      pageSize: pageSizeNum,
      totalPages: Math.ceil((count || 0) / pageSizeNum),
    });
  } catch (error: any) {
    console.error('Error fetching audit logs:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch audit logs',
      details: error.message,
    });
  }
});

/**
 * GET /admin/audit-logs/:id
 * Get a specific audit log entry
 */
auditLogRoutes.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Audit log not found',
        });
      }
      throw error;
    }

    return res.json(data);
  } catch (error: any) {
    console.error('Error fetching audit log:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch audit log',
      details: error.message,
    });
  }
});

/**
 * GET /admin/audit-logs/export
 * Export audit logs (CSV/JSON)
 */
auditLogRoutes.get('/export', async (req, res) => {
  // TODO: Implement audit logs export
  res.status(501).json({
    error: 'Not implemented',
    message: 'Audit logs export endpoint is under development',
  });
});
