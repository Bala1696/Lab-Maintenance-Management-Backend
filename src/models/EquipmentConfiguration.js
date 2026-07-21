import { DataTypes } from 'sequelize';

export default (sequelize) => {
  return sequelize.define('EquipmentConfiguration', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    equipmentId: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    processor: DataTypes.STRING(100),
    ram: DataTypes.STRING(50),
    storage: DataTypes.STRING(100),
    os: DataTypes.STRING(100),
    ipAddress: DataTypes.STRING(50),
    macAddress: DataTypes.STRING(50)
  }, {
    tableName: 'equipment_configurations',
    timestamps: true
  });
};
