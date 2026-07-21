import express from 'express';
import { getNotifications, markAsRead } from '../controllers/notificationController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All notification routes require authentication
router.use(authenticate);

router.get('/', getNotifications);
router.patch('/:id/read', markAsRead);

export default router;
