import Announcement from '../models/Announcement.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';

/**
 * Returns current business date in YYYY-MM-DD for America/Chicago timezone
 */
function getTodayChicagoDate() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
}

/**
 * Helper to check if an announcement is targeted and accessible to a given employee
 */
function isTargetedToEmployee(announcement, user, todayDate) {
  // 1. Must be PUBLISHED
  if (announcement.status !== 'PUBLISHED') return false;

  // 2. Date window check
  if (announcement.publishDate && announcement.publishDate > todayDate) return false;
  if (announcement.expiryDate && announcement.expiryDate < todayDate) return false;

  // 3. Audience check
  if (announcement.targetAudience === 'All Employees') return true;

  if (announcement.targetAudience === 'Selected Department') {
    return Boolean(
      announcement.targetDepartment &&
        announcement.targetDepartment.toLowerCase() === (user.department || '').toLowerCase()
    );
  }

  if (announcement.targetAudience === 'Selected Employees') {
    return Array.isArray(announcement.targetEmployeeIds) &&
      announcement.targetEmployeeIds.includes(user.employeeId);
  }

  return false;
}

/**
 * Helper to emit notification for published announcement without duplicates
 */
async function dispatchAnnouncementNotifications(announcement) {
  try {
    if (announcement.status !== 'PUBLISHED') return;

    if (announcement.targetAudience === 'All Employees') {
      await Notification.findOneAndUpdate(
        { eventId: `announcement_${announcement._id}_ALL` },
        {
          $setOnInsert: {
            recipientId: 'ALL',
            recipientRole: 'ALL',
            type: 'announcement',
            title: `Announcement: ${announcement.title}`,
            message: announcement.description.slice(0, 150),
            link: '/announcements',
            read: false,
            eventId: `announcement_${announcement._id}_ALL`,
            createdAt: new Date(),
          },
        },
        { upsert: true }
      );
    } else if (announcement.targetAudience === 'Selected Department' && announcement.targetDepartment) {
      const deptUsers = await User.find({
        department: announcement.targetDepartment,
        employmentStatus: 'Active',
      }).select('employeeId');

      for (const u of deptUsers) {
        await Notification.findOneAndUpdate(
          { eventId: `announcement_${announcement._id}_${u.employeeId}` },
          {
            $setOnInsert: {
              recipientId: u.employeeId,
              recipientRole: 'EMPLOYEE',
              type: 'announcement',
              title: `Department Announcement: ${announcement.title}`,
              message: announcement.description.slice(0, 150),
              link: '/announcements',
              read: false,
              eventId: `announcement_${announcement._id}_${u.employeeId}`,
              createdAt: new Date(),
            },
          },
          { upsert: true }
        );
      }
    } else if (
      announcement.targetAudience === 'Selected Employees' &&
      Array.isArray(announcement.targetEmployeeIds)
    ) {
      for (const empId of announcement.targetEmployeeIds) {
        await Notification.findOneAndUpdate(
          { eventId: `announcement_${announcement._id}_${empId}` },
          {
            $setOnInsert: {
              recipientId: empId,
              recipientRole: 'EMPLOYEE',
              type: 'announcement',
              title: `Direct Announcement: ${announcement.title}`,
              message: announcement.description.slice(0, 150),
              link: '/announcements',
              read: false,
              eventId: `announcement_${announcement._id}_${empId}`,
              createdAt: new Date(),
            },
          },
          { upsert: true }
        );
      }
    }
  } catch (err) {
    console.warn('Failed to dispatch announcement notifications:', err.message);
  }
}

/**
 * @route   GET /api/announcements
 * @desc    Get announcements (HR_ADMIN sees all, Employee sees targeted only)
 * @access  Private
 */
export async function getAnnouncements(req, res) {
  try {
    const today = getTodayChicagoDate();
    const isHrAdmin = req.user.role === 'HR_ADMIN';
    const { category, status, search, page = 1, limit = 20 } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 20);
    const skip = (pageNum - 1) * limitNum;

    let filter = {};

    if (isHrAdmin) {
      if (status && status !== 'ALL') {
        filter.status = status.toUpperCase();
      }
    } else {
      // Employee sees only PUBLISHED, active announcements targeted to them
      filter.status = 'PUBLISHED';
      filter.publishDate = { $lte: today };
      filter.$and = [
        {
          $or: [
            { expiryDate: null },
            { expiryDate: { $gte: today } },
          ],
        },
        {
          $or: [
            { targetAudience: 'All Employees' },
            { targetAudience: 'Selected Department', targetDepartment: req.user.department },
            { targetAudience: 'Selected Employees', targetEmployeeIds: req.user.employeeId },
          ],
        },
      ];
    }

    if (category && category !== 'ALL') {
      filter.category = category;
    }

    if (search && search.trim()) {
      const term = search.trim();
      filter.$or = [
        { title: { $regex: term, $options: 'i' } },
        { description: { $regex: term, $options: 'i' } },
        { author: { $regex: term, $options: 'i' } },
      ];
    }

    const totalCount = await Announcement.countDocuments(filter);
    const rawAnnouncements = await Announcement.find(filter)
      .sort({ pinned: -1, publishDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const announcements = rawAnnouncements.map((doc) => {
      const obj = doc.toJSON();
      const readByList = Array.isArray(obj.readBy) ? obj.readBy : [];
      obj.isRead = readByList.includes(req.user.employeeId);
      obj.readCount = readByList.length;
      return obj;
    });

    return res.status(200).json({
      success: true,
      count: announcements.length,
      totalCount,
      page: pageNum,
      totalPages: Math.ceil(totalCount / limitNum),
      announcements,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve announcements.',
      error: err.message,
    });
  }
}

/**
 * @route   GET /api/announcements/:id
 * @desc    Get announcement details (HR_ADMIN sees all, Employee sees targeted only)
 * @access  Private
 */
export async function getAnnouncementById(req, res) {
  try {
    const { id } = req.params;
    const announcement = await Announcement.findById(id);

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found.',
      });
    }

    const isHrAdmin = req.user.role === 'HR_ADMIN';
    const today = getTodayChicagoDate();

    if (!isHrAdmin) {
      const isEligible = isTargetedToEmployee(announcement, req.user, today);
      if (!isEligible) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You do not have permission to view this announcement.',
        });
      }
    }

    const obj = announcement.toJSON();
    const readByList = Array.isArray(obj.readBy) ? obj.readBy : [];
    obj.isRead = readByList.includes(req.user.employeeId);
    obj.readCount = readByList.length;

    return res.status(200).json({
      success: true,
      announcement: obj,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve announcement.',
      error: err.message,
    });
  }
}

/**
 * @route   POST /api/announcements
 * @desc    Create and publish an announcement (HR_ADMIN only)
 * @access  Private (HR_ADMIN only)
 */
export async function createAnnouncement(req, res) {
  try {
    const {
      title,
      description,
      category = 'General',
      priority = 'MEDIUM',
      targetAudience = 'All Employees',
      targetDepartment = null,
      targetEmployeeIds = [],
      publishDate,
      expiryDate = null,
      status = 'PUBLISHED',
      pinned = false,
    } = req.body || {};

    if (!title || !title.trim() || !description || !description.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Title and description are required.',
      });
    }

    const today = getTodayChicagoDate();
    const effectivePublishDate = publishDate && /^\d{4}-\d{2}-\d{2}$/.test(publishDate.trim())
      ? publishDate.trim()
      : today;

    // Validate dates
    if (expiryDate) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(expiryDate.trim())) {
        return res.status(400).json({
          success: false,
          message: 'Expiry date must be in YYYY-MM-DD format.',
        });
      }
      if (expiryDate.trim() < effectivePublishDate) {
        return res.status(400).json({
          success: false,
          message: 'Expiry date cannot be earlier than publish date.',
        });
      }
    }

    // Validate target audience
    const validAudiences = ['All Employees', 'Selected Department', 'Selected Employees'];
    if (!validAudiences.includes(targetAudience)) {
      return res.status(400).json({
        success: false,
        message: `Invalid target audience '${targetAudience}'. Allowed values: ${validAudiences.join(', ')}`,
      });
    }

    if (targetAudience === 'Selected Department' && (!targetDepartment || !targetDepartment.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Target department is required when audience is "Selected Department".',
      });
    }

    if (targetAudience === 'Selected Employees' && (!Array.isArray(targetEmployeeIds) || targetEmployeeIds.length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'At least one target employee ID is required when audience is "Selected Employees".',
      });
    }

    const newAnnouncement = await Announcement.create({
      title: title.trim(),
      description: description.trim(),
      category,
      priority,
      targetAudience,
      targetDepartment: targetDepartment ? targetDepartment.trim() : null,
      targetEmployeeIds: Array.isArray(targetEmployeeIds) ? targetEmployeeIds.map((id) => id.toUpperCase()) : [],
      publishDate: effectivePublishDate,
      expiryDate: expiryDate ? expiryDate.trim() : null,
      author: `${req.user.firstName} ${req.user.lastName} (HR Administrator)`,
      status: ['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(status) ? status : 'PUBLISHED',
      pinned: Boolean(pinned),
      readBy: [],
    });

    // Send notifications if published
    await dispatchAnnouncementNotifications(newAnnouncement);

    return res.status(201).json({
      success: true,
      message: 'Announcement created successfully.',
      announcement: newAnnouncement,
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: 'Failed to create announcement.',
      error: err.message,
    });
  }
}

/**
 * @route   PUT /api/announcements/:id
 * @desc    Update announcement (HR_ADMIN only)
 * @access  Private (HR_ADMIN only)
 */
export async function updateAnnouncement(req, res) {
  try {
    const { id } = req.params;
    const announcement = await Announcement.findById(id);

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found.',
      });
    }

    const {
      title,
      description,
      category,
      priority,
      targetAudience,
      targetDepartment,
      targetEmployeeIds,
      publishDate,
      expiryDate,
      status,
      pinned,
    } = req.body || {};

    if (title !== undefined) announcement.title = title.trim();
    if (description !== undefined) announcement.description = description.trim();
    if (category !== undefined) announcement.category = category;
    if (priority !== undefined) announcement.priority = priority;

    if (targetAudience !== undefined) {
      const validAudiences = ['All Employees', 'Selected Department', 'Selected Employees'];
      if (!validAudiences.includes(targetAudience)) {
        return res.status(400).json({
          success: false,
          message: `Invalid target audience '${targetAudience}'.`,
        });
      }
      announcement.targetAudience = targetAudience;
    }

    if (targetDepartment !== undefined) {
      announcement.targetDepartment = targetDepartment ? targetDepartment.trim() : null;
    }

    if (targetEmployeeIds !== undefined) {
      announcement.targetEmployeeIds = Array.isArray(targetEmployeeIds)
        ? targetEmployeeIds.map((e) => e.toUpperCase())
        : [];
    }

    if (publishDate !== undefined) announcement.publishDate = publishDate.trim();
    if (expiryDate !== undefined) announcement.expiryDate = expiryDate ? expiryDate.trim() : null;

    if (announcement.expiryDate && announcement.publishDate > announcement.expiryDate) {
      return res.status(400).json({
        success: false,
        message: 'Expiry date cannot be earlier than publish date.',
      });
    }

    if (status !== undefined && ['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(status)) {
      announcement.status = status;
    }

    if (pinned !== undefined) announcement.pinned = Boolean(pinned);

    await announcement.save();

    // If transitioned to PUBLISHED, ensure notifications are sent
    if (announcement.status === 'PUBLISHED') {
      await dispatchAnnouncementNotifications(announcement);
    }

    return res.status(200).json({
      success: true,
      message: 'Announcement updated successfully.',
      announcement,
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: 'Failed to update announcement.',
      error: err.message,
    });
  }
}

/**
 * @route   DELETE /api/announcements/:id
 * @desc    Delete or archive announcement (HR_ADMIN only)
 * @access  Private (HR_ADMIN only)
 */
export async function deleteAnnouncement(req, res) {
  try {
    const { id } = req.params;
    const { permanent = false } = req.query;

    const announcement = await Announcement.findById(id);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found.',
      });
    }

    if (permanent === 'true' || permanent === true) {
      await Announcement.findByIdAndDelete(id);
      return res.status(200).json({
        success: true,
        message: 'Announcement permanently deleted.',
      });
    } else {
      announcement.status = 'ARCHIVED';
      await announcement.save();
      return res.status(200).json({
        success: true,
        message: 'Announcement archived successfully.',
        announcement,
      });
    }
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to delete announcement.',
      error: err.message,
    });
  }
}

/**
 * @route   POST /api/announcements/:id/read
 * @desc    Mark announcement as read by authenticated employee
 * @access  Private
 */
export async function markAnnouncementRead(req, res) {
  try {
    const { id } = req.params;
    const empId = req.user.employeeId;

    const announcement = await Announcement.findById(id);
    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found.',
      });
    }

    // Atomic addition to prevent duplicate read entries
    const updated = await Announcement.findByIdAndUpdate(
      id,
      { $addToSet: { readBy: empId } },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Announcement marked as read.',
      readCount: updated.readBy.length,
      isRead: true,
      announcement: updated,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to mark announcement as read.',
      error: err.message,
    });
  }
}

export default {
  getAnnouncements,
  getAnnouncementById,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  markAnnouncementRead,
};
