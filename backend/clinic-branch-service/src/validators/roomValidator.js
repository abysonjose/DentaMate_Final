const Joi = require('joi');

const roomValidation = {
  create: Joi.object({
    body: Joi.object({
      branchId: Joi.string().uuid().required(),
      departmentId: Joi.string().uuid().required(),
      name: Joi.string().min(2).max(100).required(),
      type: Joi.string().valid('CONSULTATION', 'TREATMENT', 'DIAGNOSTIC', 'SURGERY', 'RECOVERY', 'WAITING').required(),
      capacity: Joi.number().integer().min(1).max(20).default(1),
      equipment: Joi.array().items(Joi.string().max(50)).default([]),
      status: Joi.string().valid('AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'OUT_OF_SERVICE').default('AVAILABLE')
    }).required(),
    params: Joi.object(),
    query: Joi.object()
  }),

  getById: Joi.object({
    params: Joi.object({
      id: Joi.string().uuid().required()
    }).required(),
    body: Joi.object(),
    query: Joi.object()
  }),

  list: Joi.object({
    query: Joi.object({
      branchId: Joi.string().uuid(),
      departmentId: Joi.string().uuid(),
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(10),
      status: Joi.string().valid('AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'OUT_OF_SERVICE'),
      type: Joi.string().valid('CONSULTATION', 'TREATMENT', 'DIAGNOSTIC', 'SURGERY', 'RECOVERY', 'WAITING'),
      search: Joi.string().max(100),
      sortBy: Joi.string().valid('name', 'type', 'status', 'createdAt', 'updatedAt').default('createdAt'),
      sortOrder: Joi.string().valid('asc', 'desc').default('desc')
    }),
    params: Joi.object(),
    body: Joi.object()
  }),

  update: Joi.object({
    params: Joi.object({
      id: Joi.string().uuid().required()
    }).required(),
    body: Joi.object({
      name: Joi.string().min(2).max(100),
      type: Joi.string().valid('CONSULTATION', 'TREATMENT', 'DIAGNOSTIC', 'SURGERY', 'RECOVERY', 'WAITING'),
      capacity: Joi.number().integer().min(1).max(20),
      equipment: Joi.array().items(Joi.string().max(50)),
      status: Joi.string().valid('AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'OUT_OF_SERVICE')
    }).min(1).required(),
    query: Joi.object()
  }),

  updateStatus: Joi.object({
    params: Joi.object({
      id: Joi.string().uuid().required()
    }).required(),
    body: Joi.object({
      status: Joi.string().valid('AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'OUT_OF_SERVICE').required(),
      reason: Joi.string().max(200)
    }).required(),
    query: Joi.object()
  }),

  delete: Joi.object({
    params: Joi.object({
      id: Joi.string().uuid().required()
    }).required(),
    body: Joi.object(),
    query: Joi.object()
  })
};

module.exports = { roomValidation };