const express = require('express');
const AIResultController = require('../controllers/AIResultController');
const auth = require('../middleware/auth');
const validation = require('../middleware/validation');
const rateLimiter = require('../middleware/rateLimiter');

const router = express.Router();
const aiController = new AIResultController();

// Apply authentication to all routes except callback
router.use('/ai-callback', (req, res, next) => {
  // Skip auth for AI service callbacks
  next();
});

router.use(auth);

// Apply rate limiting
router.use(rateLimiter.createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
}));

/**
 * @route GET /api/diagnostics/orders/:orderId/ai-results
 * @desc Get AI analysis results for an order
 * @access All authenticated users (with access control)
 */
router.get('/orders/:orderId/ai-results',
  validation.validateOrderId,
  aiController.getOrderResults.bind(aiController)
);

/**
 * @route GET /api/diagnostics/ai-results/:resultId
 * @desc Get specific AI analysis result
 * @access All authenticated users (with access control)
 */
router.get('/ai-results/:resultId',
  validation.validateResultId,
  aiController.getResult.bind(aiController)
);

/**
 * @route GET /api/diagnostics/ai-analysis/:analysisId/status
 * @desc Get analysis status
 * @access All authenticated users (with access control)
 */
router.get('/ai-analysis/:analysisId/status',
  validation.validateAnalysisId,
  aiController.getAnalysisStatus.bind(aiController)
);

/**
 * @route POST /api/diagnostics/ai-analysis/:analysisId/retry
 * @desc Retry failed analysis
 * @access Lab Staff, Branch Admin, Central Admin
 */
router.post('/ai-analysis/:analysisId/retry',
  validation.validateRole(['LAB_STAFF', 'BRANCH_ADMIN', 'CENTRAL_ADMIN', 'SAAS_ADMIN']),
  validation.validateAnalysisId,
  aiController.retryAnalysis.bind(aiController)
);

/**
 * @route DELETE /api/diagnostics/ai-analysis/:analysisId
 * @desc Cancel analysis
 * @access Lab Staff, Branch Admin, Central Admin
 */
router.delete('/ai-analysis/:analysisId',
  validation.validateRole(['LAB_STAFF', 'BRANCH_ADMIN', 'CENTRAL_ADMIN', 'SAAS_ADMIN']),
  validation.validateAnalysisId,
  aiController.cancelAnalysis.bind(aiController)
);

/**
 * @route POST /api/diagnostics/ai-results/:resultId/review
 * @desc Review AI analysis result
 * @access Doctor, Head Nurse, Branch Admin, Central Admin
 */
router.post('/ai-results/:resultId/review',
  validation.validateRole(['DOCTOR', 'HEAD_NURSE', 'BRANCH_ADMIN', 'CENTRAL_ADMIN']),
  validation.validateResultId,
  validation.validateReviewResult,
  aiController.reviewResult.bind(aiController)
);

/**
 * @route GET /api/diagnostics/ai-results/pending-reviews
 * @desc Get pending AI result reviews
 * @access Doctor, Head Nurse, Branch Admin, Central Admin
 */
router.get('/ai-results/pending-reviews',
  validation.validateRole(['DOCTOR', 'HEAD_NURSE', 'BRANCH_ADMIN', 'CENTRAL_ADMIN']),
  aiController.getPendingReviews.bind(aiController)
);

/**
 * @route GET /api/diagnostics/ai-analytics
 * @desc Get AI analytics data
 * @access All authenticated users (filtered by role)
 */
router.get('/ai-analytics',
  aiController.getAnalytics.bind(aiController)
);

/**
 * @route POST /api/diagnostics/ai-callback
 * @desc Handle AI analysis callback (no auth required)
 * @access AI Service only
 */
router.post('/ai-callback',
  validation.validateAICallback,
  aiController.handleCallback.bind(aiController)
);

/**
 * @route GET /api/diagnostics/ai-service/health
 * @desc Get AI service health status
 * @access Branch Admin, Central Admin, SaaS Admin
 */
router.get('/ai-service/health',
  validation.validateRole(['BRANCH_ADMIN', 'CENTRAL_ADMIN', 'SAAS_ADMIN']),
  aiController.getAIServiceHealth.bind(aiController)
);

module.exports = router;