import express from 'express';
import {
  sendInvitation,
  getAllInvitations,
  validateToken,
  completeRegistration,
  resendInvitation
} from '../controllers/invitationController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// ── Public routes (no auth required) ──────────────────────────────────────
// GET  /api/invitations/validate/:token — Check if invitation token is valid
router.get('/validate/:token', validateToken);

// POST /api/invitations/register/:token — Complete registration using invite
router.post('/register/:token', completeRegistration);

// ── Protected routes ──────────────────────────────────────────────────────
// POST /api/invitations — Send a new invitation (Admin + HOD)
router.post('/', authenticate, authorize(['admin', 'hod']), sendInvitation);

// GET  /api/invitations — List all invitations (Admin + HOD)
router.get('/', authenticate, authorize(['admin', 'hod']), getAllInvitations);

// PUT  /api/invitations/:id/resend — Resend an expired invitation
router.put('/:id/resend', authenticate, authorize(['admin', 'hod']), resendInvitation);

export default router;
