const Joi = require('joi');

const departmentValidation = {
  create: Joi.object({
    body: Joi.object({
      branchId: Joi.string().uuid().required(),
      name: Joi.string().min(2).max(100).required(),
      type: Joi.string().valid('GENERAL', 'ORTHODONTICS', 'SURGERY', 'DIAGNOSTICS', 'PEDIATRIC', 'PERIODONTICS', 'ENDODONTICS', 'ORAL_SURGERY').required(),
      description: Joi.string().max(500),
      status: Joi.string().valid('ACTIVE', 'INACTIVE').default('ACTIVE')
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
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(10),
      status: Joi.string().valid('ACTIVE', 'INACTIVE'),
      type: Joi.string().valid('GENERAL', 'ORTHODONTICS', 'SURGERY', 'DIAGNOSTICS', 'PEDIATRIC', 'PERIODONTICS', 'ENDODONTICS', 'ORAL_SURGERY'),
      search: Joi.string().max(100),
      sortBy: Joi.string().valid('name', 'type', 'createdAt', 'updatedAt').default('createdAt'),
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
      type: Joi.string().valid('GENERAL', 'ORTHODONTICS', 'SURGERY', 'DIAGNOSTICS', 'PEDIATRIC', 'PERIODONTICS', 'ENDODONTICS', 'ORAL_SURGERY'),
      description: Joi.string().max(500),
      status: Joi.string().valid('ACTIVE', 'INACTIVE')
    }).min(1).required(),
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

module.exports = { departmentValidation };