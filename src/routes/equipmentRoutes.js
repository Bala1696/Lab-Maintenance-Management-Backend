import express from 'express';
import {
  createEquipment,
  getAllEquipment,
  getEquipmentById,
  updateEquipment,
  deleteEquipment,
  getEquipmentByAssetNumber,
  getEquipmentStats
} from '../controllers/equipmentController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

// GET  /api/equipment/stats   (protected — must be BEFORE /:id to avoid route conflict)
router.get('/stats', authenticate, getEquipmentStats);

// GET  /api/equipment/asset/:assetNumber  (protected)
router.get('/asset/:assetNumber', authenticate, getEquipmentByAssetNumber);

// POST /api/equipment         (admin, hod or technician, optional image upload)
router.post('/', authenticate, authorize(['admin', 'hod', 'technician']), upload.single('image'), createEquipment);

// GET  /api/equipment         (protected)
router.get('/', authenticate, getAllEquipment);

// GET  /api/equipment/:id     (protected)
router.get('/:id', authenticate, getEquipmentById);

// PUT  /api/equipment/:id     (admin, hod or technician, optional image upload)
router.put('/:id', authenticate, authorize(['admin', 'hod', 'technician']), upload.single('image'), updateEquipment);

// DELETE /api/equipment/:id   (admin or hod)
router.delete('/:id', authenticate, authorize(['admin', 'hod']), deleteEquipment);

export default router;
