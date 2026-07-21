/**
 * Routes Index — Central API router hub.
 * Mounts each domain's dedicated router under its own prefix.
 *
 * Domain routers:
 *   /api/auth        → authRoutes.js
 *   /api/equipment   → equipmentRoutes.js
 *   /api/maintenance → maintenanceRoutes.js
 *   /api/departments → departmentRoutes.js
 *   /api/users       → userRoutes.js
 *   /api/lab-rooms   → labRoomRoutes.js
 *   /api/meta        → metaRoutes.js
 */

import express from 'express';
import authRoutes from './authRoutes.js';
import equipmentRoutes from './equipmentRoutes.js';
import maintenanceRoutes from './maintenanceRoutes.js';
import metaRoutes from './metaRoutes.js';
import departmentRoutes from './departmentRoutes.js';
import userRoutes from './userRoutes.js';
import labRoomRoutes from './labRoomRoutes.js';
import invitationRoutes from './invitationRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import equipmentConfigRoutes from './equipmentConfigRoutes.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/equipment', equipmentRoutes);
router.use('/maintenance', maintenanceRoutes);
router.use('/meta', metaRoutes);
router.use('/departments', departmentRoutes);
router.use('/users', userRoutes);
router.use('/lab-rooms', labRoomRoutes);
router.use('/invitations', invitationRoutes);
router.use('/notifications', notificationRoutes);
router.use('/equipment-configurations', equipmentConfigRoutes);

export default router;
