const Joi = require('joi');
const logger = require('../utils/logger');

class ValidationMiddleware {
  // Generic validation middleware
  static validate(schema, property = 'body') {
    return (req, res, next) => {
      try {
        const { error, value } = schema.validate(req[property], {
          abortEarly: false,
          stripUnknown: true,
          convert: true
        });

        if (error) {
          const errorDetails = error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message,
            value: detail.context?.value
          }));

          logger.warn('Validation failed', {
            userId: req.user?.userId,
            endpoint: req.path,
            errors: errorDetails
          });

          return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errorDetails
          });
        }

        // Replace the original data with validated and sanitized data
        req[property] = value;
        next();
      } catch (validationError) {
        logger.error('Validation middleware error:', validationError);
        return res.status(500).json({
          success: false,
          message: 'Validation processing failed'
        });
      }
    };
  }

  // Common validation schemas
  static get schemas() {
    return {
      // MongoDB ObjectId validation
      objectId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).message('Invalid ObjectId format'),
      
      // UUID validation
      uuid: Joi.string().uuid().message('Invalid UUID format'),
      
      // Tenant and branch validation
      tenantId: Joi.string().required().min(1).max(50),
      branchId: Joi.string().required().min(1).max(50),
      
      // User validation
      userId: Joi.string().required().min(1).max(50),
      userName: Joi.string().required().min(2).max(100).trim(),
      userRole: Joi.string().valid(
        'DOCTOR', 'SPECIALIST', 'ORTHOTIST', 'HEAD_NURSE', 'NURSE',
        'LAB_STAFF', 'PHARMACIST', 'RECEPTIONIST', 'SUPPORT_STAFF',
        'BILLING_OFFICER', 'CASHIER', 'ACCOUNTANT', 'ACCOUNTS_MANAGER',
        'PAYROLL_OFFICER', 'INSURANCE', 'HR', 'BRANCH_ADMIN',
        'CENTRAL_ADMIN', 'SAAS_ADMIN'
      ),
      
      // Case collaboration schemas
      shareCase: Joi.object({
        caseId: Joi.string().required().min(1).max(50),
        patientId: Joi.string().required().min(1).max(50),
        sharedWith: Joi.array().items(
          Joi.object({
            userId: Joi.string().required().min(1).max(50),
            name: Joi.string().required().min(2).max(100).trim(),
            role: Joi.string().valid(
              'DOCTOR', 'SPECIALIST', 'ORTHOTIST', 'HEAD_NURSE', 'NURSE'
            ).required(),
            permissions: Joi.string().valid('VIEW_ONLY', 'COMMENT').default('VIEW_ONLY')
          })
        ).min(1).max(10).required(),
        caseDetails: Joi.object({
          title: Joi.string().required().min(5).max(200).trim(),
          description: Joi.string().max(1000).trim().allow(''),
          specialty: Joi.string().max(50).trim().allow(''),
          urgency: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'URGENT').default('MEDIUM')
        }).required()
      }),
      
      updatePermissions: Joi.object({
        userId: Joi.string().required().min(1).max(50),
        permissions: Joi.string().valid('VIEW_ONLY', 'COMMENT').required()
      }),
      
      // Discussion schemas
      createDiscussion: Joi.object({
        caseId: Joi.string().required().min(1).max(50),
        collaborationId: Joi.string().required().min(1).max(50),
        content: Joi.string().required().min(1).max(2000).trim(),
        discussionType: Joi.string().valid('COMMENT', 'QUESTION', 'SUGGESTION', 'CONCERN').default('COMMENT'),
        parentDiscussionId: Joi.string().min(1).max(50).allow(null),
        meetingId: Joi.string().min(1).max(50).allow(null),
        mentions: Joi.array().items(
          Joi.object({
            userId: Joi.string().required().min(1).max(50),
            name: Joi.string().required().min(2).max(100).trim(),
            role: Joi.string().required()
          })
        ).max(10),
        metadata: Joi.object({
          isPrivate: Joi.boolean().default(false),
          priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH').default('MEDIUM'),
          tags: Joi.array().items(Joi.string().max(30)).max(5)
        })
      }),
      
      updateDiscussion: Joi.object({
        content: Joi.string().required().min(1).max(2000).trim(),
        editReason: Joi.string().max(200).trim().allow('')
      }),
      
      addReaction: Joi.object({
        reaction: Joi.string().valid('LIKE', 'HELPFUL', 'AGREE', 'DISAGREE').required()
      }),
      
      // Meeting schemas
      createMeeting: Joi.object({
        caseId: Joi.string().required().min(1).max(50),
        collaborationId: Joi.string().required().min(1).max(50),
        meetingDetails: Joi.object({
          title: Joi.string().required().min(5).max(200).trim(),
          description: Joi.string().max(1000).trim().allow(''),
          agenda: Joi.array().items(Joi.string().max(200)).max(10),
          meetingType: Joi.string().valid('VIRTUAL', 'IN_PERSON', 'HYBRID').default('VIRTUAL'),
          specialty: Joi.string().max(50).trim().allow(''),
          urgency: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'URGENT').default('MEDIUM')
        }).required(),
        schedule: Joi.object({
          scheduledAt: Joi.date().iso().greater('now').required(),
          duration: Joi.number().integer().min(15).max(240).required(), // 15 minutes to 4 hours
          timezone: Joi.string().default('UTC')
        }).required(),
        participants: Joi.array().items(
          Joi.object({
            userId: Joi.string().required().min(1).max(50),
            name: Joi.string().required().min(2).max(100).trim(),
            role: Joi.string().required(),
            isRequired: Joi.boolean().default(false)
          })
        ).min(1).max(10).required()
      }),
      
      updateMeeting: Joi.object({
        meetingDetails: Joi.object({
          title: Joi.string().min(5).max(200).trim(),
          description: Joi.string().max(1000).trim().allow(''),
          agenda: Joi.array().items(Joi.string().max(200)).max(10),
          urgency: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'URGENT')
        }),
        schedule: Joi.object({
          scheduledAt: Joi.date().iso().greater('now'),
          duration: Joi.number().integer().min(15).max(240),
          timezone: Joi.string()
        })
      }),
      
      meetingResponse: Joi.object({
        responseStatus: Joi.string().valid('ACCEPTED', 'DECLINED', 'TENTATIVE').required()
      }),
      
      // Meeting notes schemas
      createMeetingNote: Joi.object({
        noteContent: Joi.object({
          title: Joi.string().required().min(5).max(200).trim(),
          content: Joi.string().required().min(10).max(5000).trim(),
          noteType: Joi.string().valid('GENERAL', 'ACTION_ITEM', 'DECISION', 'FOLLOW_UP', 'SUMMARY').default('GENERAL'),
          priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'URGENT').default('MEDIUM')
        }).required(),
        keyPoints: Joi.array().items(
          Joi.object({
            point: Joi.string().required().min(5).max(500).trim(),
            category: Joi.string().valid('DISCUSSION', 'DECISION', 'ACTION', 'CONCERN', 'RECOMMENDATION'),
            assignedTo: Joi.object({
              userId: Joi.string().min(1).max(50),
              name: Joi.string().min(2).max(100).trim(),
              role: Joi.string()
            }),
            dueDate: Joi.date().iso().greater('now')
          })
        ).max(20),
        actionItems: Joi.array().items(
          Joi.object({
            description: Joi.string().required().min(5).max(500).trim(),
            assignedTo: Joi.object({
              userId: Joi.string().required().min(1).max(50),
              name: Joi.string().required().min(2).max(100).trim(),
              role: Joi.string()
            }).required(),
            dueDate: Joi.date().iso().greater('now').required(),
            priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'URGENT').default('MEDIUM')
          })
        ).max(10),
        visibility: Joi.string().valid('PUBLIC', 'PARTICIPANTS_ONLY', 'DOCTORS_ONLY', 'PRIVATE').default('PARTICIPANTS_ONLY')
      }),
      
      updateActionItem: Joi.object({
        status: Joi.string().valid('PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE').required()
      }),
      
      // Query parameter schemas
      queryParams: Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(20),
        sortBy: Joi.string().valid('createdAt', 'updatedAt', 'title', 'priority', 'status').default('createdAt'),
        sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
        status: Joi.string(),
        search: Joi.string().max(100).trim(),
        startDate: Joi.date().iso(),
        endDate: Joi.date().iso().greater(Joi.ref('startDate'))
      }),
      
      // Path parameter schemas
      pathParams: Joi.object({
        id: Joi.string().required().min(1).max(50),
        caseId: Joi.string().min(1).max(50),
        meetingId: Joi.string().min(1).max(50),
        discussionId: Joi.string().min(1).max(50),
        noteId: Joi.string().min(1).max(50)
      })
    };
  }

  // Specific validation methods
  static validateShareCase() {
    return this.validate(this.schemas.shareCase);
  }

  static validateUpdatePermissions() {
    return this.validate(this.schemas.updatePermissions);
  }

  static validateCreateDiscussion() {
    return this.validate(this.schemas.createDiscussion);
  }

  static validateUpdateDiscussion() {
    return this.validate(this.schemas.updateDiscussion);
  }

  static validateAddReaction() {
    return this.validate(this.schemas.addReaction);
  }

  static validateCreateMeeting() {
    return this.validate(this.schemas.createMeeting);
  }

  static validateUpdateMeeting() {
    return this.validate(this.schemas.updateMeeting);
  }

  static validateMeetingResponse() {
    return this.validate(this.schemas.meetingResponse);
  }

  static validateCreateMeetingNote() {
    return this.validate(this.schemas.createMeetingNote);
  }

  static validateUpdateActionItem() {
    return this.validate(this.schemas.updateActionItem);
  }

  static validateQueryParams() {
    return this.validate(this.schemas.queryParams, 'query');
  }

  static validatePathParams() {
    return this.validate(this.schemas.pathParams, 'params');
  }

  // Custom validation for file uploads
  static validateFileUpload(allowedTypes = [], maxSize = 10 * 1024 * 1024) {
    return (req, res, next) => {
      try {
        if (!req.files || req.files.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'No files uploaded'
          });
        }

        const errors = [];

        req.files.forEach((file, index) => {
          // Check file type
          if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
            errors.push({
              file: index,
              field: 'mimetype',
              message: `File type ${file.mimetype} not allowed`,
              allowedTypes
            });
          }

          // Check file size
          if (file.size > maxSize) {
            errors.push({
              file: index,
              field: 'size',
              message: `File size ${file.size} exceeds maximum ${maxSize}`,
              maxSize
            });
          }

          // Check filename
          if (!file.originalname || file.originalname.length > 255) {
            errors.push({
              file: index,
              field: 'filename',
              message: 'Invalid filename'
            });
          }
        });

        if (errors.length > 0) {
          return res.status(400).json({
            success: false,
            message: 'File validation failed',
            errors
          });
        }

        next();
      } catch (error) {
        logger.error('File validation error:', error);
        return res.status(500).json({
          success: false,
          message: 'File validation failed'
        });
      }
    };
  }
}

module.exports = ValidationMiddleware;