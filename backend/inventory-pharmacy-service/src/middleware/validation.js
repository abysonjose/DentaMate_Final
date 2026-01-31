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
          const errors = error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message,
            value: detail.context?.value
          }));

          logger.warn('Validation failed', {
            endpoint: req.originalUrl,
            method: req.method,
            errors,
            userId: req.user?.userId
          });

          return res.status(400).json({
            success: false,
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            errors
          });
        }

        // Replace the original data with validated and sanitized data
        req[property] = value;
        next();
      } catch (validationError) {
        logger.error('Validation middleware error:', validationError);
        return res.status(500).json({
          success: false,
          message: 'Validation error',
          code: 'VALIDATION_ERROR'
        });
      }
    };
  }

  // Common validation schemas
  static get commonSchemas() {
    return {
      objectId: Joi.string().pattern(/^[a-fA-F0-9]{24}$/).message('Invalid ObjectId format'),
      uuid: Joi.string().uuid().message('Invalid UUID format'),
      tenantId: Joi.string().required().min(1).max(100),
      branchId: Joi.string().required().min(1).max(100),
      userId: Joi.string().required().min(1).max(100),
      pagination: Joi.object({
        page: Joi.number().integer().min(1).default(1),
        limit: Joi.number().integer().min(1).max(100).default(20),
        sortBy: Joi.string().default('createdAt'),
        sortOrder: Joi.string().valid('asc', 'desc').default('desc')
      }),
      dateRange: Joi.object({
        from: Joi.date().iso(),
        to: Joi.date().iso().min(Joi.ref('from'))
      })
    };
  }

  // Medicine validation schemas
  static get medicineSchemas() {
    return {
      createMedicine: Joi.object({
        name: Joi.string().required().min(2).max(200).trim(),
        genericName: Joi.string().required().min(2).max(200).trim(),
        brandName: Joi.string().optional().max(200).trim(),
        strength: Joi.string().required().min(1).max(50).trim(),
        form: Joi.string().required().valid(
          'tablet', 'capsule', 'syrup', 'injection', 'cream', 
          'ointment', 'drops', 'spray', 'powder', 'gel'
        ),
        category: Joi.string().required().valid(
          'antibiotic', 'painkiller', 'antiseptic', 'anesthetic', 
          'anti-inflammatory', 'vitamin', 'supplement', 'other'
        ),
        manufacturer: Joi.string().required().min(2).max(200).trim(),
        description: Joi.string().optional().max(1000).trim(),
        dosageInstructions: Joi.string().optional().max(500).trim(),
        sideEffects: Joi.array().items(Joi.string().max(200).trim()),
        contraindications: Joi.array().items(Joi.string().max(200).trim()),
        storageConditions: Joi.object({
          temperature: Joi.object({
            min: Joi.number(),
            max: Joi.number().greater(Joi.ref('min')),
            unit: Joi.string().valid('celsius', 'fahrenheit').default('celsius')
          }),
          humidity: Joi.object({
            max: Joi.number().min(0).max(100),
            unit: Joi.string().default('percentage')
          }),
          specialConditions: Joi.array().items(Joi.string().max(100))
        }),
        unitOfMeasure: Joi.string().required().valid(
          'piece', 'ml', 'mg', 'g', 'bottle', 'vial', 'tube', 'pack'
        ),
        minimumStockLevel: Joi.number().integer().min(0).default(10),
        isControlled: Joi.boolean().default(false),
        requiresPrescription: Joi.boolean().default(true)
      }),

      updateMedicine: Joi.object({
        name: Joi.string().min(2).max(200).trim(),
        genericName: Joi.string().min(2).max(200).trim(),
        brandName: Joi.string().max(200).trim().allow(''),
        strength: Joi.string().min(1).max(50).trim(),
        form: Joi.string().valid(
          'tablet', 'capsule', 'syrup', 'injection', 'cream', 
          'ointment', 'drops', 'spray', 'powder', 'gel'
        ),
        category: Joi.string().valid(
          'antibiotic', 'painkiller', 'antiseptic', 'anesthetic', 
          'anti-inflammatory', 'vitamin', 'supplement', 'other'
        ),
        manufacturer: Joi.string().min(2).max(200).trim(),
        description: Joi.string().max(1000).trim().allow(''),
        dosageInstructions: Joi.string().max(500).trim().allow(''),
        sideEffects: Joi.array().items(Joi.string().max(200).trim()),
        contraindications: Joi.array().items(Joi.string().max(200).trim()),
        storageConditions: Joi.object({
          temperature: Joi.object({
            min: Joi.number(),
            max: Joi.number().greater(Joi.ref('min')),
            unit: Joi.string().valid('celsius', 'fahrenheit')
          }),
          humidity: Joi.object({
            max: Joi.number().min(0).max(100),
            unit: Joi.string()
          }),
          specialConditions: Joi.array().items(Joi.string().max(100))
        }),
        unitOfMeasure: Joi.string().valid(
          'piece', 'ml', 'mg', 'g', 'bottle', 'vial', 'tube', 'pack'
        ),
        minimumStockLevel: Joi.number().integer().min(0),
        isActive: Joi.boolean(),
        isControlled: Joi.boolean(),
        requiresPrescription: Joi.boolean()
      }).min(1),

      searchMedicines: Joi.object({
        search: Joi.string().min(1).max(200).trim(),
        category: Joi.string().valid(
          'antibiotic', 'painkiller', 'antiseptic', 'anesthetic', 
          'anti-inflammatory', 'vitamin', 'supplement', 'other'
        ),
        form: Joi.string().valid(
          'tablet', 'capsule', 'syrup', 'injection', 'cream', 
          'ointment', 'drops', 'spray', 'powder', 'gel'
        ),
        isActive: Joi.boolean(),
        requiresPrescription: Joi.boolean(),
        ...ValidationMiddleware.commonSchemas.pagination
      })
    };
  }

  // Stock validation schemas
  static get stockSchemas() {
    return {
      addStock: Joi.object({
        medicineId: Joi.string().required(),
        branchId: ValidationMiddleware.commonSchemas.branchId,
        batchNumber: Joi.string().required().min(1).max(50).trim(),
        quantity: Joi.number().integer().required().min(1),
        unitCost: Joi.number().required().min(0),
        expiryDate: Joi.date().required().greater('now'),
        manufacturingDate: Joi.date().required().less(Joi.ref('expiryDate')),
        vendorId: Joi.string().required(),
        purchaseOrderId: Joi.string().optional(),
        location: Joi.object({
          shelf: Joi.string().max(20),
          rack: Joi.string().max(20),
          position: Joi.string().max(20)
        }),
        qualityCheck: Joi.object({
          status: Joi.string().valid('pending', 'passed', 'failed').default('pending'),
          notes: Joi.string().max(500)
        })
      }),

      updateStock: Joi.object({
        quantity: Joi.number().integer().min(0),
        unitCost: Joi.number().min(0),
        location: Joi.object({
          shelf: Joi.string().max(20),
          rack: Joi.string().max(20),
          position: Joi.string().max(20)
        }),
        status: Joi.string().valid('active', 'expired', 'damaged', 'recalled', 'reserved'),
        qualityCheck: Joi.object({
          status: Joi.string().valid('pending', 'passed', 'failed'),
          notes: Joi.string().max(500)
        })
      }).min(1),

      adjustStock: Joi.object({
        stockId: Joi.string().required(),
        adjustmentType: Joi.string().required().valid('increase', 'decrease'),
        quantity: Joi.number().integer().required().min(1),
        reason: Joi.string().required().min(5).max(200),
        reference: Joi.string().optional().max(100)
      }),

      stockQuery: Joi.object({
        medicineId: Joi.string(),
        branchId: ValidationMiddleware.commonSchemas.branchId,
        status: Joi.string().valid('active', 'expired', 'damaged', 'recalled', 'reserved'),
        lowStock: Joi.boolean(),
        expiring: Joi.boolean(),
        expiryDays: Joi.number().integer().min(1).max(365).default(30),
        ...ValidationMiddleware.commonSchemas.pagination
      })
    };
  }

  // Dispensing validation schemas
  static get dispensingSchemas() {
    return {
      createDispense: Joi.object({
        prescriptionId: Joi.string().required(),
        patientId: Joi.string().required(),
        doctorId: Joi.string().required(),
        branchId: ValidationMiddleware.commonSchemas.branchId,
        medicines: Joi.array().required().min(1).items(
          Joi.object({
            medicineId: Joi.string().required(),
            quantityPrescribed: Joi.number().integer().required().min(1),
            quantityDispensed: Joi.number().integer().required().min(1).max(Joi.ref('quantityPrescribed')),
            dosageInstructions: Joi.string().max(500),
            substituted: Joi.boolean().default(false),
            substitutionReason: Joi.string().when('substituted', {
              is: true,
              then: Joi.required().min(5).max(200),
              otherwise: Joi.optional()
            }),
            originalMedicineId: Joi.string().when('substituted', {
              is: true,
              then: Joi.required(),
              otherwise: Joi.optional()
            })
          })
        ),
        paymentStatus: Joi.string().required().valid('pending', 'cleared', 'failed'),
        paymentReference: Joi.string().when('paymentStatus', {
          is: 'cleared',
          then: Joi.required(),
          otherwise: Joi.optional()
        }),
        billingId: Joi.string().optional(),
        dispensingNotes: Joi.string().max(500),
        patientInstructions: Joi.string().max(1000),
        counselingProvided: Joi.boolean().default(false),
        counselingNotes: Joi.string().max(500)
      }),

      updateDispense: Joi.object({
        status: Joi.string().valid('pending', 'dispensed', 'partially_dispensed', 'cancelled', 'returned'),
        dispensingNotes: Joi.string().max(500),
        patientInstructions: Joi.string().max(1000),
        counselingProvided: Joi.boolean(),
        counselingNotes: Joi.string().max(500)
      }).min(1),

      returnMedicines: Joi.object({
        reason: Joi.string().required().min(5).max(200),
        returnedMedicines: Joi.array().required().min(1).items(
          Joi.object({
            medicineId: Joi.string().required(),
            quantity: Joi.number().integer().required().min(1),
            condition: Joi.string().required().valid('unopened', 'opened', 'damaged')
          })
        )
      }),

      dispenseQuery: Joi.object({
        patientId: Joi.string(),
        doctorId: Joi.string(),
        prescriptionId: Joi.string(),
        status: Joi.string().valid('pending', 'dispensed', 'partially_dispensed', 'cancelled', 'returned'),
        paymentStatus: Joi.string().valid('pending', 'cleared', 'failed'),
        branchId: ValidationMiddleware.commonSchemas.branchId,
        ...ValidationMiddleware.commonSchemas.dateRange,
        ...ValidationMiddleware.commonSchemas.pagination
      })
    };
  }

  // Vendor validation schemas
  static get vendorSchemas() {
    return {
      createVendor: Joi.object({
        name: Joi.string().required().min(2).max(200).trim(),
        companyName: Joi.string().required().min(2).max(200).trim(),
        licenseNumber: Joi.string().required().min(5).max(50).trim(),
        contactPerson: Joi.object({
          name: Joi.string().required().min(2).max(100).trim(),
          designation: Joi.string().max(100).trim(),
          phone: Joi.string().required().pattern(/^[+]?[\d\s\-\(\)]{10,15}$/),
          email: Joi.string().required().email().lowercase(),
          alternatePhone: Joi.string().pattern(/^[+]?[\d\s\-\(\)]{10,15}$/),
          alternateEmail: Joi.string().email().lowercase()
        }).required(),
        address: Joi.object({
          street: Joi.string().required().min(5).max(200).trim(),
          city: Joi.string().required().min(2).max(100).trim(),
          state: Joi.string().required().min(2).max(100).trim(),
          country: Joi.string().required().min(2).max(100).trim(),
          postalCode: Joi.string().required().min(3).max(20).trim()
        }).required(),
        businessDetails: Joi.object({
          gstNumber: Joi.string().pattern(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/),
          panNumber: Joi.string().pattern(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/),
          drugLicenseNumber: Joi.string().max(50),
          establishmentYear: Joi.number().integer().min(1900).max(new Date().getFullYear()),
          businessType: Joi.string().required().valid('manufacturer', 'distributor', 'wholesaler', 'retailer')
        }),
        bankDetails: Joi.object({
          accountName: Joi.string().max(200),
          accountNumber: Joi.string().max(50),
          bankName: Joi.string().max(200),
          branchName: Joi.string().max(200),
          ifscCode: Joi.string().pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/),
          swiftCode: Joi.string().max(20)
        }),
        paymentTerms: Joi.object({
          creditDays: Joi.number().integer().min(0).max(365).default(30),
          paymentMethod: Joi.string().valid('cash', 'cheque', 'bank_transfer', 'online', 'credit').default('bank_transfer'),
          discountPercentage: Joi.number().min(0).max(100).default(0)
        }),
        specializations: Joi.array().items(
          Joi.string().valid('antibiotics', 'painkillers', 'dental_supplies', 'surgical_instruments', 'anesthetics', 'vitamins', 'general_medicines')
        ),
        notes: Joi.string().max(1000),
        tags: Joi.array().items(Joi.string().max(50)),
        isPreferred: Joi.boolean().default(false)
      }),

      updateVendor: Joi.object({
        name: Joi.string().min(2).max(200).trim(),
        companyName: Joi.string().min(2).max(200).trim(),
        contactPerson: Joi.object({
          name: Joi.string().min(2).max(100).trim(),
          designation: Joi.string().max(100).trim(),
          phone: Joi.string().pattern(/^[+]?[\d\s\-\(\)]{10,15}$/),
          email: Joi.string().email().lowercase(),
          alternatePhone: Joi.string().pattern(/^[+]?[\d\s\-\(\)]{10,15}$/),
          alternateEmail: Joi.string().email().lowercase()
        }),
        address: Joi.object({
          street: Joi.string().min(5).max(200).trim(),
          city: Joi.string().min(2).max(100).trim(),
          state: Joi.string().min(2).max(100).trim(),
          country: Joi.string().min(2).max(100).trim(),
          postalCode: Joi.string().min(3).max(20).trim()
        }),
        businessDetails: Joi.object({
          gstNumber: Joi.string().pattern(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/),
          panNumber: Joi.string().pattern(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/),
          drugLicenseNumber: Joi.string().max(50),
          establishmentYear: Joi.number().integer().min(1900).max(new Date().getFullYear()),
          businessType: Joi.string().valid('manufacturer', 'distributor', 'wholesaler', 'retailer')
        }),
        paymentTerms: Joi.object({
          creditDays: Joi.number().integer().min(0).max(365),
          paymentMethod: Joi.string().valid('cash', 'cheque', 'bank_transfer', 'online', 'credit'),
          discountPercentage: Joi.number().min(0).max(100)
        }),
        specializations: Joi.array().items(
          Joi.string().valid('antibiotics', 'painkillers', 'dental_supplies', 'surgical_instruments', 'anesthetics', 'vitamins', 'general_medicines')
        ),
        status: Joi.string().valid('active', 'inactive', 'suspended', 'blacklisted'),
        notes: Joi.string().max(1000),
        tags: Joi.array().items(Joi.string().max(50)),
        isPreferred: Joi.boolean()
      }).min(1),

      vendorQuery: Joi.object({
        search: Joi.string().min(1).max(200),
        status: Joi.string().valid('active', 'inactive', 'suspended', 'blacklisted'),
        businessType: Joi.string().valid('manufacturer', 'distributor', 'wholesaler', 'retailer'),
        isPreferred: Joi.boolean(),
        specialization: Joi.string().valid('antibiotics', 'painkillers', 'dental_supplies', 'surgical_instruments', 'anesthetics', 'vitamins', 'general_medicines'),
        ...ValidationMiddleware.commonSchemas.pagination
      })
    };
  }

  // Restock request validation schemas
  static get restockSchemas() {
    return {
      createRestockRequest: Joi.object({
        branchId: ValidationMiddleware.commonSchemas.branchId,
        requestType: Joi.string().required().valid('manual', 'auto_low_stock', 'auto_expiry', 'emergency'),
        priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium'),
        medicines: Joi.array().required().min(1).items(
          Joi.object({
            medicineId: Joi.string().required(),
            currentStock: Joi.number().integer().required().min(0),
            minimumRequired: Joi.number().integer().required().min(1),
            requestedQuantity: Joi.number().integer().required().min(1),
            estimatedCost: Joi.number().min(0),
            preferredVendorId: Joi.string(),
            alternateVendorIds: Joi.array().items(Joi.string()),
            urgencyReason: Joi.string().max(200),
            notes: Joi.string().max(500)
          })
        ),
        vendorId: Joi.string(),
        notes: Joi.string().max(1000)
      }),

      updateRestockRequest: Joi.object({
        priority: Joi.string().valid('low', 'medium', 'high', 'urgent'),
        vendorId: Joi.string(),
        medicines: Joi.array().items(
          Joi.object({
            medicineId: Joi.string().required(),
            requestedQuantity: Joi.number().integer().min(1),
            approvedQuantity: Joi.number().integer().min(0),
            estimatedCost: Joi.number().min(0),
            notes: Joi.string().max(500)
          })
        ),
        notes: Joi.string().max(1000)
      }).min(1),

      approveRestockRequest: Joi.object({
        comments: Joi.string().max(500),
        approvedAmount: Joi.number().min(0)
      }),

      rejectRestockRequest: Joi.object({
        reason: Joi.string().required().min(5).max(500)
      }),

      receiveItems: Joi.object({
        receivedItems: Joi.array().required().min(1).items(
          Joi.object({
            medicineId: Joi.string().required(),
            receivedQuantity: Joi.number().integer().required().min(1),
            batchNumber: Joi.string().required().min(1).max(50),
            expiryDate: Joi.date().required().greater('now'),
            condition: Joi.string().required().valid('good', 'damaged', 'expired', 'defective'),
            notes: Joi.string().max(500)
          })
        )
      }),

      restockQuery: Joi.object({
        branchId: ValidationMiddleware.commonSchemas.branchId,
        status: Joi.string().valid('pending', 'approved', 'rejected', 'ordered', 'partially_received', 'completed', 'cancelled'),
        requestType: Joi.string().valid('manual', 'auto_low_stock', 'auto_expiry', 'emergency'),
        priority: Joi.string().valid('low', 'medium', 'high', 'urgent'),
        vendorId: Joi.string(),
        ...ValidationMiddleware.commonSchemas.dateRange,
        ...ValidationMiddleware.commonSchemas.pagination
      })
    };
  }
}

module.exports = ValidationMiddleware;