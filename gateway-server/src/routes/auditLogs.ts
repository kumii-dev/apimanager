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
 * GET /admin/audit-logs/insights
 * ISO 27001 audit trail summary + AI recommendations
 */
auditLogRoutes.get('/insights', async (req, res) => {
  try {
    const supabase = getSupabaseClient();

    const { data: logs, error } = await supabase
      .from('audit_logs')
      .select('id, action, resource_type, severity, status, created_at')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    const isoMap: Record<string, { control: string; label: string }> = {
      auth: { control: 'A.9', label: 'Access Control' },
      user: { control: 'A.9', label: 'Access Control' },
      connector: { control: 'A.14', label: 'System Acquisition/Dev' },
      route: { control: 'A.14', label: 'System Acquisition/Dev' },
      secret: { control: 'A.10', label: 'Cryptography' },
      config: { control: 'A.12', label: 'Operations Security' },
      system: { control: 'A.12', label: 'Operations Security' },
      tenant: { control: 'A.5', label: 'Security Policies' },
    };

    const trail = (logs || []).map((log) => {
      const mapping = isoMap[log.resource_type] || { control: 'A.12', label: 'Operations Security' };
      return {
        id: log.id,
        action: log.action,
        resource_type: log.resource_type,
        severity: log.severity,
        status: log.status,
        created_at: log.created_at,
        iso_control: mapping.control,
        iso_label: mapping.label,
      };
    });

    const controlCounts = trail.reduce<Record<string, { control: string; label: string; count: number }>>(
      (acc, item) => {
        const key = item.iso_control;
        if (!acc[key]) {
          acc[key] = { control: item.iso_control, label: item.iso_label, count: 0 };
        }
        acc[key].count += 1;
        return acc;
      },
      {}
    );

    const summary = `Reviewed ${trail.length} recent audit events across ${Object.keys(controlCounts).length} ISO controls.`;

    const fallback = {
      audit_summary: summary,
      iso_controls: Object.values(controlCounts).sort((a, b) => b.count - a.count),
      recommendations: [
        'Validate access control changes against A.9 requirements weekly.',
        'Review cryptographic secret rotations under A.10 at least monthly.',
        'Ensure operational security logs (A.12) are retained and monitored daily.',
      ],
      generated_at: new Date().toISOString(),
      source: 'heuristic',
      recent_trail: trail.slice(0, 10),
    };

    if (!config.ai.openaiApiKey) {
      return res.json({ success: true, data: fallback });
    }

    const prompt = `Provide ISO 27001-aligned audit recommendations and a concise summary.\n\nTrail: ${JSON.stringify(trail)}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.ai.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Return JSON with fields: audit_summary (string) and recommendations (array of strings).' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      console.warn('OpenAI audit insights failed:', await response.text());
      return res.json({ success: true, data: fallback });
    }

    const data: any = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    let parsed: any = null;
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = null;
    }

    const insights = parsed && parsed.audit_summary
      ? {
          audit_summary: parsed.audit_summary,
          recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : fallback.recommendations,
          iso_controls: fallback.iso_controls,
          generated_at: new Date().toISOString(),
          source: 'openai',
          recent_trail: fallback.recent_trail,
        }
      : fallback;

    return res.json({ success: true, data: insights });
  } catch (error: any) {
    console.error('Audit insights error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to fetch audit insights',
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
