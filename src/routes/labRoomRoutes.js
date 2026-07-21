import express from 'express';
import {
  createLabRoom,
  getAllLabRooms,
  getLabRoomById,
  updateLabRoom,
  deleteLabRoom
} from '../controllers/labRoomController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

// POST   /api/lab-rooms        — Admin or HOD
router.post('/', authenticate, authorize(['admin', 'hod']), upload.single('labImage'), createLabRoom);

// GET    /api/lab-rooms        — Admin: all; HOD: dept-scoped
router.get('/', authenticate, authorize(['admin', 'hod']), getAllLabRooms);

// GET    /api/lab-rooms/:id
router.get('/:id', authenticate, authorize(['admin', 'hod']), getLabRoomById);

// PUT    /api/lab-rooms/:id
router.put('/:id', authenticate, authorize(['admin', 'hod']), upload.single('labImage'), updateLabRoom);

// DELETE /api/lab-rooms/:id
router.delete('/:id', authenticate, authorize(['admin', 'hod']), deleteLabRoom);

export default router;
