import { DataTypes } from 'sequelize';

export default (sequelize) => {
  return sequelize.define('User', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true
    },
    mobile: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    role: {
      type: DataTypes.ENUM('admin', 'hod', 'technician'),
      defaultValue: 'technician'
    },
    departmentId: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    assignedLabId: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    status: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'users',
    timestamps: true
  });
};
