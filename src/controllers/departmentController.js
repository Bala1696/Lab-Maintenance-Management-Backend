import { Department } from '../models/index.js';

// Create Department
export const createDepartment = async (req, res) => {
  try {
    const { departmentName, departmentCode, hodName, status } = req.body;

    // Validate code uniqueness
    const existing = await Department.findOne({ where: { departmentCode } });
    if (existing) {
      return res.status(400).json({ message: 'Department code already exists' });
    }

    const department = await Department.create({
      departmentName,
      departmentCode,
      hodName,
      status: status !== undefined ? status : true
    });

    res.status(201).json({
      message: 'Department created successfully',
      department
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating department', error: error.message });
  }
};

// Get All Departments
export const getAllDepartments = async (req, res) => {
  try {
    const departments = await Department.findAll({
      order: [['createdAt', 'DESC']]
    });
    res.json({ departments });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching departments', error: error.message });
  }
};

// Get Department by ID
export const getDepartmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const department = await Department.findByPk(id);

    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    res.json({ department });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching department', error: error.message });
  }
};

// Update Department
export const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { departmentName, departmentCode, hodName, status } = req.body;

    const department = await Department.findByPk(id);
    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    // Validate code uniqueness if changing
    if (departmentCode && departmentCode !== department.departmentCode) {
      const existing = await Department.findOne({ where: { departmentCode } });
      if (existing) {
        return res.status(400).json({ message: 'Department code already exists' });
      }
    }

    await department.update({
      departmentName,
      departmentCode,
      hodName,
      status: status !== undefined ? status : department.status
    });

    res.json({
      message: 'Department updated successfully',
      department
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating department', error: error.message });
  }
};

// Delete Department
export const deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const department = await Department.findByPk(id);

    if (!department) {
      return res.status(404).json({ message: 'Department not found' });
    }

    await department.destroy();
    res.json({ message: 'Department deleted successfully' });
  } catch (error) {
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(400).json({
        message: 'Cannot delete department because it is referenced by other laboratory rooms, users, or equipment assets. Consider deactivating it instead.'
      });
    }
    res.status(500).json({ message: 'Error deleting department', error: error.message });
  }
};
