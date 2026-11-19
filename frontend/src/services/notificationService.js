/**
 * Centralized Notification Service for VISARTECH People
 * Single Source of Truth for In-App Notifications and Alerts
 * 
 * Features:
 * - Persistent demo storage via localStorage ('visartech_notifications')
 * - Real-time sync via 'notifications-updated' window events
 * - Duplicate prevention via unique eventId indexing
 * - Role and employee-specific notification dispatching
 * - Clean API-ready architecture for Express/MongoDB backend
 */

import { formatChicagoDate, getChicagoNow } from '../utils/timezone.js';
import api from './apiClient.js';

const STORAGE_KEY = 'visartech_notifications';

// Initial Canonical Seed Notifications
export const INITIAL_NOTIFICATIONS = [
  // Jordan Lee (EMP-006) - Employee Perspective
  {
    id: 'NOTIF-001',
    recipientId: 'EMP-006',
    recipientRole: 'EMPLOYEE',
    type: 'announcement',
    title: 'New Announcement: Q4 Townhall Meeting',
    message: 'Alex Morgan published "Company All-Hands Meeting — Q4 Townhall & Strategic Roadmap".',
    link: '/announcements',
    read: false,
    createdAt: '2026-11-15T09:00:00Z',
    formattedDate: 'Nov 15, 2026, 09:00 AM CST',
    eventId: 'announcement_ANN-001_EMP-006'
  },
  {
    id: 'NOTIF-002',
    recipientId: 'EMP-006',
    recipientRole: 'EMPLOYEE',
    type: 'payroll_published',
    title: 'November 2026 Payslip Ready',
    message: 'Your official salary disbursement statement for November 2026 is ready to view and download.',
    link: '/payroll',
    read: false,
    createdAt: '2026-11-14T15:30:00Z',
    formattedDate: 'Nov 14, 2026, 03:30 PM CST',
    eventId: 'payroll_2026-11_EMP-006'
  },
  {
    id: 'NOTIF-003',
    recipientId: 'EMP-006',
    recipientRole: 'EMPLOYEE',
    type: 'task_assigned',
    title: 'New Task Assigned: Cypress E2E Suite',
    message: 'Alex Morgan assigned you to "Automate Cypress E2E Regression Suite" in Quality Assurance.',
    link: '/tasks',
    read: true,
    createdAt: '2026-11-12T11:15:00Z',
    formattedDate: 'Nov 12, 2026, 11:15 AM CST',
    eventId: 'task_TSK-005_ASSIGNED_EMP-006'
  },
  {
    id: 'NOTIF-004',
    recipientId: 'EMP-006',
    recipientRole: 'EMPLOYEE',
    type: 'leave_approved',
    title: 'Casual Leave Request Approved',
    message: 'Your leave application for Nov 28–29, 2026 was approved by HR Administrator Alex Morgan.',
    link: '/leaves',
    read: true,
    createdAt: '2026-11-09T14:20:00Z',
    formattedDate: 'Nov 09, 2026, 02:20 PM CST',
    eventId: 'leave_LEAVE-003_APPROVED_EMP-006'
  },

  // Alex Morgan (HR Administrator Perspective)
  {
    id: 'NOTIF-101',
    recipientId: 'HR_ADMIN',
    recipientRole: 'HR_ADMIN',
    type: 'feedback_response',
    title: 'New Employee Feedback Submitted',
    message: 'New feedback submitted in category Workplace regarding "Ergonomic Dual Monitor Arms".',
    link: '/feedback',
    read: false,
    createdAt: '2026-11-14T10:15:00Z',
    formattedDate: 'Nov 14, 2026, 10:15 AM CST',
    eventId: 'feedback_FDB-001_NEW'
  },
  {
    id: 'NOTIF-102',
    recipientId: 'HR_ADMIN',
    recipientRole: 'HR_ADMIN',
    type: 'leave_approved',
    title: 'Leave Application Pending Review',
    message: 'Marcus Vance submitted a 3-day Medical/Sick Leave request requiring HR approval.',
    link: '/leaves',
    read: false,
    createdAt: '2026-11-16T08:30:00Z',
    formattedDate: 'Nov 16, 2026, 08:30 AM CST',
    eventId: 'leave_LEAVE-002_PENDING_ADMIN'
  },
  {
    id: 'NOTIF-103',
    recipientId: 'HR_ADMIN',
    recipientRole: 'HR_ADMIN',
    type: 'task_assigned',
    title: 'Task Submitted for Review',
    message: 'Elena Rostova marked "Design System Dark Mode Tokens" as In Review.',
    link: '/tasks',
    read: true,
    createdAt: '2026-11-15T16:45:00Z',
    formattedDate: 'Nov 15, 2026, 04:45 PM CST',
    eventId: 'task_TSK-002_IN_REVIEW_ADMIN'
  }
];

/**
 * Retrieve notifications from persistent demo storage
 */
export function getStoredNotifications() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_NOTIFICATIONS));
      return INITIAL_NOTIFICATIONS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_NOTIFICATIONS;
  } catch (err) {
    console.error('Failed to parse stored notifications, resetting to defaults:', err);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_NOTIFICATIONS));
    return INITIAL_NOTIFICATIONS;
  }
}

/**
 * Persist notifications and broadcast change event
 */
export function saveNotifications(notifications) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
    window.dispatchEvent(new CustomEvent('notifications-updated', { detail: { count: notifications.length } }));
  } catch (err) {
    console.error('Failed to save notifications to localStorage:', err);
  }
}

/**
 * Get notifications filtered for the logged-in user or demo view
 * @param {Object} user Current user object { role, id, email }
 * @param {string} [overrideRole] Optional role override for demo perspective switcher
 */
export function getNotificationsForUser(user, overrideRole) {
  const notifications = getStoredNotifications();
  const effectiveRole = overrideRole || user?.role || 'EMPLOYEE';
  const effectiveId = user?.id || (effectiveRole === 'HR_ADMIN' ? 'HR_ADMIN' : 'EMP-006');

  return notifications.filter((notif) => {
    // If targeted to ALL
    if (notif.recipientId === 'ALL' || notif.recipientRole === 'ALL') {
      return true;
    }
    // If user is HR Admin
    if (effectiveRole === 'HR_ADMIN') {
      return notif.recipientId === 'HR_ADMIN' || notif.recipientRole === 'HR_ADMIN';
    }
    // If employee
    return notif.recipientId === effectiveId || notif.recipientId === 'EMP-006';
  }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/**
 * Get unread notification count for a user
 */
export function getUnreadCount(user, overrideRole) {
  const userNotifs = getNotificationsForUser(user, overrideRole);
  return userNotifs.filter((n) => !n.read).length;
}

/**
 * Create a new notification with duplicate prevention
 * @param {Object} payload { recipientId, recipientRole, type, title, message, link, eventId }
 * @returns {Object|null} Created notification or null if duplicate
 */
export function createNotification({
  recipientId,
  recipientRole = 'EMPLOYEE',
  type = 'announcement',
  title,
  message,
  link = '/dashboard',
  eventId = null
}) {
  const notifications = getStoredNotifications();

  // Strict duplicate prevention by eventId
  if (eventId && notifications.some((n) => n.eventId === eventId)) {
    // Notification for this business event already exists
    return null;
  }

  const now = new Date();
  const formattedDate = formatChicagoDate(now, {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }) + ' CST';

  const newNotif = {
    id: `NOTIF-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    recipientId,
    recipientRole,
    type,
    title,
    message,
    link,
    read: false,
    createdAt: now.toISOString(),
    formattedDate,
    eventId: eventId || `event_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
  };

  const updated = [newNotif, ...notifications];
  saveNotifications(updated);
  return newNotif;
}

/**
 * Mark a single notification as read
 */
export function markNotificationAsRead(notificationId) {
  const notifications = getStoredNotifications();
  const updated = notifications.map((n) => {
    if (n.id === notificationId) {
      return { ...n, read: true };
    }
    return n;
  });
  saveNotifications(updated);
}

/**
 * Mark a single notification as unread
 */
export function markNotificationAsUnread(notificationId) {
  const notifications = getStoredNotifications();
  const updated = notifications.map((n) => {
    if (n.id === notificationId) {
      return { ...n, read: false };
    }
    return n;
  });
  saveNotifications(updated);
}

/**
 * Mark all notifications as read for a given user
 */
export function markAllNotificationsAsRead(user, overrideRole) {
  const notifications = getStoredNotifications();
  const effectiveRole = overrideRole || user?.role || 'EMPLOYEE';
  const effectiveId = user?.id || (effectiveRole === 'HR_ADMIN' ? 'HR_ADMIN' : 'EMP-006');

  const updated = notifications.map((n) => {
    const isTarget =
      n.recipientId === 'ALL' ||
      (effectiveRole === 'HR_ADMIN' && (n.recipientId === 'HR_ADMIN' || n.recipientRole === 'HR_ADMIN')) ||
      (effectiveRole === 'EMPLOYEE' && (n.recipientId === effectiveId || n.recipientId === 'EMP-006'));

    if (isTarget) {
      return { ...n, read: true };
    }
    return n;
  });

  saveNotifications(updated);
}

/**
 * Delete a specific notification
 */
export function deleteNotification(notificationId) {
  const notifications = getStoredNotifications();
  const updated = notifications.filter((n) => n.id !== notificationId);
  saveNotifications(updated);
}

/**
 * Clear all notifications for a given user
 */
export function clearAllNotifications(user, overrideRole) {
  const notifications = getStoredNotifications();
  const effectiveRole = overrideRole || user?.role || 'EMPLOYEE';
  const effectiveId = user?.id || (effectiveRole === 'HR_ADMIN' ? 'HR_ADMIN' : 'EMP-006');

  const updated = notifications.filter((n) => {
    const isTarget =
      n.recipientId === 'ALL' ||
      (effectiveRole === 'HR_ADMIN' && (n.recipientId === 'HR_ADMIN' || n.recipientRole === 'HR_ADMIN')) ||
      (effectiveRole === 'EMPLOYEE' && (n.recipientId === effectiveId || n.recipientId === 'EMP-006'));

    return !isTarget;
  });

  saveNotifications(updated);
}

/**
 * Fetch notifications from MongoDB Atlas backend API
 */
export async function fetchNotificationsFromBackend() {
  try {
    const res = await api.get('/notifications');
    if (res.success && Array.isArray(res.notifications)) {
      const mapped = res.notifications.map((n) => ({
        id: n._id || n.id,
        recipientId: n.recipientId,
        recipientRole: n.recipientRole,
        type: n.type,
        title: n.title,
        message: n.message,
        link: n.link || '/dashboard',
        read: Boolean(n.read),
        createdAt: n.createdAt,
        formattedDate: n.createdAt ? new Date(n.createdAt).toLocaleDateString('en-US') : 'Recent',
        eventId: n.eventId,
      }));

      if (mapped.length > 0) {
        saveNotifications(mapped);
        return mapped;
      }
    }
  } catch (err) {
    console.warn('Backend notifications fetch error, using local fallback:', err);
  }
  return getStoredNotifications();
}

/**
 * Mark notification as read via backend API with fallback
 */
export async function markNotificationReadBackend(notificationId) {
  try {
    const res = await api.patch(`/notifications/${notificationId}/read`, {});
    if (res.success) {
      await fetchNotificationsFromBackend();
      return true;
    }
  } catch (err) {
    console.warn('Backend mark notification read error, falling back locally:', err);
  }
  markNotificationAsRead(notificationId);
  return true;
}

/**
 * Fetch unread notification count from live backend API
 */
export async function fetchUnreadCountFromBackend() {
  try {
    const res = await api.get('/notifications/unread-count');
    if (res.success && typeof res.unreadCount === 'number') {
      return res.unreadCount;
    }
  } catch (err) {
    console.warn('Backend unread count error:', err);
  }
  return 0;
}

/**
 * Mark all notifications as read on live backend API with fallback
 */
export async function markAllNotificationsReadBackend(userRole = 'EMPLOYEE', employeeId = null) {
  try {
    const res = await api.patch('/notifications/read-all', {});
    if (res.success) {
      await fetchNotificationsFromBackend();
      return true;
    }
  } catch (err) {
    console.warn('Backend mark all notifications read error, falling back locally:', err);
  }
  markAllNotificationsAsRead(userRole, employeeId);
  return true;
}

