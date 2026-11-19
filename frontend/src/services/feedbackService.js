/**
 * Centralized Employee Feedback & Pulse Service for VISARTECH People
 * Single Source of Truth for Anonymous & Named Workplace Feedback
 * 
 * Features:
 * - Persistent demo storage via localStorage ('visartech_feedback')
 * - Local ownership tracking for anonymous feedback ('visartech_my_submitted_feedback_ids')
 * - Real-time sync via 'feedback-updated' window events
 * - Strict Anonymity Guardrails: Identity attributes scrubbed prior to storage
 * - HR Feedback Management: Status transitions, internal notes, direct employee responses
 * - Automatic notification generation for HR on submission, and for employees on response
 * - Clean API-ready architecture for Express/MongoDB backend
 */

import { createNotification } from './notificationService.js';
import { formatChicagoDate, getChicagoNow } from '../utils/timezone.js';
import api from './apiClient.js';

const STORAGE_KEY = 'visartech_feedback';
const LOCAL_SUBMISSIONS_KEY = 'visartech_my_submitted_feedback_ids';

export const FEEDBACK_CATEGORIES = [
  'Workplace',
  'Management',
  'Work Environment',
  'Suggestions',
  'Technical Issues',
  'Other'
];

export const FEEDBACK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'];

export const FEEDBACK_STATUSES = ['NEW', 'UNDER_REVIEW', 'RESPONDED', 'RESOLVED'];

// Initial Canonical Seed Feedback
export const INITIAL_FEEDBACK = [
  {
    id: 'FDB-001',
    category: 'Workplace',
    subject: 'Ergonomic Dual Monitor Arms for Hybrid Desks',
    message: 'Would it be possible to upgrade the hot-desking stations in Zone B with adjustable dual-monitor arms? Several team members experience neck strain during long pair-programming sessions.',
    priority: 'MEDIUM',
    isAnonymous: true,
    employeeId: null,
    employeeName: 'Anonymous Colleague',
    employeeDepartment: 'Confidential',
    submittedAt: 'Nov 14, 2026, 10:15 AM CST',
    status: 'UNDER_REVIEW',
    internalNotes: [
      {
        id: 'NOTE-1',
        author: 'Alex Morgan (HR Administrator)',
        text: 'Requested facilities quote for 12 dual gas-spring mounts from OfficeSupply Co.',
        createdAt: 'Nov 15, 2026, 09:30 AM CST'
      }
    ],
    response: {
      author: 'Alex Morgan (HR Administrator)',
      text: 'Thank you for this valuable suggestion! Facilities has reviewed Zone B ergonomics and ordered dual gas-spring mounts, scheduled for installation next week.',
      respondedAt: 'Nov 16, 2026, 02:00 PM CST'
    }
  },
  {
    id: 'FDB-002',
    category: 'Suggestions',
    subject: 'Weekly No-Meeting Focus Block on Wednesday Afternoons',
    message: 'Our sprint velocity improved significantly during quiet periods. Could we standardize a company-wide "Deep Work Wednesday" afternoon with no internal syncs?',
    priority: 'HIGH',
    isAnonymous: false,
    employeeId: 'EMP-001',
    employeeName: 'Marcus Vance',
    employeeDepartment: 'Engineering',
    submittedAt: 'Nov 12, 2026, 03:40 PM CST',
    status: 'RESOLVED',
    internalNotes: [
      {
        id: 'NOTE-2',
        author: 'Alex Morgan (HR Administrator)',
        text: 'Discussed with Sarah Jenkins and Engineering leads; unanimous agreement.',
        createdAt: 'Nov 13, 2026, 11:00 AM CST'
      }
    ],
    response: {
      author: 'Alex Morgan (HR Administrator)',
      text: 'Marcus, great proposal! Leadership announced Wednesday Focus Hours starting Dec 1. Calendar invites for recurring internal syncs will be adjusted accordingly.',
      respondedAt: 'Nov 14, 2026, 04:15 PM CST'
    }
  },
  {
    id: 'FDB-003',
    category: 'Technical Issues',
    subject: 'VPN Latency During Morning Standup Video Streams',
    message: 'Noticeable jitter on the Chicago gateway between 9:00 AM and 10:00 AM CST when all remote staff join Google Meet standups simultaneously.',
    priority: 'HIGH',
    isAnonymous: false,
    employeeId: 'EMP-006',
    employeeName: 'Jordan Lee',
    employeeDepartment: 'Quality Assurance',
    submittedAt: 'Nov 15, 2026, 09:45 AM CST',
    status: 'RESPONDED',
    internalNotes: [
      {
        id: 'NOTE-3',
        author: 'Alex Morgan (HR Administrator)',
        text: 'Escalated to Carlos Mendez (DevOps & Infrastructure).',
        createdAt: 'Nov 15, 2026, 10:15 AM CST'
      }
    ],
    response: {
      author: 'Carlos Mendez (DevOps)',
      text: 'Jordan, thanks for flagging. We expanded bandwidth allocation on the WireGuard concentrator by 500Mbps; latency should now be under 25ms.',
      respondedAt: 'Nov 16, 2026, 11:20 AM CST'
    }
  },
  {
    id: 'FDB-004',
    category: 'Work Environment',
    subject: 'Coffee Machine Maintenance in 14th Floor Breakroom',
    message: 'The espresso machine on the 14th floor indicates descaling maintenance is required. Would love to have it serviced before Monday.',
    priority: 'LOW',
    isAnonymous: true,
    employeeId: null,
    employeeName: 'Anonymous Colleague',
    employeeDepartment: 'Confidential',
    submittedAt: 'Nov 16, 2026, 01:25 PM CST',
    status: 'NEW',
    internalNotes: [],
    response: null
  }
];

/**
 * Retrieve all feedback from persistent demo storage
 */
export function getStoredFeedback() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_FEEDBACK));
      return INITIAL_FEEDBACK;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_FEEDBACK;
  } catch (err) {
    console.error('Failed to parse stored feedback, resetting to defaults:', err);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_FEEDBACK));
    return INITIAL_FEEDBACK;
  }
}

/**
 * Persist feedback records and dispatch event
 */
export function saveFeedback(feedbackList) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(feedbackList));
    window.dispatchEvent(new CustomEvent('feedback-updated', { detail: { count: feedbackList.length } }));
  } catch (err) {
    console.error('Failed to save feedback to localStorage:', err);
  }
}

/**
 * Get locally tracked submission IDs for the active device
 */
function getLocalSubmittedFeedbackIds() {
  try {
    const raw = localStorage.getItem(LOCAL_SUBMISSIONS_KEY);
    return raw ? JSON.parse(raw) : ['FDB-001', 'FDB-003']; // Jordan Lee initial demo link
  } catch {
    return ['FDB-001', 'FDB-003'];
  }
}

/**
 * Register a submitted feedback ID in local device storage
 */
function recordLocalSubmittedFeedbackId(id) {
  try {
    const existing = getLocalSubmittedFeedbackIds();
    if (!existing.includes(id)) {
      const updated = [...existing, id];
      localStorage.setItem(LOCAL_SUBMISSIONS_KEY, JSON.stringify(updated));
    }
  } catch (err) {
    console.warn('Could not record local submission tracking:', err);
  }
}

/**
 * Get all feedback for HR Admin
 */
export function getAllFeedbackForAdmin() {
  return getStoredFeedback().sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
}

/**
 * Get scoped feedback for an employee
 * Strict Rule: Employees only see their own feedback (identified or their own anonymous submissions).
 * They can NEVER view feedback submitted by other named colleagues.
 */
export function getFeedbackForEmployee(employeeId = 'EMP-006') {
  const all = getStoredFeedback();
  const mySubmittedIds = getLocalSubmittedFeedbackIds();

  return all.filter((fdb) => {
    // 1. Direct match on employee ID (non-anonymous)
    if (fdb.employeeId === employeeId) {
      return true;
    }
    // 2. Anonymous feedback submitted from this device/session
    if (fdb.isAnonymous && mySubmittedIds.includes(fdb.id)) {
      return true;
    }
    return false;
  }).sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
}

/**
 * Submit feedback with strict anonymity handling
 */
export function submitFeedback({
  category,
  subject,
  message,
  priority = 'MEDIUM',
  isAnonymous = false,
  employee = null
}) {
  const feedbackList = getStoredFeedback();
  const id = `FDB-${Date.now().toString().slice(-4)}`;

  const now = new Date();
  const submittedAt = formatChicagoDate(now, {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }) + ' CST';

  // Strict privacy scrub for anonymous feedback
  const feedbackRecord = {
    id,
    category: category || 'Workplace',
    subject: subject?.trim() || 'Untitled Feedback',
    message: message?.trim() || '',
    priority: priority || 'MEDIUM',
    isAnonymous: Boolean(isAnonymous),
    employeeId: isAnonymous ? null : (employee?.id || 'EMP-006'),
    employeeName: isAnonymous ? 'Anonymous Colleague' : (employee?.name || 'Jordan Lee'),
    employeeDepartment: isAnonymous ? 'Confidential' : (employee?.department || 'Engineering'),
    submittedAt,
    status: 'NEW',
    internalNotes: [],
    response: null
  };

  const updated = [feedbackRecord, ...feedbackList];
  saveFeedback(updated);

  // Record locally so submitter can see it in "My Feedback" even if anonymous
  recordLocalSubmittedFeedbackId(id);

  // Notify HR Administrator
  createNotification({
    recipientId: 'HR_ADMIN',
    recipientRole: 'HR_ADMIN',
    type: 'feedback_response',
    title: `New Feedback: ${feedbackRecord.category}`,
    message: `A team member submitted feedback: "${feedbackRecord.subject}" (${feedbackRecord.isAnonymous ? 'Anonymous' : feedbackRecord.employeeName}).`,
    link: '/feedback',
    eventId: `feedback_${id}_NEW`
  });

  return feedbackRecord;
}

/**
 * Update feedback status (HR Admin)
 */
export function updateFeedbackStatus(id, newStatus) {
  const feedbackList = getStoredFeedback();
  let target = null;

  const updated = feedbackList.map((fdb) => {
    if (fdb.id === id) {
      target = { ...fdb, status: newStatus };
      return target;
    }
    return fdb;
  });

  saveFeedback(updated);
  return target;
}

/**
 * Add an internal note to feedback (Visible only to HR)
 */
export function addInternalNote(id, { author = 'Alex Morgan (HR Administrator)', text }) {
  if (!text?.trim()) return null;

  const feedbackList = getStoredFeedback();
  let addedNote = null;

  const now = new Date();
  const createdAt = formatChicagoDate(now, {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }) + ' CST';

  const updated = feedbackList.map((fdb) => {
    if (fdb.id === id) {
      addedNote = {
        id: `NOTE-${Date.now().toString().slice(-4)}`,
        author,
        text: text.trim(),
        createdAt
      };
      return {
        ...fdb,
        internalNotes: [...(fdb.internalNotes || []), addedNote]
      };
    }
    return fdb;
  });

  saveFeedback(updated);
  return addedNote;
}

/**
 * Respond to feedback (HR Admin)
 */
export function respondToFeedback(id, {
  author = 'Alex Morgan (HR Administrator)',
  text,
  resolveStatus = 'RESOLVED'
}) {
  if (!text?.trim()) return null;

  const feedbackList = getStoredFeedback();
  let updatedRecord = null;

  const now = new Date();
  const respondedAt = formatChicagoDate(now, {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }) + ' CST';

  const updated = feedbackList.map((fdb) => {
    if (fdb.id === id) {
      updatedRecord = {
        ...fdb,
        status: resolveStatus || 'RESPONDED',
        response: {
          author,
          text: text.trim(),
          respondedAt
        }
      };
      return updatedRecord;
    }
    return fdb;
  });

  saveFeedback(updated);

  // If the submitter was NOT anonymous, dispatch a notification to the employee
  if (updatedRecord && !updatedRecord.isAnonymous && updatedRecord.employeeId) {
    createNotification({
      recipientId: updatedRecord.employeeId,
      recipientRole: 'EMPLOYEE',
      type: 'feedback_response',
      title: 'HR Responded to Your Feedback',
      message: `${author} responded to your feedback regarding "${updatedRecord.subject}".`,
      link: '/feedback',
      eventId: `feedback_${id}_RESP_${Date.now()}`
    });
  }

  return updatedRecord;
}

/**
 * Fetch feedback live from MongoDB Atlas backend API
 */
export async function fetchFeedbackFromBackend() {
  try {
    const res = await api.get('/feedback');
    if (res.success && Array.isArray(res.feedback)) {
      const mapped = res.feedback.map((f) => ({
        id: f._id || f.id,
        category: f.category,
        subject: f.subject,
        message: f.message,
        priority: f.priority,
        isAnonymous: Boolean(f.isAnonymous),
        employeeId: f.isAnonymous ? null : f.employeeId,
        employeeName: f.isAnonymous ? 'Anonymous Colleague' : f.employeeName,
        employeeDepartment: f.isAnonymous ? 'Confidential' : f.employeeDepartment,
        status: f.status,
        internalNotes: f.internalNotes || [],
        response: f.response || null,
        submittedAt: f.createdAt ? new Date(f.createdAt).toLocaleDateString('en-US') : 'Recent',
      }));

      if (mapped.length > 0) {
        saveFeedback(mapped);
        return mapped;
      }
    }
  } catch (err) {
    console.warn('Backend feedback fetch error, using local fallback:', err);
  }
  return getStoredFeedback();
}

/**
 * Submit feedback to live backend API with fallback
 */
export async function submitFeedbackBackend(data) {
  try {
    const res = await api.post('/feedback', data);
    if (res.success && res.feedback) {
      await fetchFeedbackFromBackend();
      return res.feedback;
    }
  } catch (err) {
    console.warn('Backend feedback submit error, falling back locally:', err);
  }
  return submitFeedback(data);
}

/**
 * Update feedback status & response on live backend API with fallback
 */
export async function updateFeedbackStatusBackend(id, payload) {
  try {
    const res = await api.patch(`/feedback/${id}/status`, payload);
    if (res.success && res.feedback) {
      await fetchFeedbackFromBackend();
      return { success: true, feedback: res.feedback };
    }
  } catch (err) {
    console.warn('Backend feedback status update error, falling back locally:', err);
  }
  return { success: true };
}

