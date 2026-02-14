/**
 * Proxy Routes
 * Dynamic routing based on database configuration
 */

import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { config } from '../config';
import { createClient } from '@supabase/supabase-js';

export const proxyRoutes = Router();

// Health check endpoint (before catch-all)
proxyRoutes.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.env,
  });
});

// Debug endpoint to test Supabase connectivity
proxyRoutes.get('/debug/supabase', async (req, res) => {
  try {
    console.log('[Debug] Testing Supabase connectivity');
    console.log('[Debug] Supabase URL:', config.supabase.url);
    console.log('[Debug] Has service role key:', !!config.supabase.serviceRoleKey);
    
    // First test: Can we reach Supabase URL?
    const urlTest = await Promise.race([
      fetch(`${config.supabase.url}/rest/v1/`, {
        method: 'HEAD',
        headers: {
          'apikey': config.supabase.serviceRoleKey,
        },
      }),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('URL fetch timeout')), 5000)
      )
    ]);
    
    console.log('[Debug] URL reachable, status:', urlTest.status);
    
    // Second test: Supabase client query
    const supabase = createClient(
      config.supabase.url,
      config.supabase.serviceRoleKey,
      {
        db: {
          schema: 'public',
        },
        global: {
          headers: {
            'x-client-info': 'vercel-serverless',
          },
        },
      }
    );
    
    console.log('[Debug] Client created, attempting query');
    const start = Date.now();
    
    const { data, error } = await Promise.race([
      supabase.from('api_connectors').select('count').limit(1),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout')), 5000)
      )
    ]);
    
    const elapsed = Date.now() - start;
    console.log('[Debug] Query completed in', elapsed, 'ms');
    
    if (error) {
      console.error('[Debug] Query error:', error);
      return res.json({
        status: 'error',
        url_reachable: true,
        message: error.message,
        elapsed_ms: elapsed,
      });
    }
    
    return res.json({
      status: 'ok',
      url_reachable: true,
      message: 'Supabase connection successful',
      elapsed_ms: elapsed,
      data: data,
    });
  } catch (err: any) {
    console.error('[Debug] Exception:', err);
    return res.status(500).json({
      status: 'error',
      message: err.message,
      url_reachable: err.message !== 'URL fetch timeout',
    });
  }
});

// Optional authentication (determined by route config)
proxyRoutes.use(authMiddleware({ requireAuth: false }));

/**
 * Dynamic proxy handler
 * Matches all /api/v1/* routes
 */
proxyRoutes.all('*', async (req, res) => {
  // Implementation will match route from database and proxy request
  // This is a placeholder - full implementation in separate service
  
  res.status(503).json({
    error: 'Service Configuration Required',
    message: 'This endpoint requires route configuration. Please contact administrator.',
  });
});
