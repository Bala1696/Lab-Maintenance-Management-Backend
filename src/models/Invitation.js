import { DataTypes } from 'sequelize';

export default (sequelize) => {
  return sequelize.define('Invitation', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    role: {
      type: DataTypes.ENUM('hod', 'technician'),
      allowNull: false
    },
    departmentId: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    token: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'accepted', 'expired'),
      defaultValue: 'pending'
    },
    invitedBy: {
      type: DataTypes.BIGINT,
      allowNull: false
    }
  }, {
    tableName: 'invitations',
    timestamps: true
  });
};
