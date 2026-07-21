import { User, Department } from '../models/index.js';
import { hashPassword, comparePassword, generateToken } from '../middleware/auth.js';
import { validationResult } from 'express-validator';

// Register User
export const registerUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, mobile, password, role, departmentId } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await User.create({
      name,
      email,
      mobile,
      password: hashedPassword,
      role,
      departmentId,
      status: true
    });

    const token = generateToken(user.id, user.role);

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      token
    });
  } catch (error) {
    res.status(500).json({ message: 'Error registering user', error: error.message });
  }
};

// Login User
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password required' });
    }

    // Find user
    const user = await User.findOne({
      where: { email },
      include: [{ model: Department, as: 'department', attributes: ['departmentName', 'departmentCode'] }]
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user.id, user.role);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        departmentId: user.departmentId,
        assignedLabId: user.assignedLabId
      },
      token
    });
  } catch (error) {
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
};

// Get Current User
export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.userId, {
      attributes: { exclude: ['password'] },
      include: [{ model: Department, as: 'department', attributes: ['departmentName', 'departmentCode'] }]
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user', error: error.message });
  }
};

// Logout User
export const logoutUser = (req, res) => {
  res.json({ message: 'Logout successful' });
};

// Update Profile
export const updateProfile = async (req, res) => {
  try {
    const { name, mobile, departmentId, currentPassword, newPassword } = req.body;
    const user = await User.findByPk(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (name) user.name = name;
    if (mobile !== undefined) user.mobile = mobile;
    if (departmentId !== undefined) user.departmentId = departmentId || null;

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ message: 'Current password is required to change password' });
      }
      const isValid = await comparePassword(currentPassword, user.password);
      if (!isValid) {
        return res.status(400).json({ message: 'Incorrect current password' });
      }
      user.password = await hashPassword(newPassword);
    }

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        departmentId: user.departmentId,
        mobile: user.mobile
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating profile', error: error.message });
  }
};
