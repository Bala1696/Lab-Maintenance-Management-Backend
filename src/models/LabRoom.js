import { DataTypes } from 'sequelize';

export default (sequelize) => {
  return sequelize.define('LabRoom', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    departmentId: {
      type: DataTypes.BIGINT,
      allowNull: false
      // References will be added in index.js via associations, but can also define here if we want.
      // Better to rely on associations for foreign keys in Sequelize modular setup, or keep it explicit.
    },
    labName: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    labCode: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    roomNumber: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    floor: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    totalSystems: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    status: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    labImage: {
      type: DataTypes.STRING(1000),
      allowNull: true
    }
  }, {
    tableName: 'lab_rooms',
    timestamps: true
  });
};
