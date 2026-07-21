import { DataTypes } from 'sequelize';

export default (sequelize) => {
  return sequelize.define('MaintenanceLog', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    equipmentId: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    reportedBy: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    assignedTo: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    issueDescription: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    reportedDate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    status: {
      type: DataTypes.ENUM('Open', 'In Progress', 'Resolved', 'Unrepairable'),
      defaultValue: 'Open'
    },
    resolutionDetails: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    resolvedDate: {
      type: DataTypes.DATE,
      allowNull: true
    },
    costIncurred: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00
    }
  }, {
    tableName: 'maintenance_logs',
    timestamps: true
  });
};
