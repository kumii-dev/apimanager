/**
 * API Routes Management Routes
 * ISO 27001 A.5 - Access Control
 * CRUD operations for API routing configuration
 */

import { Router } from 'express';
import { requireAdmin } from '../middleware/auth';
import { createClient } from '@supabase/supabase-js';
import { config } from '../config';
import { auditLogger } from '../services/audit';

export const routeRoutes = Router();

// Supabase admin client (service role key for full access)
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

// All routes require admin access
routeRoutes.use(requireAdmin());

/**
 * GET /admin/routes
 * List all API routes with connector details
 */
routeRoutes.get('/', async (req, res) => {
  try {
    const { user } = req;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Platform admins see all routes, tenant admins see only their tenant's routes
    const query = supabase
      .from('api_routes')
      .select('*')
      .order('priority', { ascending: false });

    // Apply tenant filter for non-platform admins
    if (user.role !== 'platform_admin') {
      query.eq('tenant_id', user.tenantId);
    }

    const { data: routes, error } = await query;

    if (error) {
      console.error('Error fetching routes:', error);
      return res.status(500).json({
        error: 'Database Error',
        message: 'Failed to retrieve routes',
      });
    }

    auditLogger.logAdminAction({
      action: 'route.list',
      resourceType: 'api_route',
      userId: user.id,
      tenantId: user.tenantId,
      requestId: String(req.id),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: { count: routes?.length || 0 },
      success: true,
    });

    return res.json({
      routes: routes || [],
      total: routes?.length || 0,
    });
  } catch (error) {
    console.error('Route listing error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /admin/routes
 * Create a new API route
 */
routeRoutes.post('/', async (req, res) => {
  try {
    const { user } = req;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      connector_id,
      name,
      module_prefix,
      path_pattern,
      http_method,
      upstream_path,
      cache_config,
      rate_limit_config,
      auth_required,
      priority,
      is_active,
    } = req.body;

    // Validation
    if (!connector_id || !name || !module_prefix || !path_pattern || !http_method || !upstream_path) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Missing required fields',
      });
    }

    // Verify connector exists
    const { data: connector, error: connectorError } = await supabase
      .from('api_connectors')
      .select('id, tenant_id')
      .eq('id', connector_id)
      .single();

    if (connectorError || !connector) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Connector not found',
      });
    }

    // Create route
    const { data: route, error } = await supabase
      .from('api_routes')
      .insert({
        tenant_id: connector.tenant_id,
        connector_id,
        name,
        module_prefix,
        path_pattern,
        http_method,
        upstream_path,
        cache_config: cache_config || { enabled: false, ttl_seconds: 60, cache_key_params: [] },
        rate_limit_config: rate_limit_config || { enabled: true, max_requests: 100, window_seconds: 60 },
        auth_required: auth_required !== undefined ? auth_required : true,
        priority: priority || 100,
        is_active: is_active !== undefined ? is_active : true,
        created_by: user.id,
        updated_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating route:', error);
      return res.status(500).json({
        error: 'Database Error',
        message: 'Failed to create route',
      });
    }

    auditLogger.logAdminAction({
      action: 'route.create',
      resourceType: 'api_route',
      resourceId: route.id,
      userId: user.id,
      tenantId: user.tenantId,
      requestId: String(req.id),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: { name, module_prefix },
      success: true,
    });

    return res.status(201).json({
      message: 'Route created successfully',
      route,
    });
  } catch (error) {
    console.error('Route creation error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /admin/routes/:id
 * Get a specific API route
 */
routeRoutes.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const query = supabase
      .from('api_routes')
      .select('*')
      .eq('id', id);

    if (user.role !== 'platform_admin') {
      query.eq('tenant_id', user.tenantId);
    }

    const { data: route, error } = await query.single();

    if (error || !route) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Route not found',
      });
    }

    return res.json({ route });
  } catch (error) {
    console.error('Route retrieval error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PUT /admin/routes/:id
 * Update an API route
 */
routeRoutes.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if route exists
    const { data: existingRoute, error: fetchError } = await supabase
      .from('api_routes')
      .select('tenant_id')
      .eq('id', id)
      .single();

    if (fetchError || !existingRoute) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Route not found',
      });
    }

    // Build update object
    const updates: any = {
      ...req.body,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    };

    // Update route
    const { data: route, error } = await supabase
      .from('api_routes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating route:', error);
      return res.status(500).json({
        error: 'Database Error',
        message: 'Failed to update route',
      });
    }

    auditLogger.logAdminAction({
      action: 'route.update',
      resourceType: 'api_route',
      resourceId: id,
      userId: user.id,
      tenantId: user.tenantId,
      requestId: String(req.id),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: { updates: Object.keys(updates) },
      success: true,
    });

    return res.json({
      message: 'Route updated successfully',
      route,
    });
  } catch (error) {
    console.error('Route update error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /admin/routes/:id
 * Delete an API route
 */
routeRoutes.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if route exists
    const { data: existingRoute, error: fetchError } = await supabase
      .from('api_routes')
      .select('tenant_id, name')
      .eq('id', id)
      .single();

    if (fetchError || !existingRoute) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Route not found',
      });
    }

    // Delete route
    const { error } = await supabase
      .from('api_routes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting route:', error);
      return res.status(500).json({
        error: 'Database Error',
        message: 'Failed to delete route',
      });
    }

    auditLogger.logAdminAction({
      action: 'route.delete',
      resourceType: 'api_route',
      resourceId: id,
      userId: user.id,
      tenantId: user.tenantId,
      requestId: String(req.id),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: { name: existingRoute.name },
      success: true,
    });

    return res.json({
      message: 'Route deleted successfully',
    });
  } catch (error) {
    console.error('Route deletion error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
