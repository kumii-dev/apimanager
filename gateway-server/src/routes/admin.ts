/**
 * Admin API Routes
 * ISO 27001 A.5 - Access Control
 * Requires authentication & authorization
 */

import { Router } from 'express';
import { requireAdmin } from '../middleware/auth';

export const adminRoutes = Router();

// All admin routes require admin role
adminRoutes.use(requireAdmin());

/**
 * GET /admin/modules
 * List available module prefixes
 */
adminRoutes.get('/modules', (req, res) => {
  res.json({
    modules: [
      { prefix: '/api/v1/market', description: 'Market data and trading' },
      { prefix: '/api/v1/capital', description: 'Capital management' },
      { prefix: '/api/v1/mentorship', description: 'Mentorship platform' },
      { prefix: '/api/v1/collaboration', description: 'Collaboration tools' },
      { prefix: '/api/v1/cms', description: 'Content management' },
      { prefix: '/api/v1/analytics', description: 'Analytics and reporting' },
    ],
  });
});

/**
 * Connector routes
 */
import('./connectors').then(module => {
  adminRoutes.use('/connectors', module.connectorRoutes);
});

/**
 * Route routes
 */
import('./routesAdmin').then(module => {
  adminRoutes.use('/routes', module.routeRoutes);
});

/**
 * Audit log routes
 */
import('./auditLogs').then(module => {
  adminRoutes.use('/audit-logs', module.auditLogRoutes);
});

/**
 * Metrics routes
 */
import('./metrics').then(module => {
  adminRoutes.use('/metrics', module.metricsRoutes);
});
