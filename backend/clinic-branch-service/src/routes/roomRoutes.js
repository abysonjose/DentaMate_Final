const express = require('express');
const router = express.Router();
const RoomController = require('../controllers/RoomController');
const auth = require('../middleware/auth');
const validation = require('../middleware/validation');
const { roomValidation } = require('../validators/roomValidator');

// Create room
router.post('/', 
  auth.authenticate,
  auth.authorize(['CENTRAL_ADMIN', 'BRANCH_ADMIN']),
  validation.validate(roomValidation.create),
  RoomController.createRoom
);

// Get room by ID
router.get('/:id',
  auth.authenticate,
  auth.authorize(['CENTRAL_ADMIN', 'BRANCH_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST']),
  validation.validate(roomValidation.getById),
  RoomController.getRoomById
);

// List rooms
router.get('/',
  auth.authenticate,
  auth.authorize(['CENTRAL_ADMIN', 'BRANCH_ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST']),
  validation.validate(roomValidation.list),
  RoomController.listRooms
);

// Update room
router.put('/:id',
  auth.authenticate,
  auth.authorize(['CENTRAL_ADMIN', 'BRANCH_ADMIN']),
  validation.validate(roomValidation.update),
  RoomController.updateRoom
);

// Delete room (soft delete)
router.delete('/:id',
  auth.authenticate,
  auth.authorize(['CENTRAL_ADMIN', 'BRANCH_ADMIN']),
  validation.validate(roomValidation.delete),
  RoomController.deleteRoom
);

// Update room status
router.patch('/:id/status',
  auth.authenticate,
  auth.authorize(['CENTRAL_ADMIN', 'BRANCH_ADMIN', 'NURSE', 'RECEPTIONIST']),
  validation.validate(roomValidation.updateStatus),
  RoomController.updateRoomStatus
);

module.exports = router;