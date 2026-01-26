const Joi = require('joi');

const workingHoursValidation = {
  create: Joi.object({
    body: Joi.object({
      branchId: Joi.string().uuid().required(),
      departmentId: Joi.string().uuid().allow(null),
      dayOfWeek: Joi.string().valid('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY').required(),
      openTime: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
      closeTime: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
      isHoliday: Joi.boolean().default(false),
      holidayName: Joi.string().max(100).when('isHoliday', {
        is: true,
        then: Joi.required(),
        otherwise: Joi.allow(null)
      }),
      effectiveDate: Joi.date().iso().when('isHoliday', {
        is: true,
        then: Joi.required(),
        otherwise: Joi.allow(null)
      })
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
      dayOfWeek: Joi.string().valid('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'),
      isHoliday: Joi.boolean(),
      effectiveDate: Joi.date().iso(),
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number().integer().min(1).max(100).default(10),
      sortBy: Joi.string().valid('dayOfWeek', 'openTime', 'effectiveDate', 'createdAt').default('dayOfWeek'),
      sortOrder: Joi.string().valid('asc', 'desc').default('asc')
    }),
    params: Joi.object(),
    body: Joi.object()
  }),

  update: Joi.object({
    params: Joi.object({
      id: Joi.string().uuid().required()
    }).required(),
    body: Joi.object({
      dayOfWeek: Joi.string().valid('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'),
      openTime: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
      closeTime: Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
      isHoliday: Joi.boolean(),
      holidayName: Joi.string().max(100).when('isHoliday', {
        is: true,
        then: Joi.required(),
        otherwise: Joi.allow(null)
      }),
      effectiveDate: Joi.date().iso().when('isHoliday', {
        is: true,
        then: Joi.required(),
        otherwise: Joi.allow(null)
      })
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

module.exports = { workingHoursValidation };