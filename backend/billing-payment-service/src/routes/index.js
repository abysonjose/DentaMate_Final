const express = require('express');
const router = express.Router();

// Import route modules
const billRoutes = require('./billRoutes');
const invoiceRoutes = require('./invoiceRoutes');
const paymentRoutes = require('./paymentRoutes');
const refundRoutes = require('./refundRoutes');

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Billing & Payment Service is healthy',
    timestamp: new Date().toISOString(),
    service: 'billing-payment-service',
    version: '1.0.0'
  });
});

// Service info endpoint
router.get('/info', (req, res) => {
  res.json({
    success: true,
    data: {
      service: 'billing-payment-service',
      version: '1.0.0',
      description: 'DentaMate Billing & Payment Management Service',
      features: [
        'Bill Generation',
        'Invoice Management',
        'Payment Processing',
        'Refund Management',
        'PDF Generation',
        'Payment Gateway Integration',
        'Role-based Access Control',
        'Audit Logging'
      ],
      endpoints: {
        bills: '/api/billing/bills',
        invoices: '/api/billing/invoices',
        payments: '/api/billing/payments',
        refunds: '/api/billing/refunds'
      }
    }
  });
});

// Mount route modules
router.use('/bills', billRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/payments', paymentRoutes);
router.use('/refunds', refundRoutes);

// 404 handler for API routes
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

module.exports = router;