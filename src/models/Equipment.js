import { DataTypes } from 'sequelize';

export default (sequelize) => {
  return sequelize.define('Equipment', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    departmentId: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    labRoomId: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    assetNumber: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    equipmentName: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    equipmentType: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    brand: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    modelNumber: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    serialNumber: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    purchaseDate: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    warrantyExpiry: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    supplierName: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    currentStatus: {
      type: DataTypes.ENUM('Working', 'Under Maintenance', 'Not Working', 'Repair Completed', 'Scrap'),
      defaultValue: 'Working'
    },
    remarks: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'equipment',
    timestamps: true
  });
};
