const axios = require('axios');

const serviceRoutes = {
  '/api/auth': 'http://auth-service:3001',
  '/api/tenants': 'http://tenant-service:3002',
  '/api/users': 'http://user-service:3003',
  '/api/clinics': 'http://clinic-service:3004',
  '/api/appointments': 'http://appointment-service:8080',
  '/api/queue': 'http://queue-service:3006',
  '/api/nursing': 'http://nursing-service:3007',
  '/api/orthodontic': 'http://orthodontic-service:3008',
  '/api/lab': 'http://lab-service:3009',
  '/api/ai-diagnosis': 'http://ai-diagnosis-service:5000',
  '/api/prescription-ocr': 'http://prescription-ocr-service:5001',
  '/api/billing': 'http://billing-service:3012',
  '/api/insurance': 'http://insurance-service:3013',
  '/api/accounting': 'http://accounting-service:3014',
  '/api/payroll': 'http://payroll-service:3015',
  '/api/inventory': 'http://inventory-service:3016',
  '/api/collaboration': 'http://collaboration-service:3017',
  '/api/notifications': 'http://notification-service:3018',
  '/api/analytics': 'http://analytics-service:3019',
  '/api/audit': 'http://audit-service:3020'
};

const routingMiddleware = async (req, res, next) => {
  const route = Object.keys(serviceRoutes).find(route => 
    req.path.startsWith(route)
  );

  if (route) {
    const targetUrl = serviceRoutes[route];
    const servicePath = req.path.replace(route, '');
    const fullUrl = `${targetUrl}${servicePath}`;
    
    try {
      const response = await axios({
        method: req.method,
        url: fullUrl,
        data: req.body,
        headers: {
          ...req.headers,
          host: undefined // Remove host header to avoid conflicts
        },
        params: req.query
      });
      
      res.status(response.status).json(response.data);
    } catch (error) {
      console.error(`Proxy error for ${route}:`, error.message);
      res.status(503).json({ 
        error: 'Service temporarily unavailable',
        service: route 
      });
    }
    return;
  }

  next();
};

module.exports = routingMiddleware;