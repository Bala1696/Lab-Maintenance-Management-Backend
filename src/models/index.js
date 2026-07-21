import { Sequelize } from 'sequelize';
import { dbConfig } from '../config/database.js';

// Import model definition functions
import defineDepartment from './Department.js';
import defineLabRoom from './LabRoom.js';
import defineUser from './User.js';
import defineEquipment from './Equipment.js';
import defineEquipmentConfiguration from './EquipmentConfiguration.js';
import defineEquipmentImage from './EquipmentImage.js';
import defineMaintenanceLog from './MaintenanceLog.js';
import defineInvitation from './Invitation.js';
import defineNotification from './Notification.js';

// Initialize Sequelize instance
const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    dialect: dbConfig.dialect,
    logging: dbConfig.logging,
    pool: dbConfig.pool
  }
);

// Define models
const Department = defineDepartment(sequelize);
const LabRoom = defineLabRoom(sequelize);
const User = defineUser(sequelize);
const Equipment = defineEquipment(sequelize);
const EquipmentConfiguration = defineEquipmentConfiguration(sequelize);
const EquipmentImage = defineEquipmentImage(sequelize);
const MaintenanceLog = defineMaintenanceLog(sequelize);
const Invitation = defineInvitation(sequelize);
const Notification = defineNotification(sequelize);

// Setup Associations (Relationships)

// 1. Department & LabRoom (1:N)
Department.hasMany(LabRoom, { foreignKey: 'departmentId', as: 'labRooms' });
LabRoom.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });

// 2. Department & User (1:N)
Department.hasMany(User, { foreignKey: 'departmentId', as: 'staff' });
User.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });

// 3. LabRoom & User (1:N) - for technicians assigned to specific labs
LabRoom.hasMany(User, { foreignKey: 'assignedLabId', as: 'technicians' });
User.belongsTo(LabRoom, { foreignKey: 'assignedLabId', as: 'assignedLab' });

// 4. Department & Equipment (1:N)
Department.hasMany(Equipment, { foreignKey: 'departmentId', as: 'equipments' });
Equipment.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });

// 5. LabRoom & Equipment (1:N)
LabRoom.hasMany(Equipment, { foreignKey: 'labRoomId', as: 'equipments' });
Equipment.belongsTo(LabRoom, { foreignKey: 'labRoomId', as: 'labRoom' });

// 6. Equipment & EquipmentConfiguration (1:1)
Equipment.hasOne(EquipmentConfiguration, { foreignKey: 'equipmentId', as: 'configuration', onDelete: 'CASCADE' });
EquipmentConfiguration.belongsTo(Equipment, { foreignKey: 'equipmentId' });

// 7. Equipment & EquipmentImage (1:N)
Equipment.hasMany(EquipmentImage, { foreignKey: 'equipmentId', as: 'images', onDelete: 'CASCADE' });
EquipmentImage.belongsTo(Equipment, { foreignKey: 'equipmentId' });

// 8. Equipment & MaintenanceLog (1:N)
Equipment.hasMany(MaintenanceLog, { foreignKey: 'equipmentId', as: 'maintenanceLogs', onDelete: 'CASCADE' });
MaintenanceLog.belongsTo(Equipment, { foreignKey: 'equipmentId', as: 'equipment' });

// 9. User (Technician/Admin) & MaintenanceLog (Reporter & Assignee)
User.hasMany(MaintenanceLog, { foreignKey: 'reportedBy', as: 'reportedIssues' });
MaintenanceLog.belongsTo(User, { foreignKey: 'reportedBy', as: 'reporter' });

User.hasMany(MaintenanceLog, { foreignKey: 'assignedTo', as: 'assignedTasks' });
MaintenanceLog.belongsTo(User, { foreignKey: 'assignedTo', as: 'assignee' });

// 10. Invitation associations
Department.hasMany(Invitation, { foreignKey: 'departmentId', as: 'invitations' });
Invitation.belongsTo(Department, { foreignKey: 'departmentId', as: 'department' });

User.hasMany(Invitation, { foreignKey: 'invitedBy', as: 'sentInvitations' });
Invitation.belongsTo(User, { foreignKey: 'invitedBy', as: 'inviter' });

// 11. User & Notification
User.hasMany(Notification, { foreignKey: 'recipientId', as: 'notifications', onDelete: 'CASCADE' });
Notification.belongsTo(User, { foreignKey: 'recipientId', as: 'recipient' });

User.hasMany(Notification, { foreignKey: 'senderId', as: 'sentNotifications', onDelete: 'SET NULL' });
Notification.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });

export {
  Department,
  LabRoom,
  User,
  Equipment,
  EquipmentConfiguration,
  EquipmentImage,
  MaintenanceLog,
  Invitation,
  Notification
};

export default sequelize;
