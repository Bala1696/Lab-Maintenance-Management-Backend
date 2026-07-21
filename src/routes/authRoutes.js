import express from 'express';
import {
  registerUser,
  loginUser,
  getCurrentUser,
  logoutUser,
  updateProfile
} from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// POST /api/auth/register
router.post('/register', registerUser);

// POST /api/auth/login
router.post('/login', loginUser);

// GET /api/auth/me  (protected)
router.get('/me', authenticate, getCurrentUser);

// PUT /api/auth/profile (protected)
router.put('/profile', authenticate, updateProfile);

// POST /api/auth/logout  (protected)
router.post('/logout', authenticate, logoutUser);

export default router;
