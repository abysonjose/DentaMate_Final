const Joi = require('joi');
const logger = require('../utils/logger');

class ValidationMiddleware {
  // Generic validation middleware
  static validate(schema, property = 'body') {
    return (req, res, next) => {
      const { error, value } = schema.validate(req[property], {
        abortEarly: false,
        stripUnknown: true
      });

      if (error) {
        const errorDetails = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }));

        logger.warn('Validation failed', {
          property,
          errors: errorDetails,
          userId: req.user?.userId
        });

        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errorDetails
        });
      }

      // Replace request property with validated value
      req[property] = value;
      next();
    };
  }

  // Common validation schemas
  static get commonSchemas() {
    return {
      uuid: Joi.string().uuid().required(),
      tenantId: Joi.string().uuid().required(),
      branchId: Joi.string().uuid().required(),
      patientId: Joi.string().uuid().required(),
      appointmentId: Joi.string().uuid().required(),
      userId: Joi.string().uuid().required(),
      pagination: Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(20),
        sortBy: Joi.string().default('timestamp'),
        sortOrder: Joi.string().valid('asc', 'desc').default('desc')
      })
    };
  }

  // Vitals validation schemas
  static get vitalsSchemas() {
    return {
      create: Joi.object({
        patientId: Joi.string().uuid().required(),
        appointmentId: Joi.string().uuid().required(),
        branchId: Joi.string().uuid().required(),
        metrics: Joi.object({
          bloodPressure: Joi.object({
            systolic: Joi.number().integer().min(50).max(300),
            diastolic: Joi.number().integer().min(30).max(200)
          }),
          pulse: Joi.number().integer().min(30).max(200),
          temperature: Joi.number().min(90.0).max(110.0),
          oxygenSaturation: Joi.number().integer().min(70).max(100),
          respiratoryRate: Joi.number().integer().min(8).max(40),
          weight: Joi.number().min(0),
          height: Joi.number().min(0)
        }).min(1).required(),
        notes: Joi.string().max(500).allow(''),
        recordingType: Joi.string().valid(
          'PRE_CONSULTATION',
          'POST_PROCEDURE',
          'ROUTINE_CHECK'
        ).required()
      }),
      
      query: Joi.object({
        patientId: Joi.string().uuid(),
        appointmentId: Joi.string().uuid(),
        branchId: Joi.string().uuid(),
        recordingType: Joi.string().valid(
          'PRE_CONSULTATION',
          'POST_PROCEDURE',
          'ROUTINE_CHECK'
        ),
        isAbnormal: Joi.boolean(),
        startDate: Joi.date().iso(),
        endDate: Joi.date().iso().min(Joi.ref('startDate')),
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(20),
        sortBy: Joi.string().default('timestamp'),
        sortOrder: Joi.string().valid('asc', 'desc').default('desc')
      })
    };
  }

  // Care notes validation schemas
  static get careNoteSchemas() {
    return {
      create: Joi.object({
        appointmentId: Joi.string().uuid().required(),
        patientId: Joi.string().uuid().required(),
        branchId: Joi.string().uuid().required(),
        noteType: Joi.string().valid(
          'PATIENT_PREPARATION',
          'CHAIRSIDE_ASSISTANCE',
          'POST_PROCEDURE_CARE',
          'MEDICATION_ADMINISTRATION',
          'PATIENT_EDUCATION',
          'DISCHARGE_INSTRUCTIONS',
          'GENERAL_OBSERVATION'
        ).required(),
        content: Joi.string().min(1).max(2000).required(),
        priority: Joi.string().valid('LOW', 'NORMAL', 'HIGH', 'URGENT').default('NORMAL'),
        tags: Joi.array().items(Joi.string().max(50)).max(10),
        relatedVitalsId: Joi.string().uuid(),
        isPrivate: Joi.boolean().default(false)
      }),
      
      update: Joi.object({
        content: Joi.string().min(1).max(2000),
        priority: Joi.string().valid('LOW', 'NORMAL', 'HIGH', 'URGENT'),
        tags: Joi.array().items(Joi.string().max(50)).max(10),
        isPrivate: Joi.boolean()
      }).min(1),
      
      query: Joi.object({
        appointmentId: Joi.string().uuid(),
        patientId: Joi.string().uuid(),
        branchId: Joi.string().uuid(),
        noteType: Joi.string().valid(
          'PATIENT_PREPARATION',
          'CHAIRSIDE_ASSISTANCE',
          'POST_PROCEDURE_CARE',
          'MEDICATION_ADMINISTRATION',
          'PATIENT_EDUCATION',
          'DISCHARGE_INSTRUCTIONS',
          'GENERAL_OBSERVATION'
        ),
        priority: Joi.string().valid('LOW', 'NORMAL', 'HIGH', 'URGENT'),
        includePrivate: Joi.boolean().default(false),
        startDate: Joi.date().iso(),
        endDate: Joi.date().iso().min(Joi.ref('startDate')),
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(20),
        sortBy: Joi.string().default('timestamp'),
        sortOrder: Joi.string().valid('asc', 'desc').default('desc')
      })
    };
  }

  // Escalation validation schemas
  static get escalationSchemas() {
    return {
      create: Joi.object({
        appointmentId: Joi.string().uuid().required(),
        patientId: Joi.string().uuid().required(),
        branchId: Joi.string().uuid().required(),
        escalationType: Joi.string().valid(
          'ABNORMAL_VITALS',
          'PATIENT_DISCOMFORT',
          'EMERGENCY_SITUATION',
          'MEDICATION_REACTION',
          'EQUIPMENT_MALFUNCTION',
          'PATIENT_UNRESPONSIVE',
          'BLEEDING_EXCESSIVE',
          'ALLERGIC_REACTION',
          'PAIN_MANAGEMENT',
          'OTHER'
        ).required(),
        severity: Joi.string().valid('LOW', 'MODERATE', 'HIGH', 'CRITICAL').required(),
        title: Joi.string().min(1).max(200).required(),
        description: Joi.string().min(1).max(1000).required(),
        relatedVitalsId: Joi.string().uuid(),
        relatedCareNoteId: Joi.string().uuid(),
        targetRecipients: Joi.array().items(
          Joi.object({
            userId: Joi.string().uuid().required(),
            userName: Joi.string().required(),
            userRole: Joi.string().required()
          })
        ).min(1).required()
      }),
      
      acknowledge: Joi.object({
        notes: Joi.string().max(500).allow('')
      }),
      
      resolve: Joi.object({
        resolutionNotes: Joi.string().min(1).max(1000).required(),
        followUpRequired: Joi.boolean().default(false),
        followUpDate: Joi.date().iso().when('followUpRequired', {
          is: true,
          then: Joi.required()
        }),
        followUpNotes: Joi.string().max(500).when('followUpRequired', {
          is: true,
          then: Joi.required()
        })
      }),
      
      addAction: Joi.object({
        action: Joi.string().min(1).max(200).required(),
        notes: Joi.string().max(500).allow('')
      }),
      
      query: Joi.object({
        appointmentId: Joi.string().uuid(),
        patientId: Joi.string().uuid(),
        branchId: Joi.string().uuid(),
        escalationType: Joi.string().valid(
          'ABNORMAL_VITALS',
          'PATIENT_DISCOMFORT',
          'EMERGENCY_SITUATION',
          'MEDICATION_REACTION',
          'EQUIPMENT_MALFUNCTION',
          'PATIENT_UNRESPONSIVE',
          'BLEEDING_EXCESSIVE',
          'ALLERGIC_REACTION',
          'PAIN_MANAGEMENT',
          'OTHER'
        ),
        severity: Joi.string().valid('LOW', 'MODERATE', 'HIGH', 'CRITICAL'),
        status: Joi.string().valid('RAISED', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED'),
        startDate: Joi.date().iso(),
        endDate: Joi.date().iso().min(Joi.ref('startDate')),
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(20),
        sortBy: Joi.string().default('timestamp'),
        sortOrder: Joi.string().valid('asc', 'desc').default('desc')
      })
    };
  }

  // Ward monitoring validation schemas
  static get wardMonitoringSchemas() {
    return {
      create: Joi.object({
        appointmentId: Joi.string().uuid().required(),
        patientId: Joi.string().uuid().required(),
        branchId: Joi.string().uuid().required(),
        roomId: Joi.string().uuid().required(),
        chairId: Joi.string().uuid(),
        assignedNurse: Joi.object({
          userId: Joi.string().uuid().required(),
          userName: Joi.string().required()
        }).required(),
        assignedDoctor: Joi.object({
          userId: Joi.string().uuid(),
          userName: Joi.string()
        }),
        careLevel: Joi.string().valid('ROUTINE', 'ENHANCED', 'INTENSIVE', 'CRITICAL').default('ROUTINE'),
        estimatedDuration: Joi.number().integer().min(1).max(480).default(60)
      }),
      
      updateStatus: Joi.object({
        patientStatus: Joi.string().valid(
          'WAITING',
          'IN_PREPARATION',
          'READY_FOR_CONSULTATION',
          'IN_CONSULTATION',
          'PROCEDURE_IN_PROGRESS',
          'POST_PROCEDURE_MONITORING',
          'RECOVERY',
          'READY_FOR_DISCHARGE',
          'DISCHARGED',
          'TRANSFERRED'
        ).required(),
        notes: Joi.string().max(500).allow('')
      }),
      
      addAlert: Joi.object({
        alertType: Joi.string().valid(
          'VITALS_OVERDUE',
          'ABNORMAL_VITALS',
          'PATIENT_CALL',
          'MEDICATION_DUE',
          'DISCHARGE_READY'
        ).required(),
        message: Joi.string().min(1).max(200).required(),
        severity: Joi.string().valid('LOW', 'MODERATE', 'HIGH', 'CRITICAL').default('MODERATE')
      }),
      
      query: Joi.object({
        branchId: Joi.string().uuid(),
        roomId: Joi.string().uuid(),
        nurseId: Joi.string().uuid(),
        doctorId: Joi.string().uuid(),
        patientStatus: Joi.string().valid(
          'WAITING',
          'IN_PREPARATION',
          'READY_FOR_CONSULTATION',
          'IN_CONSULTATION',
          'PROCEDURE_IN_PROGRESS',
          'POST_PROCEDURE_MONITORING',
          'RECOVERY',
          'READY_FOR_DISCHARGE',
          'DISCHARGED',
          'TRANSFERRED'
        ),
        careLevel: Joi.string().valid('ROUTINE', 'ENHANCED', 'INTENSIVE', 'CRITICAL'),
        isActive: Joi.boolean().default(true),
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(20),
        sortBy: Joi.string().default('timestamp'),
        sortOrder: Joi.string().valid('asc', 'desc').default('desc')
      })
    };
  }

  // Nursing task validation schemas
  static get nursingTaskSchemas() {
    return {
      create: Joi.object({
        appointmentId: Joi.string().uuid(),
        patientId: Joi.string().uuid().required(),
        branchId: Joi.string().uuid().required(),
        taskType: Joi.string().valid(
          'VITALS_RECORDING',
          'MEDICATION_ADMINISTRATION',
          'PATIENT_PREPARATION',
          'POST_PROCEDURE_MONITORING',
          'WOUND_CARE',
          'PATIENT_EDUCATION',
          'EQUIPMENT_SETUP',
          'DISCHARGE_PREPARATION',
          'FOLLOW_UP_SCHEDULING',
          'DOCUMENTATION',
          'OTHER'
        ).required(),
        title: Joi.string().min(1).max(200).required(),
        description: Joi.string().min(1).max(1000).required(),
        priority: Joi.string().valid('LOW', 'NORMAL', 'HIGH', 'URGENT').default('NORMAL'),
        assignedTo: Joi.object({
          userId: Joi.string().uuid().required(),
          userName: Joi.string().required()
        }).required(),
        dueDateTime: Joi.date().iso().min('now').required(),
        estimatedDuration: Joi.number().integer().min(1).max(480).default(15)
      }),
      
      update: Joi.object({
        title: Joi.string().min(1).max(200),
        description: Joi.string().min(1).max(1000),
        priority: Joi.string().valid('LOW', 'NORMAL', 'HIGH', 'URGENT'),
        dueDateTime: Joi.date().iso().min('now'),
        estimatedDuration: Joi.number().integer().min(1).max(480)
      }).min(1),
      
      complete: Joi.object({
        completionNotes: Joi.string().max(500).allow(''),
        attachments: Joi.array().items(
          Joi.object({
            fileName: Joi.string().required(),
            fileUrl: Joi.string().uri().required(),
            fileType: Joi.string().required()
          })
        ).max(5)
      }),
      
      query: Joi.object({
        patientId: Joi.string().uuid(),
        branchId: Joi.string().uuid(),
        assignedTo: Joi.string().uuid(),
        taskType: Joi.string().valid(
          'VITALS_RECORDING',
          'MEDICATION_ADMINISTRATION',
          'PATIENT_PREPARATION',
          'POST_PROCEDURE_MONITORING',
          'WOUND_CARE',
          'PATIENT_EDUCATION',
          'EQUIPMENT_SETUP',
          'DISCHARGE_PREPARATION',
          'FOLLOW_UP_SCHEDULING',
          'DOCUMENTATION',
          'OTHER'
        ),
        status: Joi.string().valid('ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'OVERDUE'),
        priority: Joi.string().valid('LOW', 'NORMAL', 'HIGH', 'URGENT'),
        dueSoon: Joi.boolean(),
        overdue: Joi.boolean(),
        startDate: Joi.date().iso(),
        endDate: Joi.date().iso().min(Joi.ref('startDate')),
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(20),
        sortBy: Joi.string().default('timestamp'),
        sortOrder: Joi.string().valid('asc', 'desc').default('desc')
      })
    };
  }
}

module.exports = ValidationMiddleware;