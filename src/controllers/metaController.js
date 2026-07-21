import { Department, LabRoom, User } from '../models/index.js';

// Active departments (used in dropdowns — accessible by all)
export const getDepartments = async (req, res) => {
  try {
    const departments = await Department.findAll({ where: { status: true } });
    res.json({ departments });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching departments', error: error.message });
  }
};

// Lab rooms — HOD gets only their dept's labs
export const getLabRooms = async (req, res) => {
  try {
    let where = { status: true };

    if (req.user && req.user.role === 'hod') {
      const hodUser = await User.findByPk(req.user.userId);
      if (hodUser) where.departmentId = hodUser.departmentId;
    }

    const labRooms = await LabRoom.findAll({ where });
    res.json({ labRooms });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching lab rooms', error: error.message });
  }
};

// Technicians — HOD gets only their dept's technicians
export const getTechnicians = async (req, res) => {
  try {
    let where = { role: 'technician', status: true };

    if (req.user && req.user.role === 'hod') {
      const hodUser = await User.findByPk(req.user.userId);
      if (hodUser) where.departmentId = hodUser.departmentId;
    }

    const technicians = await User.findAll({
      where,
      attributes: ['id', 'name', 'email', 'mobile', 'assignedLabId', 'departmentId']
    });
    res.json({ technicians });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching technicians', error: error.message });
  }
};
