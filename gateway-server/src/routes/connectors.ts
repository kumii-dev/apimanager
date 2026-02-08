/**
 * API Connectors Management Routes
 * ISO 27001 A.5 - Access Control
 * CRUD operations for API connectors
 */

import { Router } from 'express';
import { requireAdmin } from '../middleware/auth';

export const connectorRoutes = Router();

// All routes require admin access
connectorRoutes.use(requireAdmin());

/**
 * GET /admin/connectors
 * List all API connectors
 */
connectorRoutes.get('/', async (req, res) => {
  // TODO: Implement connector listing from Supabase
  res.json({
    connectors: [],
    total: 0,
    message: 'Connector management coming soon',
  });
});

/**
 * POST /admin/connectors
 * Create a new API connector
 */
connectorRoutes.post('/', async (req, res) => {
  // TODO: Implement connector creation
  res.status(501).json({
    error: 'Not implemented',
    message: 'Connector creation endpoint is under development',
  });
});

/**
 * GET /admin/connectors/:id
 * Get a specific API connector
 */
connectorRoutes.get('/:id', async (req, res) => {
  // TODO: Implement connector retrieval
  res.status(501).json({
    error: 'Not implemented',
    message: 'Connector retrieval endpoint is under development',
  });
});

/**
 * PUT /admin/connectors/:id
 * Update an API connector
 */
connectorRoutes.put('/:id', async (req, res) => {
  // TODO: Implement connector update
  res.status(501).json({
    error: 'Not implemented',
    message: 'Connector update endpoint is under development',
  });
});

/**
 * DELETE /admin/connectors/:id
 * Delete an API connector
 */
connectorRoutes.delete('/:id', async (req, res) => {
  // TODO: Implement connector deletion
  res.status(501).json({
    error: 'Not implemented',
    message: 'Connector deletion endpoint is under development',
  });
});
