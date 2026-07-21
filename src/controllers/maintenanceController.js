import { MaintenanceLog, Equipment, User } from '../models/index.js';
import { Op } from 'sequelize';

// Create Maintenance Log
export const createMaintenance = async (req, res) => {
  try {
    const {
      equipmentId,
      issueDescription,
      assignedTo,
      remarks
    } = req.body;

    const maintenance = await MaintenanceLog.create({
      equipmentId,
      issueDescription,
      reportedBy: req.user.userId,
      assignedTo: assignedTo || null,
      reportedDate: new Date(),
      status: 'Open'
    });

    // Update equipment status
    await Equipment.update(
      { currentStatus: 'Under Maintenance' },
      { where: { id: equipmentId } }
    );

    res.status(201).json({
      message: 'Maintenance record created successfully',
      maintenance
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating maintenance record', error: error.message });
  }
};

// Get All Maintenance Logs
export const getAllMaintenance = async (req, res) => {
  try {
    const { equipmentId, status, startDate, endDate, departmentId } = req.query;
    const where = {};

    if (equipmentId) where.equipmentId = equipmentId;
    if (status) where.status = status;

    if (startDate || endDate) {
      where.reportedDate = {};
      if (startDate) where.reportedDate[Op.gte] = new Date(startDate);
      if (endDate) where.reportedDate[Op.lte] = new Date(endDate);
    }

    const equipmentInclude = {
      model: Equipment,
      as: 'equipment',
      attributes: ['assetNumber', 'equipmentName', 'equipmentType', 'departmentId']
    };

    if (departmentId) {
      equipmentInclude.where = { departmentId };
      equipmentInclude.required = true;
    }

    const maintenance = await MaintenanceLog.findAll({
      where,
      include: [
        equipmentInclude,
        {
          model: User,
          as: 'reporter',
          attributes: ['name', 'email', 'mobile']
        },
        {
          model: User,
          as: 'assignee',
          attributes: ['name', 'email', 'mobile']
        }
      ],
      order: [['reportedDate', 'DESC']]
    });

    res.json({
      total: maintenance.length,
      maintenance
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching maintenance records', error: error.message });
  }
};

// Get Maintenance by ID
export const getMaintenanceById = async (req, res) => {
  try {
    const { id } = req.params;

    const maintenance = await MaintenanceLog.findByPk(id, {
      include: [
        {
          model: Equipment,
          as: 'equipment',
          attributes: ['assetNumber', 'equipmentName', 'brand', 'modelNumber']
        },
        {
          model: User,
          as: 'reporter',
          attributes: ['name', 'email', 'mobile']
        },
        {
          model: User,
          as: 'assignee',
          attributes: ['name', 'email', 'mobile']
        }
      ]
    });

    if (!maintenance) {
      return res.status(404).json({ message: 'Maintenance record not found' });
    }

    res.json({ maintenance });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching maintenance record', error: error.message });
  }
};

// Update Maintenance Log
export const updateMaintenance = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolutionDetails, resolvedDate, status, assignedTo, costIncurred } = req.body;

    const maintenance = await MaintenanceLog.findByPk(id);
    if (!maintenance) {
      return res.status(404).json({ message: 'Maintenance record not found' });
    }

    if (resolutionDetails !== undefined) maintenance.resolutionDetails = resolutionDetails;
    if (resolvedDate !== undefined) maintenance.resolvedDate = resolvedDate;
    if (status !== undefined) maintenance.status = status;
    if (assignedTo !== undefined) maintenance.assignedTo = assignedTo;
    if (costIncurred !== undefined) maintenance.costIncurred = costIncurred;

    await maintenance.save();

    // Update equipment status if maintenance is resolved
    if (status === 'Resolved') {
      await Equipment.update(
        { currentStatus: 'Repair Completed' },
        { where: { id: maintenance.equipmentId } }
      );
    }

    res.json({
      message: 'Maintenance record updated successfully',
      maintenance
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating maintenance record', error: error.message });
  }
};

// Delete Maintenance Log
export const deleteMaintenance = async (req, res) => {
  try {
    const { id } = req.params;

    const maintenance = await MaintenanceLog.findByPk(id);
    if (!maintenance) {
      return res.status(404).json({ message: 'Maintenance record not found' });
    }

    await maintenance.destroy();

    res.json({ message: 'Maintenance record deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting maintenance record', error: error.message });
  }
};

// Get Maintenance Statistics
export const getMaintenanceStats = async (req, res) => {
  try {
    const { departmentId } = req.query;
    let include = [];

    if (departmentId) {
      include = [
        {
          model: Equipment,
          as: 'equipment',
          where: { departmentId },
          required: true
        }
      ];
    }

    const total = await MaintenanceLog.count({ include });
    const open = await MaintenanceLog.count({ where: { status: 'Open' }, include });
    const inProgress = await MaintenanceLog.count({ where: { status: 'In Progress' }, include });
    const resolved = await MaintenanceLog.count({ where: { status: 'Resolved' }, include });
    const unrepairable = await MaintenanceLog.count({ where: { status: 'Unrepairable' }, include });

    const stats = {
      total,
      open,
      inProgress,
      resolved,
      unrepairable
    };

    res.json({ stats });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching statistics', error: error.message });
  }
};
