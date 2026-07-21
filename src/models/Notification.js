import { DataTypes } from 'sequelize';

export default (sequelize) => {
  return sequelize.define('Notification', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    recipientId: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    senderId: {
      type: DataTypes.BIGINT,
      allowNull: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM('SYSTEM', 'MAINTENANCE', 'INVITATION', 'EQUIPMENT'),
      defaultValue: 'SYSTEM'
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'notifications',
    timestamps: true
  });
};
