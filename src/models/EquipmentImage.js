import { DataTypes } from 'sequelize';

export default (sequelize) => {
  return sequelize.define('EquipmentImage', {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true
    },
    equipmentId: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    imageUrl: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    publicId: {
      type: DataTypes.STRING(255),
      allowNull: true // Cloudinary public_id for easy deletion
    },
    isPrimary: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'equipment_images',
    timestamps: true
  });
};
