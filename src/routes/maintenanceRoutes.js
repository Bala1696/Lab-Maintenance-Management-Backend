import express from 'express';
import {
  createMaintenance,
  getAllMaintenance,
  getMaintenanceById,
  updateMaintenance,
  deleteMaintenance,
  getMaintenanceStats
} from '../controllers/maintenanceController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// GET  /api/maintenance/stats  (protected — must be BEFORE /:id to avoid route conflict)
router.get('/stats', authenticate, getMaintenanceStats);

// POST /api/maintenance        (protected — any authenticated user can report)
router.post('/', authenticate, createMaintenance);

// GET  /api/maintenance        (protected)
router.get('/', authenticate, getAllMaintenance);

// GET  /api/maintenance/:id    (protected)
router.get('/:id', authenticate, getMaintenanceById);

// PUT  /api/maintenance/:id    (protected — technician/admin can update)
router.put('/:id', authenticate, updateMaintenance);

// DELETE /api/maintenance/:id  (admin only)
router.delete('/:id', authenticate, authorize(['admin']), deleteMaintenance);

export default router;
