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
    
    // Vercel serverless functions don't support app.listen()
    // Just pass the request to Express
    return expressApp(req, res);
  } catch (error) {
    console.error('Error handling request:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: String(error)
    });
  }
};
