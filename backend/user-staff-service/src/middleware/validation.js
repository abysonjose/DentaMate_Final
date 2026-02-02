const Joi = require('joi');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss');
const logger = require('../utils/logger');

class ValidationMiddleware {
  static validateRequest(schema) {
    return (req, res, next) => {
      try {
        const validationSchema = Joi.object(schema);
        const dataToValidate = {};

        // Extract data based on schema keys
        if (schema.body) {
          dataToValidate.body = req.body;
        }
        if (schema.params) {
          dataToValidate.params = req.params;
        }
        if (schema.query) {
          dataToValidate.query = req.query;
        }
        if (schema.headers) {
          dataToValidate.headers = req.headers;
        }

        const { error, value } = validationSchema.validate(dataToValidate, {
          abortEarly: false,
          stripUnknown: true,
          allowUnknown: false
        });

        if (error) {
          const errors = error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message,
            value: detail.context?.value
          }));

          logger.warn('Validation error:', {
            path: req.path,
            method: req.method,
            errors,
            userId: req.user?.userId
          });

          return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors
          });
        }

        // Update request with validated data
        if (value.body) req.body = value.body;
        if (value.params) req.params = value.params;
        if (value.query) req.query = value.query;

        next();
      } catch (error) {
        logger.error('Validation middleware error:', error);
        res.status(500).json({
          success: false,
          message: 'Validation failed'
        });
      }
    };
  }

  static sanitizeInput(req, res, next) {
    try {
      // MongoDB injection protection
      mongoSanitize.sanitize(req.body);
      mongoSanitize.sanitize(req.query);
      mongoSanitize.sanitize(req.params);

      // XSS protection for string fields
      if (req.body) {
        req.body = ValidationMiddleware.sanitizeObject(req.body);
      }
      if (req.query) {
        req.query = ValidationMiddleware.sanitizeObject(req.query);
      }
      if (req.params) {
        req.params = ValidationMiddleware.sanitizeObject(req.params);
      }

      next();
    } catch (error) {
      logger.error('Input sanitization error:', error);
      res.status(500).json({
        success: false,
        message: 'Input sanitization failed'
      });
    }
  }

  static sanitizeObject(obj) {
    if (typeof obj !== 'object' || obj === null) {
      return typeof obj === 'string' ? xss(obj) : obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => ValidationMiddleware.sanitizeObject(item));
    }

    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = ValidationMiddleware.sanitizeObject(value);
    }
    return sanitized;
  }

  static validateContentType(allowedTypes = ['application/json']) {
    return (req, res, next) => {
      if (req.method === 'GET' || req.method === 'DELETE') {
        return next();
      }

      const contentType = req.get('Content-Type');
      if (!contentType) {
        return res.status(400).json({
          success: false,
          message: 'Content-Type header is required'
        });
      }

      const isAllowed = allowedTypes.some(type => contentType.includes(type));
      if (!isAllowed) {
        return res.status(415).json({
          success: false,
          message: `Unsupported Content-Type. Allowed: ${allowedTypes.join(', ')}`
        });
      }

      next();
    };
  }

  static validateFileUpload(options = {}) {
    const {
      maxSize = 5 * 1024 * 1024, // 5MB
      allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'],
      required = false
    } = options;

    return (req, res, next) => {
      if (!req.file && !required) {
        return next();
      }

      if (!req.file && required) {
        return res.status(400).json({
          success: false,
          message: 'File upload is required'
        });
      }

      if (req.file.size > maxSize) {
        return res.status(400).json({
          success: false,
          message: `File size exceeds limit of ${maxSize / (1024 * 1024)}MB`
        });
      }

      if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({
          success: false,
          message: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`
        });
      }

      next();
    };
  }

  // Staff-specific validation schemas
  static getStaffValidationSchemas() {
    return {
      createStaff: {
        body: Joi.object({
          tenantId: Joi.string().required(),
          branchId: Joi.string().required(),
          departmentId: Joi.string().optional(),
          personalInfo: Joi.object({
            firstName: Joi.string().min(2).max(50).required(),
            lastName: Joi.string().min(2).max(50).required(),
            middleName: Joi.string().max(50).optional(),
            email: Joi.string().email().required(),
            phone: Joi.string().pattern(/^[+]?[\d\s\-\(\)]{10,15}$/).required(),
            alternatePhone: Joi.string().pattern(/^[+]?[\d\s\-\(\)]{10,15}$/).optional(),
            dateOfBirth: Joi.date().max('now').optional(),
            gender: Joi.string().valid('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY').optional()
          }).required(),
          address: Joi.object({
            street: Joi.string().max(200).optional(),
            area: Joi.string().max(100).optional(),
            city: Joi.string().max(100).optional(),
            state: Joi.string().max(100).optional(),
            country: Joi.string().max(100).default('India'),
            zipCode: Joi.string().max(20).optional()
          }).optional(),
          emergencyContact: Joi.object({
            name: Joi.string().max(100).optional(),
            phone: Joi.string().pattern(/^[+]?[\d\s\-\(\)]{10,15}$/).optional(),
            relationship: Joi.string().max(50).optional(),
            address: Joi.string().max(200).optional()
          }).optional(),
          employmentInfo: Joi.object({
            employmentType: Joi.string().valid('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN', 'CONSULTANT').default('FULL_TIME'),
            dateOfJoining: Joi.date().default('now'),
            probationEndDate: Joi.date().optional(),
            workingHours: Joi.object().pattern(
              Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'),
              Joi.object({
                start: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
                end: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
                isWorking: Joi.boolean().default(true)
              })
            ).optional(),
            salary: Joi.object({
              basic: Joi.number().min(0).optional(),
              allowances: Joi.number().min(0).default(0),
              currency: Joi.string().default('INR')
            }).optional()
          }).optional(),
          roles: Joi.array().items(
            Joi.object({
              roleId: Joi.string().required(),
              roleName: Joi.string().optional()
            })
          ).min(1).required(),
          professionalInfo: Joi.object({
            specialization: Joi.array().items(Joi.string()).optional(),
            qualifications: Joi.array().items(
              Joi.object({
                degree: Joi.string().optional(),
                institution: Joi.string().optional(),
                year: Joi.number().min(1950).max(new Date().getFullYear()).optional(),
                certificateUrl: Joi.string().uri().optional()
              })
            ).optional(),
            experience: Joi.object({
              totalYears: Joi.number().min(0).default(0),
              previousWorkplaces: Joi.array().items(
                Joi.object({
                  organization: Joi.string().optional(),
                  position: Joi.string().optional(),
                  duration: Joi.string().optional(),
                  responsibilities: Joi.string().optional()
                })
              ).optional()
            }).optional(),
            licenses: Joi.array().items(
              Joi.object({
                type: Joi.string().optional(),
                number: Joi.string().optional(),
                issuedBy: Joi.string().optional(),
                issuedDate: Joi.date().optional(),
                expiryDate: Joi.date().optional(),
                documentUrl: Joi.string().uri().optional()
              })
            ).optional()
          }).optional()
        })
      },

      updateStaff: {
        params: Joi.object({
          staffId: Joi.string().required()
        }),
        body: Joi.object({
          personalInfo: Joi.object({
            firstName: Joi.string().min(2).max(50).optional(),
            lastName: Joi.string().min(2).max(50).optional(),
            middleName: Joi.string().max(50).optional(),
            phone: Joi.string().pattern(/^[+]?[\d\s\-\(\)]{10,15}$/).optional(),
            alternatePhone: Joi.string().pattern(/^[+]?[\d\s\-\(\)]{10,15}$/).optional(),
            dateOfBirth: Joi.date().max('now').optional(),
            gender: Joi.string().valid('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY').optional()
          }).optional(),
          address: Joi.object({
            street: Joi.string().max(200).optional(),
            area: Joi.string().max(100).optional(),
            city: Joi.string().max(100).optional(),
            state: Joi.string().max(100).optional(),
            country: Joi.string().max(100).optional(),
            zipCode: Joi.string().max(20).optional()
          }).optional(),
          emergencyContact: Joi.object({
            name: Joi.string().max(100).optional(),
            phone: Joi.string().pattern(/^[+]?[\d\s\-\(\)]{10,15}$/).optional(),
            relationship: Joi.string().max(50).optional(),
            address: Joi.string().max(200).optional()
          }).optional(),
          employmentInfo: Joi.object({
            employmentType: Joi.string().valid('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN', 'CONSULTANT').optional(),
            workingHours: Joi.object().pattern(
              Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'),
              Joi.object({
                start: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
                end: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
                isWorking: Joi.boolean()
              })
            ).optional(),
            salary: Joi.object({
              basic: Joi.number().min(0).optional(),
              allowances: Joi.number().min(0).optional(),
              currency: Joi.string().optional()
            }).optional()
          }).optional(),
          professionalInfo: Joi.object({
            specialization: Joi.array().items(Joi.string()).optional(),
            qualifications: Joi.array().items(
              Joi.object({
                degree: Joi.string().optional(),
                institution: Joi.string().optional(),
                year: Joi.number().min(1950).max(new Date().getFullYear()).optional(),
                certificateUrl: Joi.string().uri().optional()
              })
            ).optional(),
            experience: Joi.object({
              totalYears: Joi.number().min(0).optional(),
              previousWorkplaces: Joi.array().items(
                Joi.object({
                  organization: Joi.string().optional(),
                  position: Joi.string().optional(),
                  duration: Joi.string().optional(),
                  responsibilities: Joi.string().optional()
                })
              ).optional()
            }).optional(),
            licenses: Joi.array().items(
              Joi.object({
                type: Joi.string().optional(),
                number: Joi.string().optional(),
                issuedBy: Joi.string().optional(),
                issuedDate: Joi.date().optional(),
                expiryDate: Joi.date().optional(),
                documentUrl: Joi.string().uri().optional()
              })
            ).optional()
          }).optional()
        }).min(1)
      },

      assignRole: {
        params: Joi.object({
          staffId: Joi.string().required()
        }),
        body: Joi.object({
          roleId: Joi.string().required()
        })
      },

      removeRole: {
        params: Joi.object({
          staffId: Joi.string().required(),
          roleId: Joi.string().required()
        })
      },

      deactivateStaff: {
        params: Joi.object({
          staffId: Joi.string().required()
        }),
        body: Joi.object({
          reason: Joi.string().min(10).max(500).required()
        })
      },

      transferStaff: {
        params: Joi.object({
          staffId: Joi.string().required()
        }),
        body: Joi.object({
          newBranchId: Joi.string().required(),
          reason: Joi.string().max(500).optional()
        })
      },

      getStaffQuery: {
        query: Joi.object({
          tenantId: Joi.string().optional(),
          branchId: Joi.string().optional(),
          role: Joi.string().optional(),
          status: Joi.string().valid('ACTIVE', 'ON_LEAVE', 'INACTIVE', 'TERMINATED', 'RESIGNED').optional(),
          limit: Joi.number().min(1).max(100).default(20),
          skip: Joi.number().min(0).default(0),
          sortBy: Joi.string().valid('name', 'email', 'joinDate', 'role').default('name'),
          sortOrder: Joi.string().valid('asc', 'desc').default('asc')
        })
      }
    };
  }

  // Role-specific validation schemas
  static getRoleValidationSchemas() {
    return {
      createRole: {
        body: Joi.object({
          roleName: Joi.string().min(2).max(50).uppercase().required(),
          displayName: Joi.string().min(2).max(100).required(),
          description: Joi.string().min(10).max(500).required(),
          scope: Joi.string().valid('GLOBAL', 'TENANT', 'BRANCH', 'DEPARTMENT').default('BRANCH'),
          level: Joi.number().min(1).max(10).default(5),
          permissions: Joi.array().items(
            Joi.object({
              resource: Joi.string().valid('STAFF', 'PATIENTS', 'APPOINTMENTS', 'BILLING', 'INVENTORY', 'REPORTS', 'SETTINGS', 'AUDIT', 'NOTIFICATIONS', 'ANALYTICS', 'SYSTEM').required(),
              actions: Joi.array().items(
                Joi.string().valid('CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'EXPORT')
              ).min(1).required(),
              conditions: Joi.object().optional()
            })
          ).optional(),
          constraints: Joi.object({
            maxPerBranch: Joi.number().min(1).optional(),
            maxPerTenant: Joi.number().min(1).optional(),
            requiresApproval: Joi.boolean().default(false),
            canAssignRoles: Joi.array().items(Joi.string()).optional(),
            canManageBranches: Joi.boolean().default(false),
            canManageTenants: Joi.boolean().default(false)
          }).optional()
        })
      },

      updateRole: {
        params: Joi.object({
          roleId: Joi.string().required()
        }),
        body: Joi.object({
          displayName: Joi.string().min(2).max(100).optional(),
          description: Joi.string().min(10).max(500).optional(),
          level: Joi.number().min(1).max(10).optional(),
          permissions: Joi.array().items(
            Joi.object({
              resource: Joi.string().valid('STAFF', 'PATIENTS', 'APPOINTMENTS', 'BILLING', 'INVENTORY', 'REPORTS', 'SETTINGS', 'AUDIT', 'NOTIFICATIONS', 'ANALYTICS', 'SYSTEM').required(),
              actions: Joi.array().items(
                Joi.string().valid('CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'EXPORT')
              ).min(1).required(),
              conditions: Joi.object().optional()
            })
          ).optional(),
          constraints: Joi.object({
            maxPerBranch: Joi.number().min(1).optional(),
            maxPerTenant: Joi.number().min(1).optional(),
            requiresApproval: Joi.boolean().optional(),
            canAssignRoles: Joi.array().items(Joi.string()).optional(),
            canManageBranches: Joi.boolean().optional(),
            canManageTenants: Joi.boolean().optional()
          }).optional()
        }).min(1)
      },

      addPermission: {
        params: Joi.object({
          roleId: Joi.string().required()
        }),
        body: Joi.object({
          resource: Joi.string().valid('STAFF', 'PATIENTS', 'APPOINTMENTS', 'BILLING', 'INVENTORY', 'REPORTS', 'SETTINGS', 'AUDIT', 'NOTIFICATIONS', 'ANALYTICS', 'SYSTEM').required(),
          actions: Joi.array().items(
            Joi.string().valid('CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'EXPORT')
          ).min(1).required(),
          conditions: Joi.object().optional()
        })
      }
    };
  }
}

module.exports = ValidationMiddleware;