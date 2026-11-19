/**
 * Centralized Announcement Data Service for VISARTECH People
 * Single Source of Truth for Company-Wide and Targeted Bulletins
 * 
 * Features:
 * - Persistent demo storage via localStorage ('visartech_announcements')
 * - Real-time sync via 'announcements-updated' window events
 * - Role-based scoping (Admin sees all; Employees see only targeted published announcements)
 * - Automatic targeted notification generation with duplicate prevention
 * - Read/unread tracking per employee
 * - Clean API-ready architecture for Express/MongoDB backend
 */

import { getEmployees } from './employeeService.js';
import { createNotification } from './notificationService.js';
import { formatChicagoDate, getChicagoNow } from '../utils/timezone.js';
import api from './apiClient.js';

const STORAGE_KEY = 'visartech_announcements';

export const ANNOUNCEMENT_CATEGORIES = [
  'General',
  'HR Updates',
  'Company Events',
  'Holidays',
  'Policy Updates',
  'Important Notices'
];

export const ANNOUNCEMENT_AUDIENCES = [
  'All Employees',
  'Selected Department',
  'Selected Employees'
];

export const ANNOUNCEMENT_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'];

export const ANNOUNCEMENT_STATUSES = ['PUBLISHED', 'DRAFT', 'ARCHIVED'];

// Initial Canonical Seed Announcements
export const INITIAL_ANNOUNCEMENTS = [
  {
    id: 'ANN-001',
    title: 'Company All-Hands Meeting — Q4 Townhall & Strategic Roadmap',
    description: 'Join executive leadership this Thursday at 2:00 PM CST for our comprehensive quarterly review of company milestones, enterprise customer wins, and strategic growth initiatives for 2027. Q&A session will follow the presentation. Virtual attendance links have been dispatched to company calendars.',
    category: 'Company Events',
    priority: 'HIGH',
    targetAudience: 'All Employees',
    targetDepartment: null,
    targetEmployeeIds: [],
    publishDate: '2026-11-15',
    expiryDate: '2026-12-01',
    author: 'Alex Morgan (HR Administrator)',
    status: 'PUBLISHED',
    pinned: true,
    readBy: ['EMP-001', 'EMP-002', 'EMP-003'],
    createdAt: '2026-11-15T09:00:00Z'
  },
  {
    id: 'ANN-002',
    title: 'Annual Healthcare, Vision & Dental Open Enrollment 2027',
    description: 'The annual open enrollment window for healthcare coverage, flexible spending accounts (FSA), and 401(k) retirement employer match is now open through November 30, 2026. All eligible full-time staff are encouraged to review updated tiers and submit plan elections via the benefits portal.',
    category: 'HR Updates',
    priority: 'HIGH',
    targetAudience: 'All Employees',
    targetDepartment: null,
    targetEmployeeIds: [],
    publishDate: '2026-11-10',
    expiryDate: '2026-11-30',
    author: 'Sarah Jenkins (VP of People)',
    status: 'PUBLISHED',
    pinned: true,
    readBy: ['EMP-001', 'EMP-004', 'EMP-006'],
    createdAt: '2026-11-10T08:30:00Z'
  },
  {
    id: 'ANN-003',
    title: 'Upcoming Thanksgiving Holiday Office Closure Schedule',
    description: 'In observance of Thanksgiving, VISARTECH corporate offices will be closed on Thursday, November 26 and Friday, November 27, 2026. Regular business hours will resume Monday, November 30. Cloud infrastructure on-call schedules remain active as designated by Engineering.',
    category: 'Holidays',
    priority: 'MEDIUM',
    targetAudience: 'All Employees',
    targetDepartment: null,
    targetEmployeeIds: [],
    publishDate: '2026-11-12',
    expiryDate: '2026-11-28',
    author: 'Alex Morgan (HR Administrator)',
    status: 'PUBLISHED',
    pinned: false,
    readBy: ['EMP-006'],
    createdAt: '2026-11-12T10:00:00Z'
  },
  {
    id: 'ANN-004',
    title: 'Engineering Pull Request Standards & SonarQube Quality Gates',
    description: 'Starting this week, all backend and frontend pull requests into main branches mandate automated lint verification, minimum 80% unit test coverage thresholds, and SonarQube quality gate compliance. Please review the updated Engineering Standards document.',
    category: 'Policy Updates',
    priority: 'HIGH',
    targetAudience: 'Selected Department',
    targetDepartment: 'Engineering',
    targetEmployeeIds: [],
    publishDate: '2026-11-08',
    expiryDate: '2026-12-31',
    author: 'Marcus Vance (Lead Architect)',
    status: 'PUBLISHED',
    pinned: false,
    readBy: ['EMP-001'],
    createdAt: '2026-11-08T14:15:00Z'
  },
  {
    id: 'ANN-005',
    title: 'Mandatory Cyber-Security Awareness Training 2026 (Draft)',
    description: 'Mandatory annual interactive cyber-defense and phishing prevention simulations will roll out in December. All team members must complete the 20-minute module before Dec 22.',
    category: 'Important Notices',
    priority: 'MEDIUM',
    targetAudience: 'All Employees',
    targetDepartment: null,
    targetEmployeeIds: [],
    publishDate: '2026-11-20',
    expiryDate: '2026-12-22',
    author: 'Alex Morgan (HR Administrator)',
    status: 'DRAFT',
    pinned: false,
    readBy: [],
    createdAt: '2026-11-14T11:20:00Z'
  },
  {
    id: 'ANN-006',
    title: 'Summer Innovation Hackathon 2026 Highlights & Awards (Archived)',
    description: 'Congratulations to Team Polaris for winning the 2026 VISARTECH AI Agent Hackathon! Photo galleries, recorded demos, and executive retrospectives have been archived in the knowledge repository.',
    category: 'Company Events',
    priority: 'LOW',
    targetAudience: 'All Employees',
    targetDepartment: null,
    targetEmployeeIds: [],
    publishDate: '2026-07-20',
    expiryDate: '2026-08-01',
    author: 'Alex Morgan (HR Administrator)',
    status: 'ARCHIVED',
    pinned: false,
    readBy: ['EMP-001', 'EMP-002', 'EMP-003', 'EMP-004', 'EMP-005', 'EMP-006'],
    createdAt: '2026-07-20T16:00:00Z'
  }
];

/**
 * Retrieve all announcements from persistent demo storage
 */
export function getStoredAnnouncements() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_ANNOUNCEMENTS));
      return INITIAL_ANNOUNCEMENTS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_ANNOUNCEMENTS;
  } catch (err) {
    console.error('Failed to parse stored announcements, resetting to defaults:', err);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_ANNOUNCEMENTS));
    return INITIAL_ANNOUNCEMENTS;
  }
}

/**
 * Persist announcements and broadcast change event
 */
export function saveAnnouncements(announcements) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(announcements));
    window.dispatchEvent(new CustomEvent('announcements-updated', { detail: { count: announcements.length } }));
  } catch (err) {
    console.error('Failed to save announcements to localStorage:', err);
  }
}

/**
 * Get all announcements for HR Administrator
 */
export function getAnnouncementsForAdmin() {
  return getStoredAnnouncements().sort((a, b) => {
    // Pinned first, then by publishDate descending
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.publishDate || b.createdAt) - new Date(a.publishDate || a.createdAt);
  });
}

/**
 * Get scoped published announcements for an employee
 * Strict Rule: Employees can NEVER view DRAFT or ARCHIVED announcements,
 * and must be part of the target audience (All Employees, matching Department, or explicitly selected).
 */
export function getAnnouncementsForEmployee(employeeId = 'EMP-006', department = 'Engineering') {
  const all = getStoredAnnouncements();

  return all.filter((ann) => {
    // 1. Must be strictly published
    if (ann.status !== 'PUBLISHED') {
      return false;
    }

    // 2. Audience Check
    if (ann.targetAudience === 'All Employees') {
      return true;
    }

    if (ann.targetAudience === 'Selected Department') {
      return ann.targetDepartment === department;
    }

    if (ann.targetAudience === 'Selected Employees') {
      return Array.isArray(ann.targetEmployeeIds) && ann.targetEmployeeIds.includes(employeeId);
    }

    return false;
  }).sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.publishDate || b.createdAt) - new Date(a.publishDate || a.createdAt);
  });
}

/**
 * Determine which employees should be targeted by an announcement
 */
function resolveTargetedEmployees(announcement) {
  const allEmployees = getEmployees();
  if (announcement.targetAudience === 'All Employees') {
    return allEmployees;
  }
  if (announcement.targetAudience === 'Selected Department') {
    return allEmployees.filter((e) => e.department === announcement.targetDepartment);
  }
  if (announcement.targetAudience === 'Selected Employees') {
    return allEmployees.filter((e) => announcement.targetEmployeeIds?.includes(e.id));
  }
  return [];
}

/**
 * Broadcast notifications for a published announcement
 */
function dispatchAnnouncementNotifications(announcement) {
  if (announcement.status !== 'PUBLISHED') return;

  const targetEmployees = resolveTargetedEmployees(announcement);
  targetEmployees.forEach((emp) => {
    createNotification({
      recipientId: emp.id,
      recipientRole: 'EMPLOYEE',
      type: 'announcement',
      title: `New Announcement: ${announcement.title.slice(0, 45)}...`,
      message: `${announcement.author} posted "${announcement.title}".`,
      link: '/announcements',
      eventId: `announcement_${announcement.id}_${emp.id}`
    });
  });
}

/**
 * Create a new announcement
 */
export function createAnnouncement(payload) {
  const announcements = getStoredAnnouncements();
  const id = `ANN-${Date.now().toString().slice(-4)}`;

  const newAnn = {
    id,
    title: payload.title?.trim() || 'Untitled Announcement',
    description: payload.description?.trim() || '',
    category: payload.category || 'General',
    priority: payload.priority || 'MEDIUM',
    targetAudience: payload.targetAudience || 'All Employees',
    targetDepartment: payload.targetAudience === 'Selected Department' ? payload.targetDepartment : null,
    targetEmployeeIds: payload.targetAudience === 'Selected Employees' ? payload.targetEmployeeIds || [] : [],
    publishDate: payload.publishDate || new Date().toISOString().split('T')[0],
    expiryDate: payload.expiryDate || '',
    author: payload.author || 'Alex Morgan (HR Administrator)',
    status: payload.status || 'PUBLISHED',
    pinned: Boolean(payload.pinned),
    readBy: [],
    createdAt: new Date().toISOString()
  };

  const updated = [newAnn, ...announcements];
  saveAnnouncements(updated);

  // If created directly in PUBLISHED status, dispatch notifications
  if (newAnn.status === 'PUBLISHED') {
    dispatchAnnouncementNotifications(newAnn);
  }

  return newAnn;
}

/**
 * Update an existing announcement
 */
export function updateAnnouncement(id, updates) {
  const announcements = getStoredAnnouncements();
  let updatedAnn = null;

  const updated = announcements.map((ann) => {
    if (ann.id === id) {
      const previouslyDraft = ann.status !== 'PUBLISHED';
      updatedAnn = {
        ...ann,
        ...updates,
        targetDepartment: updates.targetAudience === 'Selected Department' ? updates.targetDepartment : null,
        targetEmployeeIds: updates.targetAudience === 'Selected Employees' ? updates.targetEmployeeIds || [] : []
      };

      // If transitioning to PUBLISHED, send notifications
      if (previouslyDraft && updatedAnn.status === 'PUBLISHED') {
        dispatchAnnouncementNotifications(updatedAnn);
      }

      return updatedAnn;
    }
    return ann;
  });

  saveAnnouncements(updated);
  return updatedAnn;
}

/**
 * Archive an announcement
 */
export function archiveAnnouncement(id) {
  return updateAnnouncement(id, { status: 'ARCHIVED' });
}

/**
 * Delete an announcement permanently
 */
export function deleteAnnouncement(id) {
  const announcements = getStoredAnnouncements();
  const updated = announcements.filter((ann) => ann.id !== id);
  saveAnnouncements(updated);
  return true;
}

/**
 * Mark an announcement as read for an employee
 */
export function markAnnouncementAsRead(announcementId, employeeId) {
  const announcements = getStoredAnnouncements();
  const updated = announcements.map((ann) => {
    if (ann.id === announcementId) {
      const readBySet = new Set(ann.readBy || []);
      readBySet.add(employeeId);
      return {
        ...ann,
        readBy: Array.from(readBySet)
      };
    }
    return ann;
  });
  saveAnnouncements(updated);
}

/**
 * Fetch announcements live from MongoDB Atlas backend API
 */
export async function fetchAnnouncementsFromBackend() {
  try {
    const res = await api.get('/announcements');
    if (res.success && Array.isArray(res.announcements)) {
      const mapped = res.announcements.map((a) => ({
        id: a._id || a.id,
        title: a.title,
        description: a.description,
        category: a.category,
        priority: a.priority,
        targetAudience: a.targetAudience,
        targetDepartment: a.targetDepartment,
        publishDate: a.publishDate,
        expiryDate: a.expiryDate,
        author: a.author,
        status: a.status,
        pinned: a.pinned,
        readBy: a.readBy || [],
        createdAt: a.createdAt,
      }));

      if (mapped.length > 0) {
        saveAnnouncements(mapped);
        return mapped;
      }
    }
  } catch (err) {
    console.warn('Backend announcements fetch error, using local fallback:', err);
  }
  return getStoredAnnouncements();
}

/**
 * Create announcement on live backend API with fallback
 */
export async function createAnnouncementBackend(data) {
  try {
    const res = await api.post('/announcements', data);
    if (res.success && res.announcement) {
      await fetchAnnouncementsFromBackend();
      return res.announcement;
    }
  } catch (err) {
    console.warn('Backend announcement create error, falling back locally:', err);
  }
  return createAnnouncement(data);
}

/**
 * Mark announcement as read on backend with local fallback
 */
export async function markAnnouncementReadBackend(announcementId, employeeId) {
  try {
    const res = await api.post(`/announcements/${announcementId}/read`, {});
    if (res.success) {
      await fetchAnnouncementsFromBackend();
      return true;
    }
  } catch (err) {
    console.warn('Backend mark announcement read error, falling back locally:', err);
  }
  markAnnouncementAsRead(announcementId, employeeId);
  return true;
}

/**
 * Update announcement on backend with local fallback
 */
export async function updateAnnouncementBackend(id, data) {
  try {
    const res = await api.put(`/announcements/${id}`, data);
    if (res.success && res.announcement) {
      await fetchAnnouncementsFromBackend();
      return res.announcement;
    }
  } catch (err) {
    console.warn('Backend update announcement error, falling back locally:', err);
  }
  return updateAnnouncement(id, data);
}

/**
 * Delete / Archive announcement on backend with local fallback
 */
export async function deleteAnnouncementBackend(id, permanent = false) {
  try {
    const endpoint = permanent ? `/announcements/${id}?permanent=true` : `/announcements/${id}`;
    const res = await api.delete(endpoint);
    if (res.success) {
      await fetchAnnouncementsFromBackend();
      return true;
    }
  } catch (err) {
    console.warn('Backend delete announcement error, falling back locally:', err);
  }
  return deleteAnnouncement(id);
}

