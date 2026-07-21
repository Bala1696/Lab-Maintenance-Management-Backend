import { DataTypes } from 'sequelize';

export default (sequelize) => {
  return sequelize.define('Department', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    departmentName: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    departmentCode: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    hodName: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    status: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'departments',
    timestamps: true
  });
};
