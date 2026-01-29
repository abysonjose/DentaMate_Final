const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        logger.warn('Invalid token attempt', {
          error: err.message,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
        
        return res.status(403).json({
          success: false,
          message: 'Invalid or expired token'
        });
      }

      // Validate required token fields
      if (!decoded.userId || !decoded.tenantId || !decoded.role) {
        return res.status(403).json({
          success: false,
          message: 'Invalid token structure'
        });
      }

      req.user = {
        userId: decoded.userId,
        tenantId: decoded.tenantId,
        branchId: decoded.branchId,
        role: decoded.role,
        permissions: decoded.permissions || [],
        email: decoded.email,
        name: decoded.name
      };

      next();
    });
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication service error'
    });
  }
};

const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      if (!allowedRoles.includes(req.user.role)) {
        logger.warn('Unauthorized access attempt', {
          userId: req.user.userId,
          role: req.user.role,
          requiredRoles: allowedRoles,
          endpoint: req.path,
          method: req.method
        });

        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions for this operation'
        });
      }

      next();
    } catch (error) {
      logger.error('Authorization error:', error);
      res.status(500).json({
        success: false,
        message: 'Authorization service error'
      });
    }
  };
};

const validateTenantAccess = (req, res, next) => {
  try {
    const { tenantId } = req.params;
    
    if (tenantId && tenantId !== req.user.tenantId) {
      logger.warn('Cross-tenant access attempt', {
        userId: req.user.userId,
        userTenantId: req.user.tenantId,
        requestedTenantId: tenantId,
        endpoint: req.path
      });

      return res.status(403).json({
        success: false,
        message: 'Access denied to requested tenant'
      });
    }

    next();
  } catch (error) {
    logger.error('Tenant validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Tenant validation error'
    });
  }
};

const validateBranchAccess = (req, res, next) => {
  try {
    const { branchId } = req.params;
    
    // SaaS Admin and Central Admin can access all branches
    if (['SAAS_ADMIN', 'CENTRAL_ADMIN'].includes(req.user.role)) {
      return next();
    }

    // Branch-specific roles must match branch
    if (branchId && req.user.branchId && branchId !== req.user.branchId) {
      logger.warn('Cross-branch access attempt', {
        userId: req.user.userId,
        userBranchId: req.user.branchId,
        requestedBranchId: branchId,
        role: req.user.role,
        endpoint: req.path
      });

      return res.status(403).json({
        success: false,
        message: 'Access denied to requested branch'
      });
    }

    next();
  } catch (error) {
    logger.error('Branch validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Branch validation error'
    });
  }
};

// Role-specific middleware for payroll operations
const authorizePayrollAccess = (req, res, next) => {
  const payrollRoles = ['HR', 'PAYROLL_OFFICER', 'ACCOUNTS_MANAGER', 'ACCOUNTANT'];
  
  if (!payrollRoles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Payroll access requires HR, Payroll Officer, Accounts Manager, or Accountant role'
    });
  }

  // Set access level based on role
  req.user.payrollAccess = {
    canModifyAttendance: ['HR'].includes(req.user.role),
    canCalculatePayroll: ['PAYROLL_OFFICER'].includes(req.user.role),
    canFinalizePayroll: ['PAYROLL_OFFICER'].includes(req.user.role),
    canViewPayroll: payrollRoles.includes(req.user.role),
    canGeneratePayslips: ['PAYROLL_OFFICER'].includes(req.user.role),
    readOnly: ['ACCOUNTS_MANAGER', 'ACCOUNTANT'].includes(req.user.role)
  };

  next();
};

// Middleware to check if payroll is finalized (prevents modifications)
const checkPayrollFinalized = async (req, res, next) => {
  try {
    const { month } = req.params;
    
    if (!month) {
      return next();
    }

    const PayrollRun = require('../models/PayrollRun');
    const payrollRun = await PayrollRun.findOne({
      tenantId: req.user.tenantId,
      branchId: req.user.branchId || req.params.branchId,
      month,
      status: 'FINALIZED'
    });

    if (payrollRun && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot modify data for finalized payroll period'
      });
    }

    next();
  } catch (error) {
    logger.error('Payroll finalization check error:', error);
    res.status(500).json({
      success: false,
      message: 'Payroll validation error'
    });
  }
};

module.exports = {
  authenticateToken,
  authorizeRoles,
  validateTenantAccess,
  validateBranchAccess,
  authorizePayrollAccess,
  checkPayrollFinalized
};