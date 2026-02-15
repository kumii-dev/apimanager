/**
 * Vercel Serverless Function Entry Point
 * Wraps Express app for Vercel deployment
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// Import Express app factory
let app: any = null;
let appInitError: Error | null = null;

// Lazy load app to avoid cold start issues
const getApp = async () => {
  if (appInitError) {
    throw appInitError;
  }
  
  if (!app) {
    try {
      console.log('[Vercel] Initializing Express app...');
      console.log('[Vercel] Environment check:', {
        NODE_ENV: process.env.NODE_ENV,
        hasSupabaseUrl: !!process.env.SUPABASE_URL,
        hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        hasKmsKey: !!process.env.KMS_MASTER_KEY,
      });
      
      const { createApp } = await import('../gateway-server/dist/server.js');
      app = createApp();
      console.log('[Vercel] Express app initialized successfully');
    } catch (error) {
      console.error('[Vercel] Failed to initialize Express app:', error);
      appInitError = error instanceof Error ? error : new Error(String(error));
      throw appInitError;
    }
  }
  return app;
};

// Export handler for Vercel
export default async (req: VercelRequest, res: VercelResponse) => {
  const startTime = Date.now();
  
  try {
    console.log(`[Vercel] ${req.method} ${req.url}`);
    
    // Set a timeout warning
    const timeoutWarning = setTimeout(() => {
      console.warn('[Vercel] Request taking longer than 10s, may timeout soon');
    }, 10000);
    
    const expressApp = await getApp();
    clearTimeout(timeoutWarning);
    
    // Strip /api prefix from the path for Express routing
    // Vercel rewrites /api/:path* to /api, but passes full path in req.url
    // Express app expects paths without /api prefix (/admin/connectors, not /api/admin/connectors)
    if (req.url && req.url.startsWith('/api/')) {
      req.url = req.url.substring(4); // Remove '/api' prefix, keep the slash
    } else if (req.url === '/api') {
      req.url = '/'; // Root API call
    }
    
    console.log(`[Vercel] Routing to Express: ${req.url}`);
    
    // Express apps can be called as middleware functions: app(req, res, next)
    expressApp(req as any, res as any);
    
    // Log completion (if response completes within this execution context)
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      console.log(`[Vercel] Request completed in ${duration}ms`);
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[Vercel] Error after ${duration}ms:`, error);
    
    // Only send response if headers haven't been sent yet
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error),
        stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined,
        duration_ms: duration,
      });
    }
  }
};
