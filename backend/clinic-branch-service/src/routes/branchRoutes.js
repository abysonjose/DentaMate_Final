const express = require('express');
const router = express.Router();
const BranchController = require('../controllers/BranchController');
const auth = require('../middleware/auth');
const validation = require('../middleware/validation');
const { branchValidation } = require('../validators/branchValidator');

// Create branch
router.post('/', 
  auth.authenticate,
  auth.authorize(['CENTRAL_ADMIN']),
  validation.validate(branchValidation.create),
  BranchController.createBranch
);

// Get branch by ID
router.get('/:id',
  auth.authenticate,
  auth.authorize(['CENTRAL_ADMIN', 'BRANCH_ADMIN', 'SAAS_ADMIN']),
  validation.validate(branchValidation.getById),
  BranchController.getBranchById
);

// List branches
router.get('/',
  auth.authenticate,
  auth.authorize(['CENTRAL_ADMIN', 'BRANCH_ADMIN', 'SAAS_ADMIN']),
  validation.validate(branchValidation.list),
  BranchController.listBranches
);

// Update branch
router.put('/:id',
  auth.authenticate,
  auth.authorize(['CENTRAL_ADMIN', 'BRANCH_ADMIN']),
  validation.validate(branchValidation.update),
  BranchController.updateBranch
);

// Delete branch (soft delete)
router.delete('/:id',
  auth.authenticate,
  auth.authorize(['CENTRAL_ADMIN']),
  validation.validate(branchValidation.delete),
  BranchController.deleteBranch
);

module.exports = router;