import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';
import { Invitation, User, Department } from '../models/index.js';
import { hashPassword, generateToken } from '../middleware/auth.js';
import { sendInvitationEmail } from '../services/emailService.js';

// ─── Send Invitation ────────────────────────────────────────────────────────
// Admin → can invite hod / technician
// HOD   → can only invite technician (scoped to their dept)
export const sendInvitation = async (req, res) => {
  try {
    const { email, role, departmentId } = req.body;
    const caller = req.user; // { userId, role }

    if (!email || !role) {
      return res.status(400).json({ message: 'Email and role are required' });
    }

    if (!['hod', 'technician'].includes(role)) {
      return res.status(400).json({ message: 'Role must be hod or technician' });
    }

    // Role-based rules
    if (caller.role === 'hod') {
      if (role !== 'technician') {
        return res.status(403).json({ message: 'HOD can only invite technicians' });
      }
      const hodUser = await User.findByPk(caller.userId);
      if (String(departmentId) !== String(hodUser.departmentId)) {
        return res.status(403).json({ message: 'HOD can only invite users to their own department' });
      }
    }

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'A user with this email already exists' });
    }

    // Check if there's already a pending invitation for this email
    const existingInvite = await Invitation.findOne({
      where: {
        email,
        status: 'pending',
        expiresAt: { [Op.gt]: new Date() }
      }
    });
    if (existingInvite) {
      return res.status(400).json({ message: 'A pending invitation already exists for this email' });
    }

    // Generate token and expiry (48 hours)
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    // Create invitation record
    const invitation = await Invitation.create({
      email,
      role,
      departmentId: departmentId || null,
      token,
      expiresAt,
      status: 'pending',
      invitedBy: caller.userId
    });

    // Get inviter name for the email
    const inviter = await User.findByPk(caller.userId, { attributes: ['name'] });

    // Send email
    try {
      await sendInvitationEmail(email, token, role, inviter?.name);
    } catch (emailError) {
      console.error('❌ Email sending failed:', emailError.message);
      // Still return success — invitation is created, email may retry
      return res.status(201).json({
        message: 'Invitation created but email failed to send. Check SMTP settings.',
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role,
          status: invitation.status,
          expiresAt: invitation.expiresAt
        },
        emailError: emailError.message
      });
    }

    res.status(201).json({
      message: 'Invitation sent successfully',
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        expiresAt: invitation.expiresAt
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error sending invitation', error: error.message });
  }
};

// ─── Get All Invitations ────────────────────────────────────────────────────
export const getAllInvitations = async (req, res) => {
  try {
    const caller = req.user;
    let where = {};

    if (caller.role === 'hod') {
      const hodUser = await User.findByPk(caller.userId);
      where = { departmentId: hodUser.departmentId };
    }

    const invitations = await Invitation.findAll({
      where,
      include: [
        { model: Department, as: 'department', attributes: ['departmentName', 'departmentCode'] },
        { model: User, as: 'inviter', attributes: ['name', 'email'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Auto-expire old invitations
    const now = new Date();
    for (const inv of invitations) {
      if (inv.status === 'pending' && inv.expiresAt < now) {
        inv.status = 'expired';
        await inv.save();
      }
    }

    res.json({ invitations });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching invitations', error: error.message });
  }
};

// ─── Validate Token (Public) ────────────────────────────────────────────────
export const validateToken = async (req, res) => {
  try {
    const { token } = req.params;

    const invitation = await Invitation.findOne({
      where: { token },
      include: [
        { model: Department, as: 'department', attributes: ['departmentName', 'departmentCode'] }
      ]
    });

    if (!invitation) {
      return res.status(404).json({ message: 'Invalid invitation link' });
    }

    if (invitation.status === 'accepted') {
      return res.status(400).json({ message: 'This invitation has already been used' });
    }

    if (invitation.expiresAt < new Date()) {
      if (invitation.status !== 'expired') {
        invitation.status = 'expired';
        await invitation.save();
      }
      return res.status(400).json({ message: 'This invitation has expired. Please contact your administrator for a new one.' });
    }

    res.json({
      invitation: {
        email: invitation.email,
        role: invitation.role,
        department: invitation.department
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error validating invitation', error: error.message });
  }
};

// ─── Complete Registration (Public) ─────────────────────────────────────────
export const completeRegistration = async (req, res) => {
  try {
    const { token } = req.params;
    const { name, mobile, password } = req.body;

    if (!name || !password) {
      return res.status(400).json({ message: 'Name and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const invitation = await Invitation.findOne({ where: { token } });

    if (!invitation) {
      return res.status(404).json({ message: 'Invalid invitation link' });
    }

    if (invitation.status === 'accepted') {
      return res.status(400).json({ message: 'This invitation has already been used' });
    }

    if (invitation.expiresAt < new Date()) {
      invitation.status = 'expired';
      await invitation.save();
      return res.status(400).json({ message: 'This invitation has expired' });
    }

    // Check if user already exists (edge case)
    const existingUser = await User.findOne({ where: { email: invitation.email } });
    if (existingUser) {
      return res.status(400).json({ message: 'An account with this email already exists' });
    }

    // Create user
    const hashedPassword = await hashPassword(password);
    const user = await User.create({
      name,
      email: invitation.email,
      mobile: mobile || null,
      password: hashedPassword,
      role: invitation.role,
      departmentId: invitation.departmentId,
      status: true
    });

    // Mark invitation as accepted
    invitation.status = 'accepted';
    await invitation.save();

    // Generate token so user can login immediately
    const authToken = generateToken(user.id, user.role);

    res.status(201).json({
      message: 'Account created successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        departmentId: user.departmentId
      },
      token: authToken
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating account', error: error.message });
  }
};

// ─── Resend Invitation ──────────────────────────────────────────────────────
export const resendInvitation = async (req, res) => {
  try {
    const { id } = req.params;
    const caller = req.user;

    const invitation = await Invitation.findByPk(id);
    if (!invitation) {
      return res.status(404).json({ message: 'Invitation not found' });
    }

    if (invitation.status === 'accepted') {
      return res.status(400).json({ message: 'This invitation has already been used' });
    }

    // Generate new token and reset expiry
    invitation.token = uuidv4();
    invitation.expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    invitation.status = 'pending';
    await invitation.save();

    // Get inviter name
    const inviter = await User.findByPk(caller.userId, { attributes: ['name'] });

    try {
      await sendInvitationEmail(invitation.email, invitation.token, invitation.role, inviter?.name);
    } catch (emailError) {
      return res.status(200).json({
        message: 'Invitation renewed but email failed to send',
        emailError: emailError.message
      });
    }

    res.json({ message: 'Invitation resent successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error resending invitation', error: error.message });
  }
};
