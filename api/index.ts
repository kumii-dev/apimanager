/**
 * Vercel Serverless Function Entry Point
 * Wraps Express app for Vercel deployment
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// Import Express app factory
let app: any = null;

// Lazy load app to avoid cold start issues
const getApp = async () => {
  if (!app) {
    const { createApp } = await import('../gateway-server/dist/server.js');
    app = createApp();
  }
  return app;
};

// Export handler for Vercel
export default async (req: VercelRequest, res: VercelResponse) => {
  try {
    const expressApp = await getApp();
    
    // Strip /api prefix from the path for Express routing
    // Vercel rewrites /api/:path* to /api, but passes full path in req.url
    // Express app expects paths without /api prefix (/admin/connectors, not /api/admin/connectors)
    if (req.url && req.url.startsWith('/api/')) {
      req.url = req.url.substring(4); // Remove '/api' prefix, keep the slash
    } else if (req.url === '/api') {
      req.url = '/'; // Root API call
    }
    
    // Express apps can be called as middleware functions: app(req, res, next)
    expressApp(req as any, res as any);
  } catch (error) {
    console.error('[Vercel] Error handling request:', error);
    
    // Only send response if headers haven't been sent yet
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
        stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
      });
    }
  }
};
