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
  try {
    console.log('[Proxy] Incoming request:', req.method, req.path);
    
    // Create Supabase client
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

    // Query active routes from database using the view
    const { data: routes, error: routeError } = await supabase
      .from('v_active_routes')
      .select('*')
      .eq('http_method', req.method)
      .order('priority', { ascending: false });

    if (routeError) {
      console.error('[Proxy] Database error:', routeError);
      return res.status(500).json({
        error: 'Database Error',
        message: 'Failed to load routing configuration',
      });
    }

    if (!routes || routes.length === 0) {
      console.log('[Proxy] No routes found for method:', req.method);
      return res.status(404).json({
        error: 'Not Found',
        message: 'No route configured for this endpoint',
      });
    }

    // Match route by pattern
    let matchedRoute = null;
    let pathParams: Record<string, string> = {};

    for (const route of routes) {
      const fullPattern = `${route.module_prefix}${route.path_pattern}`;
      console.log('[Proxy] Testing pattern:', fullPattern, 'against:', req.path);
      
      // Convert path pattern to regex (e.g., /releases/:ocid -> /releases/([^/]+))
      const regexPattern = fullPattern.replace(/:([^/]+)/g, '([^/]+)');
      const regex = new RegExp(`^${regexPattern}$`);
      const match = req.path.match(regex);

      if (match) {
        console.log('[Proxy] Route matched!', route.name);
        matchedRoute = route;
        
        // Extract path parameters
        const paramNames = (fullPattern.match(/:([^/]+)/g) || []).map(p => p.slice(1));
        paramNames.forEach((name, index) => {
          pathParams[name] = match[index + 1];
        });
        break;
      }
    }

    if (!matchedRoute) {
      console.log('[Proxy] No matching route found');
      return res.status(404).json({
        error: 'Not Found',
        message: 'No route matches this path pattern',
      });
    }

    // Check authentication if required
    if (matchedRoute.auth_required && !req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required for this endpoint',
      });
    }

    // Check role authorization
    if (matchedRoute.auth_required && req.user) {
      const allowedRoles = matchedRoute.allowed_roles || [];
      if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Insufficient permissions',
        });
      }
    }

    // Build upstream URL
    let upstreamPath = matchedRoute.upstream_path;
    
    // Replace path parameters in upstream path
    Object.keys(pathParams).forEach(paramName => {
      upstreamPath = upstreamPath.replace(`:${paramName}`, pathParams[paramName]);
    });

    const upstreamUrl = `${matchedRoute.connector_base_url}${upstreamPath}`;
    console.log('[Proxy] Forwarding to:', upstreamUrl);

    // Forward request to upstream
    const upstreamHeaders: Record<string, string> = {
      'Content-Type': req.headers['content-type'] || 'application/json',
      'User-Agent': req.headers['user-agent'] || 'KUMII-Gateway/1.0',
    };

    // Add query parameters
    const queryString = new URLSearchParams(req.query as Record<string, string>).toString();
    const finalUrl = queryString ? `${upstreamUrl}?${queryString}` : upstreamUrl;

    const upstreamResponse = await fetch(finalUrl, {
      method: req.method,
      headers: upstreamHeaders,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
      signal: AbortSignal.timeout(matchedRoute.connector_timeout_ms || 30000),
    });

    // Get response data
    const contentType = upstreamResponse.headers.get('content-type');
    let data;
    
    if (contentType?.includes('application/json')) {
      data = await upstreamResponse.json();
    } else {
      data = await upstreamResponse.text();
    }

    console.log('[Proxy] Upstream response:', upstreamResponse.status);

    // Forward response to client
    res.status(upstreamResponse.status);
    
    // Copy relevant headers
    const headersToForward = ['content-type', 'cache-control', 'etag'];
    headersToForward.forEach(header => {
      const value = upstreamResponse.headers.get(header);
      if (value) {
        res.setHeader(header, value);
      }
    });

    return res.json(data);

  } catch (error: any) {
    console.error('[Proxy] Error:', error);
    
    if (error.name === 'AbortError' || error.message?.includes('timeout')) {
      return res.status(504).json({
        error: 'Gateway Timeout',
        message: 'Upstream service did not respond in time',
      });
    }

    return res.status(502).json({
      error: 'Bad Gateway',
      message: 'Failed to connect to upstream service',
      details: error.message,
    });
  }
});
