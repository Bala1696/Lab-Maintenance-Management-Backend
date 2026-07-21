import express from 'express';
import { getDepartments, getLabRooms, getTechnicians } from '../controllers/metaController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Public — used in login-free dropdowns (e.g., equipment form before auth check)
router.get('/departments', getDepartments);

// Auth required so HOD scoping works
router.get('/lab-rooms', authenticate, getLabRooms);
router.get('/technicians', authenticate, getTechnicians);

export default router;
