import express from 'express';
import {
  bulkGenerateSystems,
  getEquipmentConfigById,
  createEquipmentConfig,
  updateEquipmentConfig,
  deleteEquipmentConfig
} from '../controllers/equipmentConfigController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// POST /api/equipment-configurations/bulk-generate
router.post('/bulk-generate', authorize(['admin', 'hod', 'technician']), bulkGenerateSystems);

// GET /api/equipment-configurations/:id
router.get('/:id', getEquipmentConfigById);

// POST /api/equipment-configurations
router.post('/', authorize(['admin', 'hod', 'technician']), createEquipmentConfig);

// PUT /api/equipment-configurations/:id
router.put('/:id', authorize(['admin', 'hod', 'technician']), updateEquipmentConfig);

// DELETE /api/equipment-configurations/:id
router.delete('/:id', authorize(['admin', 'hod']), deleteEquipmentConfig);

export default router;
