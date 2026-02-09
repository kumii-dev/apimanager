/**
 * Admin API Routes
 * ISO 27001 A.5 - Access Control
 * Requires authentication & authorization
 */

import { Router } from 'express';
import { requireAdmin } from '../middleware/auth';
import { connectorRoutes } from './connectors';
import { routeRoutes } from './routesAdmin';
import { auditLogRoutes } from './auditLogs';

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
adminRoutes.use('/connectors', connectorRoutes);

/**
 * Route routes
 */
adminRoutes.use('/routes', routeRoutes);

/**
 * Audit log routes
 */
adminRoutes.use('/audit-logs', auditLogRoutes);

/**
 * Metrics routes
 */
import('./metrics').then(module => {
  adminRoutes.use('/metrics', module.metricsRoutes);
});
