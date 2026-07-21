import { Notification, User } from '../models/index.js';

/**
 * Get all notifications for the currently logged in user
 */
export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.findAll({
      where: { recipientId: req.user.id },
      order: [['createdAt', 'DESC']],
      include: [
        { model: User, as: 'sender', attributes: ['id', 'name', 'role'] }
      ]
    });

    res.json({
      success: true,
      notifications
    });
  } catch (error) {
    console.error('Error in getNotifications:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
};

/**
 * Mark a specific notification (or all) as read
 */
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    if (id === 'all') {
      await Notification.update(
        { isRead: true },
        { where: { recipientId: req.user.id, isRead: false } }
      );
    } else {
      const notification = await Notification.findOne({
        where: { id, recipientId: req.user.id }
      });

      if (!notification) {
        return res.status(404).json({ success: false, message: 'Notification not found' });
      }

      await notification.update({ isRead: true });
    }

    res.json({ success: true, message: 'Notification(s) marked as read' });
  } catch (error) {
    console.error('Error in markAsRead:', error);
    res.status(500).json({ success: false, message: 'Failed to mark notification as read' });
  }
};

/**
 * Utility function to create a notification
 * (This is intended to be called internally by other controllers, not directly via a route)
 */
export const createNotification = async ({ recipientId, senderId = null, title, message, type = 'SYSTEM' }) => {
  try {
    const notification = await Notification.create({
      recipientId,
      senderId,
      title,
      message,
      type
    });
    return notification;
  } catch (error) {
    console.error('Failed to create notification:', error);
    // Don't throw to prevent interrupting the main workflow, just log it
    return null;
  }
};

/**
 * Utility function to notify all admins
 */
export const notifyAdmins = async ({ senderId = null, title, message, type = 'SYSTEM' }) => {
  try {
    const admins = await User.findAll({ where: { role: 'admin' } });
    const promises = admins.map(admin => 
      createNotification({ recipientId: admin.id, senderId, title, message, type })
    );
    await Promise.all(promises);
  } catch (error) {
    console.error('Failed to notify admins:', error);
  }
};

/**
 * Utility function to notify a department's HOD
 */
export const notifyHOD = async ({ departmentId, senderId = null, title, message, type = 'SYSTEM' }) => {
  try {
    const hods = await User.findAll({ where: { role: 'hod', departmentId } });
    const promises = hods.map(hod => 
      createNotification({ recipientId: hod.id, senderId, title, message, type })
    );
    await Promise.all(promises);
  } catch (error) {
    console.error('Failed to notify HOD:', error);
  }
};

/**
 * Utility function to notify all technicians in a lab
 */
export const notifyLabTechnicians = async ({ labRoomId, senderId = null, title, message, type = 'SYSTEM' }) => {
  try {
    const technicians = await User.findAll({ where: { role: 'technician', assignedLabId: labRoomId } });
    const promises = technicians.map(tech => 
      createNotification({ recipientId: tech.id, senderId, title, message, type })
    );
    await Promise.all(promises);
  } catch (error) {
    console.error('Failed to notify lab technicians:', error);
  }
};
