// utils/corsMiddleware.js

const corsMiddleware = (handler) => async (req, res) => {
    // Always log the incoming request for debugging
    console.log('CORS Middleware - Request:', {
      method: req.method,
      origin: req.headers.origin,
      headers: req.headers
    });
  
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '3600');
  
    // Handle preflight request
    if (req.method === 'OPTIONS') {
      console.log('Handling OPTIONS preflight request');
      res.status(200).end();
      return;
    }
  
    try {
      return await handler(req, res);
    } catch (error) {
      console.error('Handler error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  };
  
  module.exports = corsMiddleware;