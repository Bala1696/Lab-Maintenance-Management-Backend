import express from 'express';
import {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  assignLabRoom,
  resetUserPassword
} from '../controllers/userController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
// POST   /api/users           — Admin creates HOD/technician; HOD creates technician
router.post('/', authenticate, authorize(['admin', 'hod']), createUser);

// GET    /api/users           — Admin: all users; HOD: their dept's technicians
router.get('/', authenticate, authorize(['admin', 'hod']), getAllUsers);

// GET    /api/users/:id
router.get('/:id', authenticate, authorize(['admin', 'hod']), getUserById);

// PUT    /api/users/:id
router.put('/:id', authenticate, authorize(['admin', 'hod']), updateUser);

// DELETE /api/users/:id      — Soft deactivate
router.delete('/:id', authenticate, authorize(['admin', 'hod']), deleteUser);

// PUT    /api/users/:id/assign-lab — Assign a technician to a lab room
router.put('/:id/assign-lab', authenticate, authorize(['admin', 'hod']), assignLabRoom);

// PUT    /api/users/:id/reset-password — Admin only
router.put('/:id/reset-password', authenticate, authorize(['admin']), resetUserPassword);

export default router;
