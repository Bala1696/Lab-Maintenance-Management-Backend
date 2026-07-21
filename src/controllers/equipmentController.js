import { Equipment, LabRoom, Department, MaintenanceLog, EquipmentImage, User, EquipmentConfiguration } from '../models/index.js';
import { Op } from 'sequelize';
import { streamToCloudinary } from '../middleware/upload.js';

// ─── Helper: Upload equipment image buffer → Cloudinary ──────────────────────
// Stores under equipment-images/{DeptName}/{LabName}/{timestamp}-{filename}
async function uploadEquipmentImage(file, labRoomId) {
  if (!file || !file.buffer) return null;

  let folder = 'equipment-images/General/General';
  try {
    if (labRoomId) {
      const lab = await LabRoom.findByPk(labRoomId, {
        include: [{ model: Department, as: 'department' }]
      });
      if (lab) {
        const deptName = (lab.department?.departmentName || 'General').replace(/[^a-zA-Z0-9]/g, '_');
        const labName  = lab.labName.replace(/[^a-zA-Z0-9]/g, '_');
        folder = `equipment-images/${deptName}/${labName}`;
      }
    }
  } catch (e) {
    console.error('uploadEquipmentImage folder resolve error:', e.message);
  }

  const baseName = (file.originalname || 'image')
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9]/g, '_');

  console.log(`📁  Uploading equipment image → ${folder}`);
  const result = await streamToCloudinary(file.buffer, {
    folder,
    public_id: `${Date.now()}-${baseName}`
  });
  console.log(`✅  Equipment image uploaded → ${result.secure_url}`);
  return result;
}

// Create Equipment
export const createEquipment = async (req, res) => {
  try {
    const {
      departmentId,
      labRoomId,
      equipmentType,
      assetNumber,
      equipmentName,
      brand,
      modelNumber,
      serialNumber,
      purchaseDate,
      warrantyExpiry,
      price,
      supplierName,
      remarks,
      processor,
      ram,
      storage,
      os,
      ipAddress,
      macAddress
    } = req.body;

    // Validate asset number uniqueness
    const existingAsset = await Equipment.findOne({ where: { assetNumber } });
    if (existingAsset) {
      return res.status(400).json({ message: 'Asset number already exists' });
    }

    const cleanDate = (dateStr) => {
      if (!dateStr) return null;
      const lower = String(dateStr).trim().toLowerCase();
      if (lower === '' || lower === 'invalid date' || lower === 'null' || lower === 'undefined') return null;
      
      const parsedDate = new Date(dateStr);
      if (isNaN(parsedDate.getTime())) return null; // Invalid date format

      return dateStr;
    };

    const equipment = await Equipment.create({
      departmentId,
      labRoomId,
      equipmentType,
      assetNumber,
      equipmentName,
      brand,
      modelNumber,
      serialNumber,
      purchaseDate: cleanDate(purchaseDate),
      warrantyExpiry: cleanDate(warrantyExpiry),
      price,
      supplierName,
      remarks,
      currentStatus: 'Working'
    });

    // Create associated EquipmentConfiguration if details provided
    const hasConfig = processor || ram || storage || os || ipAddress || macAddress;
    if (hasConfig) {
      await EquipmentConfiguration.create({
        equipmentId: equipment.id,
        processor: processor || null,
        ram: ram || null,
        storage: storage || null,
        os: os || null,
        ipAddress: ipAddress || null,
        macAddress: macAddress || null
      });
    }

    // Handle image upload → Cloudinary
    if (req.file) {
      const imgResult = await uploadEquipmentImage(req.file, labRoomId);
      if (imgResult) {
        await EquipmentImage.create({
          equipmentId: equipment.id,
          imageUrl:  imgResult.secure_url,
          publicId:  imgResult.public_id,
          isPrimary: true
        });
      }
    }

    await equipment.reload({
      include: [
        { model: EquipmentConfiguration, as: 'configuration' }
      ]
    });

    res.status(201).json({
      message: 'Equipment created successfully',
      equipment
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating equipment', error: error.message });
  }
};

// Get All Equipment
export const getAllEquipment = async (req, res) => {
  try {
    const { departmentId, labRoomId, equipmentType, status } = req.query;
    const where = {};
    const caller = req.user;

    if (caller.role === 'hod') {
      const hodUser = await User.findByPk(caller.userId);
      where.departmentId = hodUser.departmentId;
    } else if (caller.role === 'technician') {
      const techUser = await User.findByPk(caller.userId);
      where.departmentId = techUser.departmentId;
      where.labRoomId = techUser.assignedLabId;
    } else if (departmentId) {
      where.departmentId = departmentId;
    }

    if (labRoomId) where.labRoomId = labRoomId;
    if (equipmentType) where.equipmentType = equipmentType;
    if (status) where.currentStatus = status;

    const equipments = await Equipment.findAll({
      where,
      include: [
        { model: Department, as: 'department', attributes: ['departmentName', 'departmentCode'] },
        { model: LabRoom, as: 'labRoom', attributes: ['labName', 'labCode'] },
        { model: EquipmentConfiguration, as: 'configuration' }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      total: equipments.length,
      equipments
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching equipment', error: error.message });
  }
};

// Get Equipment by ID
export const getEquipmentById = async (req, res) => {
  try {
    const { id } = req.params;

    const equipment = await Equipment.findByPk(id, {
      include: [
        { model: Department, as: 'department', attributes: ['departmentName', 'departmentCode'] },
        { model: LabRoom, as: 'labRoom', attributes: ['labName', 'labCode'] },
        { model: MaintenanceLog, as: 'maintenanceLogs', attributes: ['id', 'reportedDate', 'status'] },
        { model: EquipmentImage, as: 'images' },
        { model: EquipmentConfiguration, as: 'configuration' }
      ]
    });

    if (!equipment) {
      return res.status(404).json({ message: 'Equipment not found' });
    }

    res.json({ equipment });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching equipment', error: error.message });
  }
};

// Update Equipment
export const updateEquipment = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const { processor, ram, storage, os, ipAddress, macAddress } = req.body;

    const cleanDate = (dateStr) => {
      if (!dateStr) return null;
      const lower = String(dateStr).trim().toLowerCase();
      if (lower === '' || lower === 'invalid date' || lower === 'null' || lower === 'undefined') return null;
      
      const parsedDate = new Date(dateStr);
      if (isNaN(parsedDate.getTime())) return null; // Invalid date format

      return dateStr;
    };

    updates.purchaseDate = cleanDate(updates.purchaseDate);
    updates.warrantyExpiry = cleanDate(updates.warrantyExpiry);

    // Strip config-only fields from the Equipment model update
    const configFields = ['processor', 'ram', 'storage', 'os', 'ipAddress', 'macAddress'];
    const equipmentUpdates = Object.fromEntries(
      Object.entries(updates).filter(([k]) => !configFields.includes(k))
    );

    const equipment = await Equipment.findByPk(id);
    if (!equipment) {
      return res.status(404).json({ message: 'Equipment not found' });
    }

    // Handle image upload → Cloudinary
    if (req.file) {
      const imgResult = await uploadEquipmentImage(req.file, equipment.labRoomId);
      if (imgResult) {
        await EquipmentImage.create({
          equipmentId: equipment.id,
          imageUrl:  imgResult.secure_url,
          publicId:  imgResult.public_id,
          isPrimary: false
        });
      }
    }

    await equipment.update(equipmentUpdates);

    // Create or update associated EquipmentConfiguration
    const hasConfig = processor !== undefined || ram !== undefined || storage !== undefined || os !== undefined || ipAddress !== undefined || macAddress !== undefined;
    if (hasConfig) {
      const [config, created] = await EquipmentConfiguration.findOrCreate({
        where: { equipmentId: equipment.id },
        defaults: {
          processor: processor || null,
          ram: ram || null,
          storage: storage || null,
          os: os || null,
          ipAddress: ipAddress || null,
          macAddress: macAddress || null
        }
      });
      if (!created) {
        await config.update({
          processor: processor !== undefined ? (processor || null) : config.processor,
          ram: ram !== undefined ? (ram || null) : config.ram,
          storage: storage !== undefined ? (storage || null) : config.storage,
          os: os !== undefined ? (os || null) : config.os,
          ipAddress: ipAddress !== undefined ? (ipAddress || null) : config.ipAddress,
          macAddress: macAddress !== undefined ? (macAddress || null) : config.macAddress
        });
      }
    }

    await equipment.reload({
      include: [
        { model: Department, as: 'department', attributes: ['departmentName', 'departmentCode'] },
        { model: LabRoom, as: 'labRoom', attributes: ['labName', 'labCode'] },
        { model: MaintenanceLog, as: 'maintenanceLogs', attributes: ['id', 'reportedDate', 'status'] },
        { model: EquipmentImage, as: 'images' },
        { model: EquipmentConfiguration, as: 'configuration' }
      ]
    });

    res.json({
      message: 'Equipment updated successfully',
      equipment
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating equipment', error: error.message });
  }
};

// Delete Equipment
export const deleteEquipment = async (req, res) => {
  try {
    const { id } = req.params;

    const equipment = await Equipment.findByPk(id);
    if (!equipment) {
      return res.status(404).json({ message: 'Equipment not found' });
    }

    await equipment.destroy();

    res.json({ message: 'Equipment deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting equipment', error: error.message });
  }
};

// Get Equipment by Asset Number
export const getEquipmentByAssetNumber = async (req, res) => {
  try {
    const { assetNumber } = req.params;

    const equipment = await Equipment.findOne({
      where: { assetNumber },
      include: [
        { model: Department, as: 'department' },
        { model: LabRoom, as: 'labRoom' },
        { model: MaintenanceLog, as: 'maintenanceLogs' },
        { model: EquipmentImage, as: 'images' },
        { model: EquipmentConfiguration, as: 'configuration' }
      ]
    });

    if (!equipment) {
      return res.status(404).json({ message: 'Equipment not found' });
    }

    res.json({ equipment });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching equipment', error: error.message });
  }
};

// Get Equipment Statistics
export const getEquipmentStats = async (req, res) => {
  try {
    const caller = req.user;
    let where = {};

    if (caller.role === 'hod') {
      const hodUser = await User.findByPk(caller.userId);
      where = { departmentId: hodUser.departmentId };
    } else if (caller.role === 'technician') {
      const techUser = await User.findByPk(caller.userId);
      where = { 
        departmentId: techUser.departmentId,
        labRoomId: techUser.assignedLabId 
      };
    }

    const totalEquipments = await Equipment.count({ where });
    const byType = await Equipment.findAll({
      where,
      attributes: ['equipmentType'],
      raw: true
    });

    const byStatus = await Equipment.findAll({
      where,
      attributes: ['currentStatus'],
      raw: true
    });

    const stats = {
      total: totalEquipments,
      byType: {},
      byStatus: {}
    };

    byType.forEach(item => {
      stats.byType[item.equipmentType] = (stats.byType[item.equipmentType] || 0) + 1;
    });

    byStatus.forEach(item => {
      stats.byStatus[item.currentStatus] = (stats.byStatus[item.currentStatus] || 0) + 1;
    });

    res.json({ stats });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching statistics', error: error.message });
  }
};
