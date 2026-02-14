/**
 * API Connectors Management Routes
 * ISO 27001 A.5 - Access Control
 * CRUD operations for API connectors
 */

import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '../middleware/auth';
import { config } from '../config';
import { CryptoService } from '../services/crypto';
import { auditLogger } from '../services/audit';

export const connectorRoutes = Router();

// All routes require admin access
connectorRoutes.use(requireAdmin());

// Initialize crypto service for secret encryption
const cryptoService = new CryptoService();

// Create Supabase client with service role (for secrets table)
const getSupabaseServiceClient = () => {
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
 * GET /admin/connectors
 * List all API connectors
 */
connectorRoutes.get('/', async (req, res) => {
  try {
    const supabase = getSupabaseServiceClient();
    const { user } = req;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Query connectors for user's tenant
    const { data: connectors, error } = await supabase
      .from('api_connectors')
      .select('*')
      .eq('tenant_id', user.tenantId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching connectors:', error);
      return res.status(500).json({
        error: 'Failed to fetch connectors',
        message: error.message,
      });
    }

    // Log audit event
    auditLogger.logAdminAction({
      action: 'connector.list',
      resourceType: 'connector',
      userId: user.id,
      tenantId: user.tenantId,
      requestId: String(req.id),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: { count: connectors?.length || 0 },
      success: true,
    });

    return res.json({
      connectors: connectors || [],
      total: connectors?.length || 0,
    });
  } catch (error) {
    console.error('Connector listing error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /admin/connectors
 * Create a new API connector
 */
connectorRoutes.post('/', async (req, res) => {
  try {
    const supabase = getSupabaseServiceClient();
    const { user } = req;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Extract connector data from request
    const {
      name,
      type,
      base_url,
      auth_type,
      timeout_ms,
      is_active,
      // AI Classification (NIST AI RMF)
      is_ai_system,
      ai_risk_level,
      nist_categories,
      ai_use_case,
      risk_assessment_notes,
      // Auth credentials
      api_key,
      api_key_header,
      bearer_token,
      basic_username,
      basic_password,
      oauth_client_id,
      oauth_client_secret,
    } = req.body;

    // Validate required fields
    if (!name || !type || !base_url || !auth_type) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Missing required fields: name, type, base_url, auth_type',
      });
    }

    // Validate AI risk level if AI system
    if (is_ai_system && ai_risk_level && !['low', 'medium', 'high', 'critical'].includes(ai_risk_level)) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Invalid ai_risk_level. Must be: low, medium, high, or critical',
      });
    }

    // Create connector record
    const { data: connector, error: connectorError } = await supabase
      .from('api_connectors')
      .insert([
        {
          tenant_id: user.tenantId,
          name,
          type,
          base_url,
          auth_type,
          timeout_ms: timeout_ms || 30000,
          is_active: is_active !== undefined ? is_active : true,
          created_by: user.id,
          updated_by: user.id,
          auth_config: auth_type === 'api_key' && api_key_header 
            ? { header: api_key_header } 
            : auth_type === 'basic' && basic_username
            ? { username: basic_username }
            : {},
          // AI Classification fields
          is_ai_system: is_ai_system || false,
          ai_risk_level: is_ai_system ? ai_risk_level : null,
          nist_categories: nist_categories || [],
          ai_use_case: ai_use_case || null,
          risk_assessment_notes: risk_assessment_notes || null,
        },
      ])
      .select()
      .single();

    if (connectorError) {
      console.error('Error creating connector:', connectorError);
      return res.status(500).json({
        error: 'Failed to create connector',
        message: connectorError.message,
      });
    }

    // Store encrypted secrets if provided
    const secrets: Array<{ connector_id: string; secret_type: string; encrypted_value: string; encryption_iv: string; encryption_tag: string }> = [];

    if (auth_type === 'api_key' && api_key) {
      const encrypted = cryptoService.encrypt(api_key);
      secrets.push({
        connector_id: connector.id,
        secret_type: 'api_key',
        encrypted_value: encrypted.encryptedValue,
        encryption_iv: encrypted.iv,
        encryption_tag: encrypted.tag,
      });
    }

    if (auth_type === 'bearer' && bearer_token) {
      const encrypted = cryptoService.encrypt(bearer_token);
      secrets.push({
        connector_id: connector.id,
        secret_type: 'bearer_token',
        encrypted_value: encrypted.encryptedValue,
        encryption_iv: encrypted.iv,
        encryption_tag: encrypted.tag,
      });
    }

    if (auth_type === 'basic' && basic_password) {
      const encrypted = cryptoService.encrypt(basic_password);
      secrets.push({
        connector_id: connector.id,
        secret_type: 'basic_password',
        encrypted_value: encrypted.encryptedValue,
        encryption_iv: encrypted.iv,
        encryption_tag: encrypted.tag,
      });
    }

    if (auth_type === 'oauth2') {
      if (oauth_client_id) {
        const encrypted = cryptoService.encrypt(oauth_client_id);
        secrets.push({
          connector_id: connector.id,
          secret_type: 'custom',
          encrypted_value: encrypted.encryptedValue,
          encryption_iv: encrypted.iv,
          encryption_tag: encrypted.tag,
        });
      }
      if (oauth_client_secret) {
        const encrypted = cryptoService.encrypt(oauth_client_secret);
        secrets.push({
          connector_id: connector.id,
          secret_type: 'oauth_client_secret',
          encrypted_value: encrypted.encryptedValue,
          encryption_iv: encrypted.iv,
          encryption_tag: encrypted.tag,
        });
      }
    }

    // Insert secrets if any
    if (secrets.length > 0) {
      const { error: secretsError } = await supabase
        .from('api_connector_secrets')
        .insert(secrets);

      if (secretsError) {
        console.error('Error storing secrets:', secretsError);
        // Don't fail the request, but log the error
      }
    }

    // Log audit event
    auditLogger.logAdminAction({
      action: 'connector.create',
      resourceType: 'connector',
      resourceId: connector.id,
      userId: user.id,
      tenantId: user.tenantId,
      requestId: String(req.id),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: { name, type, auth_type },
      success: true,
    });

    return res.status(201).json({
      connector,
      message: 'Connector created successfully',
    });
  } catch (error) {
    console.error('Connector creation error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /admin/connectors/:id
 * Get a specific API connector
 */
connectorRoutes.get('/:id', async (req, res) => {
  try {
    const supabase = getSupabaseServiceClient();
    const { user } = req;
    const { id } = req.params;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Query connector
    const { data: connector, error } = await supabase
      .from('api_connectors')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', user.tenantId)
      .single();

    if (error || !connector) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Connector not found',
      });
    }

    // Log audit event
    auditLogger.logAdminAction({
      action: 'connector.read',
      resourceType: 'connector',
      resourceId: id,
      userId: user.id,
      tenantId: user.tenantId,
      requestId: String(req.id),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      success: true,
    });

    return res.json({ connector });
  } catch (error) {
    console.error('Connector retrieval error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PUT /admin/connectors/:id
 * Update an API connector
 */
connectorRoutes.put('/:id', async (req, res) => {
  try {
    const supabase = getSupabaseServiceClient();
    const { user } = req;
    const { id } = req.params;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Extract update data
    const {
      name,
      type,
      base_url,
      auth_type,
      timeout_ms,
      is_active,
      // AI Classification
      is_ai_system,
      ai_risk_level,
      nist_categories,
      ai_use_case,
      risk_assessment_notes,
      // Auth credentials (for updating)
      api_key,
      api_key_header,
      bearer_token,
      basic_username,
      basic_password,
      oauth_client_id,
      oauth_client_secret,
    } = req.body;

    // Suppress unused variable warning
    void oauth_client_id;

    // Update connector
    const { data: connector, error: updateError } = await supabase
      .from('api_connectors')
      .update({
        name,
        type,
        base_url,
        auth_type,
        timeout_ms,
        is_active,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
        auth_config: auth_type === 'api_key' && api_key_header 
          ? { header: api_key_header } 
          : auth_type === 'basic' && basic_username
          ? { username: basic_username }
          : {},
        // AI Classification fields
        ...(is_ai_system !== undefined && { is_ai_system }),
        ...(ai_risk_level && { ai_risk_level }),
        ...(nist_categories && { nist_categories }),
        ...(ai_use_case !== undefined && { ai_use_case }),
        ...(risk_assessment_notes !== undefined && { risk_assessment_notes }),
      })
      .eq('id', id)
      .eq('tenant_id', user.tenantId)
      .select()
      .single();

    if (updateError || !connector) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Connector not found or update failed',
      });
    }

    // Update secrets if provided (delete old, insert new)
    const secretsToInsert: Array<{ connector_id: string; secret_type: string; encrypted_value: string; encryption_iv: string; encryption_tag: string }> = [];

    if (api_key) {
      // Delete old api_key secret
      await supabase
        .from('api_connector_secrets')
        .delete()
        .eq('connector_id', id)
        .eq('secret_type', 'api_key');

      const encrypted = cryptoService.encrypt(api_key);
      secretsToInsert.push({
        connector_id: id,
        secret_type: 'api_key',
        encrypted_value: encrypted.encryptedValue,
        encryption_iv: encrypted.iv,
        encryption_tag: encrypted.tag,
      });
    }

    if (bearer_token) {
      await supabase
        .from('api_connector_secrets')
        .delete()
        .eq('connector_id', id)
        .eq('secret_type', 'bearer_token');

      const encrypted = cryptoService.encrypt(bearer_token);
      secretsToInsert.push({
        connector_id: id,
        secret_type: 'bearer_token',
        encrypted_value: encrypted.encryptedValue,
        encryption_iv: encrypted.iv,
        encryption_tag: encrypted.tag,
      });
    }

    if (basic_password) {
      await supabase
        .from('api_connector_secrets')
        .delete()
        .eq('connector_id', id)
        .eq('secret_type', 'basic_password');

      const encrypted = cryptoService.encrypt(basic_password);
      secretsToInsert.push({
        connector_id: id,
        secret_type: 'basic_password',
        encrypted_value: encrypted.encryptedValue,
        encryption_iv: encrypted.iv,
        encryption_tag: encrypted.tag,
      });
    }

    if (oauth_client_secret) {
      await supabase
        .from('api_connector_secrets')
        .delete()
        .eq('connector_id', id)
        .eq('secret_type', 'oauth_client_secret');

      const encrypted = cryptoService.encrypt(oauth_client_secret);
      secretsToInsert.push({
        connector_id: id,
        secret_type: 'oauth_client_secret',
        encrypted_value: encrypted.encryptedValue,
        encryption_iv: encrypted.iv,
        encryption_tag: encrypted.tag,
      });
    }

    // Insert new secrets
    if (secretsToInsert.length > 0) {
      await supabase
        .from('api_connector_secrets')
        .insert(secretsToInsert);
    }

    // Log audit event
    auditLogger.logAdminAction({
      action: 'connector.update',
      resourceType: 'connector',
      resourceId: id,
      userId: user.id,
      tenantId: user.tenantId,
      requestId: String(req.id),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      details: { name, type, auth_type },
      success: true,
    });

    return res.json({
      connector,
      message: 'Connector updated successfully',
    });
  } catch (error) {
    console.error('Connector update error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /admin/connectors/:id
 * Delete an API connector
 */
connectorRoutes.delete('/:id', async (req, res) => {
  try {
    const supabase = getSupabaseServiceClient();
    const { user } = req;
    const { id } = req.params;

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Delete connector (cascade will delete secrets automatically)
    const { error: deleteError } = await supabase
      .from('api_connectors')
      .delete()
      .eq('id', id)
      .eq('tenant_id', user.tenantId);

    if (deleteError) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Connector not found or delete failed',
      });
    }

    // Log audit event
    auditLogger.logAdminAction({
      action: 'connector.delete',
      resourceType: 'connector',
      resourceId: id,
      userId: user.id,
      tenantId: user.tenantId,
      requestId: String(req.id),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      success: true,
    });

    return res.json({
      message: 'Connector deleted successfully',
    });
  } catch (error) {
    console.error('Connector deletion error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});
