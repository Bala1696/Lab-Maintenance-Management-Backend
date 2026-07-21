import { Equipment, EquipmentConfiguration, LabRoom, Department } from '../models/index.js';
import sequelize from '../models/index.js';

// Increment IP Address string (e.g. 172.16.10.66 -> 172.16.10.67)
function incrementIp(ip, increment) {
  if (!ip) return null;
  const parts = ip.split('.');
  if (parts.length !== 4) return ip;
  let lastOctet = parseInt(parts[3], 10) + increment;
  if (lastOctet > 255) lastOctet = 255;
  return `${parts[0]}.${parts[1]}.${parts[2]}.${lastOctet}`;
}

// Format number to 3 digits (e.g. 1 -> 001)
function formatNumber(num) {
  return num.toString().padStart(3, '0');
}

// @desc    Bulk generate lab network systems
// @route   POST /api/equipment-configurations/bulk-generate
// @access  Private (Admin, HOD, Technician)
export const bulkGenerateSystems = async (req, res) => {
  const { 
    labRoomId, 
    systemCount, 
    baseAssetName, 
    baseIpAddress, 
    processor, 
    ram, 
    storage, 
    os,
    brand,
    price
  } = req.body;

  if (!labRoomId || !systemCount) {
    return res.status(400).json({ message: 'Lab Room ID and System Count are required' });
  }

  const count = parseInt(systemCount, 10);
  if (count < 1 || count > 32) {
    return res.status(400).json({ message: 'System count must be between 1 and 32' });
  }

  const transaction = await sequelize.transaction();

  try {
    const labRoom = await LabRoom.findByPk(labRoomId, {
      include: [{ model: Department, as: 'department' }]
    });

    if (!labRoom) {
      await transaction.rollback();
      return res.status(404).json({ message: 'Lab Room not found' });
    }

    const generatedSystems = [];

    for (let i = 0; i < count; i++) {
      const currentAssetNumber = `${baseAssetName || 'AID-AIL-'}${formatNumber(i + 1)}`;
      const currentIp = incrementIp(baseIpAddress, i);

      // 1. Create Equipment (System)
      const newEquipment = await Equipment.create({
        departmentId: labRoom.departmentId,
        labRoomId: labRoom.id,
        assetNumber: currentAssetNumber,
        equipmentName: `System ${formatNumber(i + 1)}`,
        equipmentType: 'Computer',
        brand: brand || 'Generic',
        price: price || 0,
        currentStatus: 'Working'
      }, { transaction });

      // 2. Create Equipment Configuration
      const newConfig = await EquipmentConfiguration.create({
        equipmentId: newEquipment.id,
        processor: processor || null,
        ram: ram || null,
        storage: storage || null,
        os: os || null,
        ipAddress: currentIp || null
      }, { transaction });

      generatedSystems.push({
        equipment: newEquipment,
        configuration: newConfig
      });
    }

    await transaction.commit();

    res.status(201).json({
      message: `Successfully generated ${count} systems`,
      data: generatedSystems
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Bulk generation error:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ message: 'Asset Number already exists. Please choose a different prefix or clear existing systems.' });
    }
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

// @desc    Get equipment configuration by ID
// @route   GET /api/equipment-configurations/:id
// @access  Private
export const getEquipmentConfigById = async (req, res) => {
  try {
    const config = await EquipmentConfiguration.findByPk(req.params.id, {
      include: [{ model: Equipment }]
    });
    
    if (!config) {
      return res.status(404).json({ message: 'Equipment configuration not found' });
    }
    
    res.status(200).json(config);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Create equipment configuration manually
// @route   POST /api/equipment-configurations
// @access  Private
export const createEquipmentConfig = async (req, res) => {
  try {
    const { equipmentId, processor, ram, storage, os, ipAddress, macAddress } = req.body;
    
    const equipment = await Equipment.findByPk(equipmentId);
    if (!equipment) {
      return res.status(404).json({ message: 'Associated equipment not found' });
    }

    const newConfig = await EquipmentConfiguration.create({
      equipmentId,
      processor,
      ram,
      storage,
      os,
      ipAddress,
      macAddress
    });
    
    res.status(201).json(newConfig);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update equipment configuration
// @route   PUT /api/equipment-configurations/:id
// @access  Private
export const updateEquipmentConfig = async (req, res) => {
  try {
    const { processor, ram, storage, os, ipAddress, macAddress } = req.body;
    
    const config = await EquipmentConfiguration.findByPk(req.params.id);
    if (!config) {
      return res.status(404).json({ message: 'Equipment configuration not found' });
    }

    await config.update({
      processor,
      ram,
      storage,
      os,
      ipAddress,
      macAddress
    });
    
    res.status(200).json({ message: 'Configuration updated successfully', data: config });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Delete equipment configuration
// @route   DELETE /api/equipment-configurations/:id
// @access  Private
export const deleteEquipmentConfig = async (req, res) => {
  try {
    const config = await EquipmentConfiguration.findByPk(req.params.id);
    if (!config) {
      return res.status(404).json({ message: 'Equipment configuration not found' });
    }

    await config.destroy();
    res.status(200).json({ message: 'Configuration deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};
