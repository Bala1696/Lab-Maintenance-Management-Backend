import { User, Department, LabRoom } from '../models/index.js';
import { hashPassword } from '../middleware/auth.js';
import { Op } from 'sequelize';

// ─── Create User ────────────────────────────────────────────────────────────
// Admin  → can create admin / hod / technician
// HOD    → can only create technician (scoped to their dept)
export const createUser = async (req, res) => {
  try {
    const { name, email, mobile, password, role, departmentId, assignedLabId } = req.body;
    const caller = req.user; // { userId, role }

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'name, email, password and role are required' });
    }

    // Role-based creation rules
    if (caller.role === 'hod') {
      if (role !== 'technician') {
        return res.status(403).json({ message: 'HOD can only create technician accounts' });
      }
      // HOD can only add technicians to their own department
      const hodUser = await User.findByPk(caller.userId);
      if (String(departmentId) !== String(hodUser.departmentId)) {
        return res.status(403).json({ message: 'HOD can only create users in their own department' });
      }
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    const hashed = await hashPassword(password);
    const user = await User.create({
      name,
      email,
      mobile: mobile || null,
      password: hashed,
      role,
      departmentId: departmentId || null,
      assignedLabId: assignedLabId || null,
      status: true
    });

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        departmentId: user.departmentId,
        assignedLabId: user.assignedLabId,
        status: user.status
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating user', error: error.message });
  }
};

// ─── Get All Users ───────────────────────────────────────────────────────────
// Admin  → all users
// HOD    → only technicians in their department
export const getAllUsers = async (req, res) => {
  try {
    const caller = req.user;
    let where = {};

    if (caller.role === 'hod') {
      const hodUser = await User.findByPk(caller.userId);
      where = { departmentId: hodUser.departmentId, role: 'technician' };
    }

    const users = await User.findAll({
      where,
      attributes: { exclude: ['password'] },
      include: [
        { model: Department, as: 'department', attributes: ['departmentName', 'departmentCode'] },
        { model: LabRoom, as: 'assignedLab', attributes: ['labName', 'labCode'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({ users });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users', error: error.message });
  }
};

// ─── Get User By ID ──────────────────────────────────────────────────────────
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const caller = req.user;

    const user = await User.findByPk(id, {
      attributes: { exclude: ['password'] },
      include: [
        { model: Department, as: 'department', attributes: ['departmentName', 'departmentCode'] },
        { model: LabRoom, as: 'assignedLab', attributes: ['labName', 'labCode'] }
      ]
    });

    if (!user) return res.status(404).json({ message: 'User not found' });

    // HOD can only see users in their dept
    if (caller.role === 'hod') {
      const hodUser = await User.findByPk(caller.userId);
      if (String(user.departmentId) !== String(hodUser.departmentId)) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user', error: error.message });
  }
};

// ─── Update User ─────────────────────────────────────────────────────────────
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, mobile, role, departmentId, assignedLabId, status } = req.body;
    const caller = req.user;

    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // HOD scope check
    if (caller.role === 'hod') {
      const hodUser = await User.findByPk(caller.userId);
      if (String(user.departmentId) !== String(hodUser.departmentId) || user.role !== 'technician') {
        return res.status(403).json({ message: 'HOD can only update technicians in their department' });
      }
      // HOD cannot change role
      if (role && role !== 'technician') {
        return res.status(403).json({ message: 'HOD cannot change user roles' });
      }
    }

    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    if (mobile !== undefined) user.mobile = mobile;
    if (caller.role === 'admin' && role !== undefined) user.role = role;
    if (departmentId !== undefined) user.departmentId = departmentId || null;
    if (assignedLabId !== undefined) user.assignedLabId = assignedLabId || null;
    if (status !== undefined) user.status = status;

    await user.save();
    res.json({ message: 'User updated successfully', user });
  } catch (error) {
    res.status(500).json({ message: 'Error updating user', error: error.message });
  }
};

// ─── Delete/Deactivate User ──────────────────────────────────────────────────
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const caller = req.user;

    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // HOD scope check
    if (caller.role === 'hod') {
      const hodUser = await User.findByPk(caller.userId);
      if (String(user.departmentId) !== String(hodUser.departmentId) || user.role !== 'technician') {
        return res.status(403).json({ message: 'HOD can only remove technicians in their department' });
      }
    }

    // Soft-deactivate instead of hard delete
    user.status = false;
    await user.save();

    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deactivating user', error: error.message });
  }
};

// ─── Assign Lab Room to Technician ──────────────────────────────────────────
// Admin or HOD can assign; HOD must own the lab
export const assignLabRoom = async (req, res) => {
  try {
    const { id } = req.params; // technician user id
    const { labRoomId } = req.body;
    const caller = req.user;

    const technician = await User.findByPk(id);
    if (!technician || technician.role !== 'technician') {
      return res.status(404).json({ message: 'Technician not found' });
    }

    if (caller.role === 'hod') {
      const hodUser = await User.findByPk(caller.userId);
      if (String(technician.departmentId) !== String(hodUser.departmentId)) {
        return res.status(403).json({ message: 'HOD can only assign technicians in their department' });
      }
      // Verify the lab belongs to HOD's dept
      if (labRoomId) {
        const lab = await LabRoom.findByPk(labRoomId);
        if (!lab || String(lab.departmentId) !== String(hodUser.departmentId)) {
          return res.status(403).json({ message: 'Lab room does not belong to your department' });
        }
      }
    }

    technician.assignedLabId = labRoomId || null;
    await technician.save();

    res.json({ message: 'Lab room assigned successfully', technician });
  } catch (error) {
    res.status(500).json({ message: 'Error assigning lab room', error: error.message });
  }
};

// ─── Reset User Password (Admin only) ───────────────────────────────────────
export const resetUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) return res.status(400).json({ message: 'newPassword is required' });

    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.password = await hashPassword(newPassword);
    await user.save();

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error resetting password', error: error.message });
  }
};
