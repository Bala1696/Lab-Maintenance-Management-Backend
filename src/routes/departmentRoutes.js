import express from 'express';
import {
  createDepartment,
  getAllDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment
} from '../controllers/departmentController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Admin-only mutations
router.post('/', authenticate, authorize(['admin']), createDepartment);
router.put('/:id', authenticate, authorize(['admin']), updateDepartment);
router.delete('/:id', authenticate, authorize(['admin']), deleteDepartment);

// Admin can list all; HOD can read (used in their dashboard/profile context)
router.get('/', authenticate, authorize(['admin']), getAllDepartments);
router.get('/:id', authenticate, authorize(['admin', 'hod']), getDepartmentById);

export default router;
