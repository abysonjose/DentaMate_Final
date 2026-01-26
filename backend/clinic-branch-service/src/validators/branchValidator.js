const Joi = require('joi');

const branchValidation = {
  create: Joi.object({
    body: Joi.object({
      clinicId: Joi.string().uuid().required(),
      name: Joi.string().min(2).max(100).required(),
      address: Joi.object({
        street: Joi.string().min(5).max(200).required(),
        city: Joi.string().min(2).max(50).required(),
        state: Joi.string().min(2).max(50).required(),
        pincode: Joi.string().pattern(/^\d{6}$/).required(),
        country: Joi.string().min(2).max(50).default('India')
      }).required(),
      timezone: Joi.string().default('Asia/Kolkata'),
      contactInfo: Joi.object({
        phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).required(),
        email: Joi.string().email().required()
      }).required(),
      status: Joi.string().valid('ACTIVE', 'SUSPENDED', 'INACTIVE').default('ACTIVE')
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
      clinicId: Joi.string().uuid(),
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(10),
      status: Joi.string().valid('ACTIVE', 'SUSPENDED', 'INACTIVE'),
      search: Joi.string().max(100),
      city: Joi.string().max(50),
      state: Joi.string().max(50),
      sortBy: Joi.string().valid('name', 'city', 'createdAt', 'updatedAt').default('createdAt'),
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
      address: Joi.object({
        street: Joi.string().min(5).max(200),
        city: Joi.string().min(2).max(50),
        state: Joi.string().min(2).max(50),
        pincode: Joi.string().pattern(/^\d{6}$/),
        country: Joi.string().min(2).max(50)
      }),
      timezone: Joi.string(),
      contactInfo: Joi.object({
        phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/),
        email: Joi.string().email()
      }),
      status: Joi.string().valid('ACTIVE', 'SUSPENDED', 'INACTIVE')
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

module.exports = { branchValidation };