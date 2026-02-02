const axios = require('axios');
const logger = require('../utils/logger');

const serviceRoutes = {
  '/api/auth': 'http://auth-identity-service:3001',
  '/api/tenants': 'http://tenant-organization-service:3003',
  '/api/users': 'http://user-staff-service:3003',
  '/api/branches': 'http://tenant-organization-service:3003',
  '/api/appointments': 'http://appointment-scheduling-service:8083',
  '/api/queue': 'http://token-queue-realtime-service:3005',
  '/api/tokens': 'http://token-queue-realtime-service:3005',
  '/api/nursing': 'http://nursing-care-service:3007',
  '/api/orthodontic': 'http://orthodontic-braces-service:3008',
  '/api/lab': 'http://lab-diagnostics-service:3009',
  '/api/ai-diagnosis': 'http://ai-diagnosis-service:5000',
  '/api/prescription-ocr': 'http://prescription-ocr-service:5001',
  '/api/billing': 'http://billing-payment-service:3012',
  '/api/insurance': 'http://insurance-claims-service:3013',
  '/api/accounting': 'http://accounting-finance-service:3014',
  '/api/payroll': 'http://payroll-hr-service:3015',
  '/api/inventory': 'http://inventory-pharmacy-service:3016',
  '/api/collaboration': 'http://collaboration-meeting-service:3017',
  '/api/notifications': 'http://notification-communication-service:3018',
  '/api/analytics': 'http://analytics-intelligence-service:3019',
  '/api/audit': 'http://audit-logging-service:3020',
  '/api/saas-admin': 'http://saas-admin-service:3021'
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
      // Prepare headers for downstream service
      const forwardHeaders = {
        ...req.headers,
        host: undefined, // Remove host header to avoid conflicts
        // Gateway adds these validated headers
        'x-gateway-validated': 'true',
        'x-request-id': generateRequestId(),
        'x-forwarded-for': req.ip,
        'x-forwarded-proto': req.protocol
      };

      logger.info(`Routing to service: ${route}`, {
        targetUrl: fullUrl,
        method: req.method,
        userId: req.userContext?.userId,
        tenantId: req.userContext?.tenantId
      });

      const response = await axios({
        method: req.method,
        url: fullUrl,
        data: req.body,
        headers: forwardHeaders,
        params: req.query,
        timeout: 30000, // 30 second timeout
        validateStatus: (status) => status < 600 // Don't throw on 4xx/5xx
      });
      
      // Forward response with proper status
      res.status(response.status).json(response.data);
      
    } catch (error) {
      logger.error(`Proxy error for ${route}:`, {
        error: error.message,
        targetUrl: fullUrl,
        method: req.method,
        userId: req.userContext?.userId,
        tenantId: req.userContext?.tenantId
      });

      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        res.status(503).json({ 
          error: 'Service temporarily unavailable',
          code: 'SERVICE_UNAVAILABLE',
          service: route 
        });
      } else if (error.code === 'ECONNABORTED') {
        res.status(504).json({ 
          error: 'Service timeout',
          code: 'SERVICE_TIMEOUT',
          service: route 
        });
      } else {
        res.status(502).json({ 
          error: 'Bad gateway',
          code: 'BAD_GATEWAY',
          service: route 
        });
      }
    }
    return;
  }

  next();
};

function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

module.exports = routingMiddleware;