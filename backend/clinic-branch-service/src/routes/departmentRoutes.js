const express = require('express');
const router = express.Router();
const DepartmentController = require('../controllers/DepartmentController');
const auth = require('../middleware/auth');
const validation = require('../middleware/validation');
const { departmentValidation } = require('../validators/departmentValidator');

// Create department
router.post('/', 
  auth.authenticate,
  auth.authorize(['CENTRAL_ADMIN', 'BRANCH_ADMIN']),
  validation.validate(departmentValidation.create),
  DepartmentController.createDepartment
);

// Get department by ID
router.get('/:id',
  auth.authenticate,
  auth.authorize(['CENTRAL_ADMIN', 'BRANCH_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST']),
  validation.validate(departmentValidation.getById),
  DepartmentController.getDepartmentById
);

// List departments
router.get('/',
  auth.authenticate,
  auth.authorize(['CENTRAL_ADMIN', 'BRANCH_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST']),
  validation.validate(departmentValidation.list),
  DepartmentController.listDepartments
);

// Update department
router.put('/:id',
  auth.authenticate,
  auth.authorize(['CENTRAL_ADMIN', 'BRANCH_ADMIN']),
  validation.validate(departmentValidation.update),
  DepartmentController.updateDepartment
);

// Delete department (soft delete)
router.delete('/:id',
  auth.authenticate,
  auth.authorize(['CENTRAL_ADMIN', 'BRANCH_ADMIN']),
  validation.validate(departmentValidation.delete),
  DepartmentController.deleteDepartment
);

module.exports = router;