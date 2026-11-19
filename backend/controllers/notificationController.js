import Notification from '../models/Notification.js';

/**
 * Helper to build user-scoped notification filter
 */
function getUserNotificationFilter(user) {
  const isHrAdmin = user.role === 'HR_ADMIN';
  return {
    $or: [
      { recipientId: user.employeeId },
      { recipientId: 'ALL' },
      { recipientRole: 'ALL' },
      ...(isHrAdmin ? [{ recipientId: 'HR_ADMIN' }, { recipientRole: 'HR_ADMIN' }] : []),
    ],
  };
}

/**
 * @route   GET /api/notifications
 * @desc    Get notifications for authenticated user (strictly scoped)
 * @access  Private
 */
export async function getNotifications(req, res) {
  try {
    const { read, type, page = 1, limit = 30 } = req.query;
    const baseFilter = getUserNotificationFilter(req.user);

    const filter = {
      $and: [baseFilter],
    };

    if (read !== undefined) {
      filter.$and.push({ read: read === 'true' || read === true });
    }

    if (type && type.trim()) {
      filter.$and.push({ type: type.trim() });
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 30);
    const skip = (pageNum - 1) * limitNum;

    const totalCount = await Notification.countDocuments(filter);
    const unreadCount = await Notification.countDocuments({
      $and: [baseFilter, { read: false }],
    });

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    return res.status(200).json({
      success: true,
      count: notifications.length,
      unreadCount,
      totalCount,
      page: pageNum,
      totalPages: Math.ceil(totalCount / limitNum),
      notifications,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve notifications.',
      error: err.message,
    });
  }
}

/**
 * @route   GET /api/notifications/unread-count
 * @desc    Get count of unread notifications for authenticated user
 * @access  Private
 */
export async function getUnreadCount(req, res) {
  try {
    const baseFilter = getUserNotificationFilter(req.user);
    const unreadCount = await Notification.countDocuments({
      $and: [baseFilter, { read: false }],
    });

    return res.status(200).json({
      success: true,
      unreadCount,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve unread notification count.',
      error: err.message,
    });
  }
}

/**
 * @route   PATCH /api/notifications/:id/read
 * @route   PUT /api/notifications/:id/read
 * @desc    Mark individual notification as read (with recipient ownership verification)
 * @access  Private
 */
export async function markNotificationRead(req, res) {
  try {
    const { id } = req.params;
    const notification = await Notification.findById(id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found.',
      });
    }

    const isHrAdmin = req.user.role === 'HR_ADMIN';
    const isOwner =
      notification.recipientId === req.user.employeeId ||
      notification.recipientId === 'ALL' ||
      notification.recipientRole === 'ALL' ||
      (isHrAdmin && (notification.recipientId === 'HR_ADMIN' || notification.recipientRole === 'HR_ADMIN'));

    if (!isOwner) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to alter notifications of another user.',
      });
    }

    notification.read = true;
    await notification.save();

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read.',
      notification,
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: 'Failed to update notification.',
      error: err.message,
    });
  }
}

/**
 * @route   PATCH /api/notifications/read-all
 * @route   PUT /api/notifications/read-all
 * @desc    Mark all user's notifications as read
 * @access  Private
 */
export async function markAllNotificationsRead(req, res) {
  try {
    const baseFilter = getUserNotificationFilter(req.user);
    const result = await Notification.updateMany(
      {
        $and: [baseFilter, { read: false }],
      },
      { $set: { read: true } }
    );

    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read.',
      modifiedCount: result.modifiedCount || 0,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update notifications.',
      error: err.message,
    });
  }
}

export default {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
};
