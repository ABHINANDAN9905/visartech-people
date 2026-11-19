/**
 * Centralized Leave Management Service for VISARTECH People
 * Single Source of Truth for Leave Balances, Requests, Approvals, and History.
 * 
 * Architecture:
 * - Persistent demo storage via localStorage (visartech_leave_requests, visartech_leave_balances)
 * - Explicitly modular & API-ready for direct migration to MongoDB / Express backend.
 * - Enforces business rules:
 *    * End Date >= Start Date
 *    * Overlap prevention for the same employee
 *    * Balance deduction strictly on approval (never twice)
 *    * Cancel permitted only on PENDING requests by owner/admin
 * - Dispatches 'leaves-updated' and 'visartech-notification' window events.
 */

import { getEmployees, getEmployeeById } from './employeeService.js';
import { formatChicagoDate, getChicagoNow } from '../utils/timezone.js';
import { createNotification } from './notificationService.js';
import api from './apiClient.js';

const STORAGE_KEY_REQUESTS = 'visartech_leave_requests';
const STORAGE_KEY_BALANCES = 'visartech_leave_balances';
const STORAGE_KEY_NOTIFICATIONS = 'visartech_leave_notifications';

// Default initial leave balances per employee (Annual allocation)
export const DEFAULT_LEAVE_ENTITLEMENTS = {
  casual: 6,   // Casual / Personal Leave
  sick: 8,     // Sick / Medical Leave
  paid: 14,    // Paid Annual Vacation
};

// Seed initial leave balances for all 6 canonical employees
export const INITIAL_LEAVE_BALANCES = {
  'EMP-001': {
    casual: { total: 6, used: 1, remaining: 5 },
    sick: { total: 8, used: 0, remaining: 8 },
    paid: { total: 14, used: 2, remaining: 12 },
    unpaid: { used: 0 },
  },
  'EMP-002': {
    casual: { total: 6, used: 2, remaining: 4 },
    sick: { total: 8, used: 4, remaining: 4 },
    paid: { total: 14, used: 5, remaining: 9 },
    unpaid: { used: 0 },
  },
  'EMP-003': {
    casual: { total: 6, used: 1, remaining: 5 },
    sick: { total: 8, used: 1, remaining: 7 },
    paid: { total: 14, used: 4, remaining: 10 },
    unpaid: { used: 0 },
  },
  'EMP-004': {
    casual: { total: 6, used: 0, remaining: 6 },
    sick: { total: 8, used: 2, remaining: 6 },
    paid: { total: 14, used: 4, remaining: 10 },
    unpaid: { used: 0 },
  },
  'EMP-005': {
    casual: { total: 6, used: 3, remaining: 3 },
    sick: { total: 8, used: 1, remaining: 7 },
    paid: { total: 14, used: 3, remaining: 11 },
    unpaid: { used: 0 },
  },
  'EMP-006': {
    casual: { total: 6, used: 2, remaining: 4 },
    sick: { total: 8, used: 3, remaining: 5 },
    paid: { total: 14, used: 5, remaining: 9 },
    unpaid: { used: 0 },
  },
};

// Seed initial leave requests for the organization
export const INITIAL_LEAVE_REQUESTS = [
  {
    id: 'LV-2026-001',
    employeeId: 'EMP-001',
    employeeName: 'Marcus Vance',
    employeeRole: 'Lead Full Stack Architect',
    department: 'Engineering',
    leaveType: 'Paid',
    leaveTypeLabel: 'Paid Annual Leave',
    startDate: '2026-11-25',
    endDate: '2026-11-27',
    days: 3,
    status: 'PENDING',
    reason: 'Thanksgiving family gathering and annual vacation with relatives.',
    appliedAt: '2026-11-16T14:30:00Z',
    reviewedAt: null,
    reviewedBy: null,
    reviewerComments: null,
    attachment: null,
  },
  {
    id: 'LV-2026-002',
    employeeId: 'EMP-002',
    employeeName: 'Elena Rostova',
    employeeRole: 'Senior Product Designer',
    department: 'Product & Design',
    leaveType: 'Sick',
    leaveTypeLabel: 'Sick Leave',
    startDate: '2026-11-17',
    endDate: '2026-11-18',
    days: 2,
    status: 'PENDING',
    reason: 'Outpatient treatment and doctor recommended recovery.',
    appliedAt: '2026-11-17T08:15:00Z',
    reviewedAt: null,
    reviewedBy: null,
    reviewerComments: null,
    attachment: 'medical_certificate_nov17.pdf',
  },
  {
    id: 'LV-2026-003',
    employeeId: 'EMP-006',
    employeeName: 'Jordan Lee',
    employeeRole: 'Full Stack Software Engineer',
    department: 'Engineering',
    leaveType: 'Paid',
    leaveTypeLabel: 'Paid Annual Leave',
    startDate: '2026-12-24',
    endDate: '2026-12-26',
    days: 3,
    status: 'PENDING',
    reason: 'Winter holidays and annual travel.',
    appliedAt: '2026-11-14T10:00:00Z',
    reviewedAt: null,
    reviewedBy: null,
    reviewerComments: null,
    attachment: null,
  },
  {
    id: 'LV-2026-004',
    employeeId: 'EMP-005',
    employeeName: 'Liam Novak',
    employeeRole: 'QA Automation Specialist',
    department: 'QA',
    leaveType: 'Casual',
    leaveTypeLabel: 'Casual Leave',
    startDate: '2026-11-10',
    endDate: '2026-11-11',
    days: 2,
    status: 'APPROVED',
    reason: 'Moving to new apartment and family errands.',
    appliedAt: '2026-11-08T10:00:00Z',
    reviewedAt: '2026-11-09T11:00:00Z',
    reviewedBy: 'Alex Morgan (HR Administrator)',
    reviewerComments: 'Approved. Handover tasks assigned to Maya.',
    attachment: null,
  },
  {
    id: 'LV-2026-005',
    employeeId: 'EMP-003',
    employeeName: 'David Chen',
    employeeRole: 'DevOps & Cloud Engineer',
    department: 'Infrastructure',
    leaveType: 'Sick',
    leaveTypeLabel: 'Sick Leave',
    startDate: '2026-11-04',
    endDate: '2026-11-05',
    days: 1,
    status: 'REJECTED',
    reason: 'Emergency personal maintenance.',
    appliedAt: '2026-11-03T16:45:00Z',
    reviewedAt: '2026-11-04T09:00:00Z',
    reviewedBy: 'Alex Morgan (HR Administrator)',
    reviewerComments: 'Critical cloud deployment scheduled during this window. Please reschedule with Lead Architect.',
    attachment: null,
  },
  {
    id: 'LV-2026-006',
    employeeId: 'EMP-004',
    employeeName: 'Maya Patel',
    employeeRole: 'Frontend Software Engineer',
    department: 'Engineering',
    leaveType: 'Paid',
    leaveTypeLabel: 'Paid Annual Leave',
    startDate: '2026-11-20',
    endDate: '2026-11-21',
    days: 2,
    status: 'APPROVED',
    reason: 'Attending React Architecture summit in Chicago.',
    appliedAt: '2026-11-15T11:30:00Z',
    reviewedAt: '2026-11-15T16:00:00Z',
    reviewedBy: 'Alex Morgan (HR Administrator)',
    reviewerComments: 'Approved! Share your learnings in next sprint review.',
    attachment: 'react_summit_pass.pdf',
  },
];

// Helper: Calculate number of days (inclusive)
export function calculateLeaveDays(startDateStr, endDateStr) {
  if (!startDateStr || !endDateStr) return 0;
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 0;

  // Count calendar days inclusive (or weekdays)
  // In standard business practices, calculate business days (excluding Sat & Sun)
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const dayOfWeek = cur.getDay(); // 0 is Sun, 6 is Sat
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    cur.setDate(cur.getDate() + 1);
  }

  // If start and end are on a weekend, fallback to at least 1 if valid
  return count > 0 ? count : 1;
}

// -------------------------------------------------------------
// Storage Accessors (Simulated API Layer)
// -------------------------------------------------------------

export function getStoredLeaveRequests() {
  try {
    const data = localStorage.getItem(STORAGE_KEY_REQUESTS);
    if (!data) {
      localStorage.setItem(STORAGE_KEY_REQUESTS, JSON.stringify(INITIAL_LEAVE_REQUESTS));
      return INITIAL_LEAVE_REQUESTS;
    }
    return JSON.parse(data);
  } catch {
    return INITIAL_LEAVE_REQUESTS;
  }
}

function saveStoredLeaveRequests(requests) {
  try {
    localStorage.setItem(STORAGE_KEY_REQUESTS, JSON.stringify(requests));
    window.dispatchEvent(new Event('leaves-updated'));
  } catch (err) {
    console.error('Error saving leave requests:', err);
  }
}

export function getStoredLeaveBalances() {
  try {
    const data = localStorage.getItem(STORAGE_KEY_BALANCES);
    if (!data) {
      localStorage.setItem(STORAGE_KEY_BALANCES, JSON.stringify(INITIAL_LEAVE_BALANCES));
      return INITIAL_LEAVE_BALANCES;
    }
    return JSON.parse(data);
  } catch {
    return INITIAL_LEAVE_BALANCES;
  }
}

function saveStoredLeaveBalances(balances) {
  try {
    localStorage.setItem(STORAGE_KEY_BALANCES, JSON.stringify(balances));
    window.dispatchEvent(new Event('leaves-updated'));
  } catch (err) {
    console.error('Error saving leave balances:', err);
  }
}

// -------------------------------------------------------------
// In-App Notification Engine
// -------------------------------------------------------------

export function getLeaveNotifications(targetUserRole = null, targetEmployeeId = null) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_NOTIFICATIONS);
    const notifications = raw ? JSON.parse(raw) : [];
    if (!targetUserRole && !targetEmployeeId) return notifications;

    return notifications.filter((n) => {
      if (targetUserRole === 'HR_ADMIN' && n.targetRole === 'HR_ADMIN') return true;
      if (targetEmployeeId && n.targetEmployeeId === targetEmployeeId) return true;
      return false;
    });
  } catch {
    return [];
  }
}

export function addLeaveNotification(notification) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_NOTIFICATIONS);
    const notifications = raw ? JSON.parse(raw) : [];
    const newNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      read: false,
      ...notification,
    };
    notifications.unshift(newNotification);
    localStorage.setItem(STORAGE_KEY_NOTIFICATIONS, JSON.stringify(notifications.slice(0, 50)));
    window.dispatchEvent(new CustomEvent('visartech-notification', { detail: newNotification }));

    // Sync to unified notificationService with duplicate protection
    createNotification({
      recipientId: notification.targetEmployeeId || (notification.targetRole === 'HR_ADMIN' ? 'HR_ADMIN' : 'ALL'),
      recipientRole: notification.targetRole || 'EMPLOYEE',
      type: notification.type === 'APPROVED' ? 'leave_approved' : (notification.type === 'REJECTED' ? 'leave_rejected' : 'leave_approved'),
      title: notification.title || 'Leave Update',
      message: notification.message || 'Your leave status was updated.',
      link: '/leaves',
      eventId: `leave_${notification.requestId || newNotification.id}_${notification.type}`
    });
  } catch (err) {
    console.error('Error saving notification:', err);
  }
}

// -------------------------------------------------------------
// Core Business Logic & Queries
// -------------------------------------------------------------

/**
 * Returns leave balances for a specific employee
 */
export function getEmployeeLeaveBalance(employeeId) {
  const allBalances = getStoredLeaveBalances();
  const requests = getStoredLeaveRequests();

  const balance = allBalances[employeeId] || {
    casual: { total: 6, used: 0, remaining: 6 },
    sick: { total: 8, used: 0, remaining: 8 },
    paid: { total: 14, used: 0, remaining: 14 },
    unpaid: { used: 0 },
  };

  const pendingRequests = requests.filter(
    (r) => r.employeeId === employeeId && r.status === 'PENDING'
  );

  const totalRemaining =
    balance.casual.remaining + balance.sick.remaining + balance.paid.remaining;
  const totalUsed =
    balance.casual.used + balance.sick.used + balance.paid.used;

  return {
    ...balance,
    totalRemaining,
    totalUsed,
    pendingCount: pendingRequests.length,
    pendingRequests,
  };
}

/**
 * Check if the requested date range overlaps with an existing active (PENDING or APPROVED) request
 */
export function checkLeaveOverlap(employeeId, startDateStr, endDateStr, excludeRequestId = null) {
  const requests = getStoredLeaveRequests();
  const reqStart = new Date(startDateStr);
  const reqEnd = new Date(endDateStr);

  const activeRequests = requests.filter((r) => {
    if (r.employeeId !== employeeId) return false;
    if (r.status !== 'PENDING' && r.status !== 'APPROVED') return false;
    if (excludeRequestId && r.id === excludeRequestId) return false;
    return true;
  });

  for (const existing of activeRequests) {
    const exStart = new Date(existing.startDate);
    const exEnd = new Date(existing.endDate);

    // Overlap occurs if reqStart <= exEnd and reqEnd >= exStart
    if (reqStart <= exEnd && reqEnd >= exStart) {
      return {
        hasOverlap: true,
        conflictingRequest: existing,
      };
    }
  }

  return { hasOverlap: false, conflictingRequest: null };
}

/**
 * Submit a new leave application (EMPLOYEE action)
 */
export function applyForLeave({
  employeeId,
  leaveType, // 'Casual' | 'Sick' | 'Paid' | 'Unpaid'
  startDate,
  endDate,
  reason,
  attachment = null,
}) {
  // 1. Validation: required fields
  if (!employeeId || !leaveType || !startDate || !endDate || !reason?.trim()) {
    return {
      success: false,
      error: 'Please fill in all required fields (Leave Type, Start Date, End Date, and Reason).',
    };
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return {
      success: false,
      error: 'Invalid start or end date format provided.',
    };
  }

  if (end < start) {
    return {
      success: false,
      error: 'End Date cannot be prior to Start Date.',
    };
  }

  // Calculate duration
  const days = calculateLeaveDays(startDate, endDate);
  if (days <= 0) {
    return {
      success: false,
      error: 'Calculated duration must be at least 1 business day.',
    };
  }

  // 2. Overlap check
  const overlapCheck = checkLeaveOverlap(employeeId, startDate, endDate);
  if (overlapCheck.hasOverlap) {
    const c = overlapCheck.conflictingRequest;
    return {
      success: false,
      error: `Leave dates conflict with an existing ${c.status} request (${c.id}: ${c.startDate} to ${c.endDate}).`,
    };
  }

  // 3. Balance sufficiency check (except Unpaid)
  const currentBalances = getEmployeeLeaveBalance(employeeId);
  const typeKey = leaveType.toLowerCase();

  if (typeKey !== 'unpaid') {
    const available = currentBalances[typeKey]?.remaining ?? 0;
    if (days > available) {
      return {
        success: false,
        error: `Insufficient ${leaveType} leave balance. Requested: ${days} day(s), Available: ${available} day(s).`,
      };
    }
  }

  // Find employee profile details
  const employee = getEmployeeById(employeeId) || {
    name: 'Fictional Employee',
    jobTitle: 'Team Member',
    department: 'Engineering',
  };

  // Generate new Request ID
  const allRequests = getStoredLeaveRequests();
  const nextNum = allRequests.length + 101;
  const newId = `LV-2026-${String(nextNum).padStart(3, '0')}`;

  const typeLabels = {
    Casual: 'Casual Leave',
    Sick: 'Sick Leave',
    Paid: 'Paid Annual Leave',
    Unpaid: 'Unpaid Leave',
  };

  const newRequest = {
    id: newId,
    employeeId,
    employeeName: employee.name,
    employeeRole: employee.jobTitle,
    department: employee.department,
    leaveType,
    leaveTypeLabel: typeLabels[leaveType] || `${leaveType} Leave`,
    startDate,
    endDate,
    days,
    status: 'PENDING',
    reason: reason.trim(),
    appliedAt: new Date().toISOString(),
    reviewedAt: null,
    reviewedBy: null,
    reviewerComments: null,
    attachment: attachment || null,
  };

  // Save to persistent storage
  const updatedRequests = [newRequest, ...allRequests];
  saveStoredLeaveRequests(updatedRequests);

  // Trigger Notification for HR Admin
  addLeaveNotification({
    targetRole: 'HR_ADMIN',
    targetEmployeeId: null,
    title: 'New Leave Request Received',
    message: `${employee.name} (${employee.department}) requested ${days} day(s) of ${leaveType} Leave (${startDate} to ${endDate}).`,
    type: 'leave_request',
    requestId: newId,
  });

  return {
    success: true,
    request: newRequest,
    message: `Leave request ${newId} submitted successfully and forwarded to HR Admin for review.`,
  };
}

/**
 * Approve a pending leave request (HR ADMIN action)
 * Strictly deducts balance ONLY upon approval, never twice.
 */
export function approveLeaveRequest(requestId, reviewerComments = '', reviewerName = 'Alex Morgan (HR Administrator)') {
  const requests = getStoredLeaveRequests();
  const reqIndex = requests.findIndex((r) => r.id === requestId);

  if (reqIndex === -1) {
    return { success: false, error: 'Leave request not found.' };
  }

  const targetReq = requests[reqIndex];

  if (targetReq.status !== 'PENDING') {
    return {
      success: false,
      error: `Cannot approve request with status '${targetReq.status}'. Only PENDING requests can be actioned.`,
    };
  }

  // Deduct balance from employee entitlement
  const allBalances = getStoredLeaveBalances();
  const empBalance = allBalances[targetReq.employeeId] || {
    casual: { total: 6, used: 0, remaining: 6 },
    sick: { total: 8, used: 0, remaining: 8 },
    paid: { total: 14, used: 0, remaining: 14 },
    unpaid: { used: 0 },
  };

  const typeKey = targetReq.leaveType.toLowerCase();

  if (typeKey === 'unpaid') {
    empBalance.unpaid.used = (empBalance.unpaid.used || 0) + targetReq.days;
  } else if (empBalance[typeKey]) {
    // Deduct safely
    empBalance[typeKey].used = Math.min(
      empBalance[typeKey].total,
      empBalance[typeKey].used + targetReq.days
    );
    empBalance[typeKey].remaining = Math.max(
      0,
      empBalance[typeKey].total - empBalance[typeKey].used
    );
  }

  allBalances[targetReq.employeeId] = empBalance;
  saveStoredLeaveBalances(allBalances);

  // Update request status
  const updatedReq = {
    ...targetReq,
    status: 'APPROVED',
    reviewedAt: new Date().toISOString(),
    reviewedBy: reviewerName,
    reviewerComments: reviewerComments?.trim() || 'Approved by HR Administrator.',
  };

  requests[reqIndex] = updatedReq;
  saveStoredLeaveRequests(requests);

  // Notify Employee
  addLeaveNotification({
    targetRole: 'EMPLOYEE',
    targetEmployeeId: targetReq.employeeId,
    title: 'Leave Request Approved',
    message: `Your ${targetReq.leaveType} Leave request for ${targetReq.startDate} to ${targetReq.endDate} has been approved.`,
    type: 'leave_approved',
    requestId: targetReq.id,
  });

  return {
    success: true,
    request: updatedReq,
    message: `Leave request ${targetReq.id} approved successfully. Leave balance updated.`,
  };
}

/**
 * Reject a pending leave request (HR ADMIN action)
 * Balance is untouched.
 */
export function rejectLeaveRequest(requestId, reviewerComments = '', reviewerName = 'Alex Morgan (HR Administrator)') {
  const requests = getStoredLeaveRequests();
  const reqIndex = requests.findIndex((r) => r.id === requestId);

  if (reqIndex === -1) {
    return { success: false, error: 'Leave request not found.' };
  }

  const targetReq = requests[reqIndex];

  if (targetReq.status !== 'PENDING') {
    return {
      success: false,
      error: `Cannot reject request with status '${targetReq.status}'. Only PENDING requests can be actioned.`,
    };
  }

  // Update request status without modifying balances
  const updatedReq = {
    ...targetReq,
    status: 'REJECTED',
    reviewedAt: new Date().toISOString(),
    reviewedBy: reviewerName,
    reviewerComments: reviewerComments?.trim() || 'Declined per departmental scheduling requirements.',
  };

  requests[reqIndex] = updatedReq;
  saveStoredLeaveRequests(requests);

  // Notify Employee
  addLeaveNotification({
    targetRole: 'EMPLOYEE',
    targetEmployeeId: targetReq.employeeId,
    title: 'Leave Request Declined',
    message: `Your ${targetReq.leaveType} Leave request was declined: ${updatedReq.reviewerComments}`,
    type: 'leave_rejected',
    requestId: targetReq.id,
  });

  return {
    success: true,
    request: updatedReq,
    message: `Leave request ${targetReq.id} declined. Balance remains unchanged.`,
  };
}

/**
 * Cancel a pending leave request (EMPLOYEE or HR ADMIN action)
 * Only allowed for PENDING status.
 */
export function cancelLeaveRequest(requestId, employeeId = null) {
  const requests = getStoredLeaveRequests();
  const reqIndex = requests.findIndex((r) => r.id === requestId);

  if (reqIndex === -1) {
    return { success: false, error: 'Leave request not found.' };
  }

  const targetReq = requests[reqIndex];

  if (employeeId && targetReq.employeeId !== employeeId) {
    return { success: false, error: 'You are not authorized to cancel this request.' };
  }

  if (targetReq.status !== 'PENDING') {
    return {
      success: false,
      error: `Only PENDING leave requests can be cancelled. Current status is ${targetReq.status}.`,
    };
  }

  const updatedReq = {
    ...targetReq,
    status: 'CANCELLED',
    reviewedAt: new Date().toISOString(),
    reviewerComments: 'Cancelled by applicant.',
  };

  requests[reqIndex] = updatedReq;
  saveStoredLeaveRequests(requests);

  // Notify HR Admin
  addLeaveNotification({
    targetRole: 'HR_ADMIN',
    targetEmployeeId: null,
    title: 'Leave Request Cancelled',
    message: `${targetReq.employeeName} cancelled pending leave request ${targetReq.id}.`,
    type: 'leave_cancelled',
    requestId: targetReq.id,
  });

  return {
    success: true,
    request: updatedReq,
    message: `Leave request ${targetReq.id} has been cancelled successfully.`,
  };
}

/**
 * Get aggregated leave statistics for HR Admin Overview
 */
export function getLeaveSystemStats() {
  const requests = getStoredLeaveRequests();

  const total = requests.length;
  const pending = requests.filter((r) => r.status === 'PENDING').length;
  const approved = requests.filter((r) => r.status === 'APPROVED').length;
  const rejected = requests.filter((r) => r.status === 'REJECTED').length;
  const cancelled = requests.filter((r) => r.status === 'CANCELLED').length;

  return {
    total,
    pending,
    approved,
    rejected,
    cancelled,
  };
}

/**
 * Get approved leaves for the Calendar View with department filter
 */
export function getApprovedLeavesForCalendar(departmentFilter = 'All', monthYear = null) {
  const requests = getStoredLeaveRequests();

  return requests.filter((r) => {
    if (r.status !== 'APPROVED') return false;
    if (departmentFilter !== 'All' && r.department !== departmentFilter) return false;

    // Optional filter by month/year string e.g. '2026-11'
    if (monthYear) {
      const startPrefix = r.startDate.substring(0, 7);
      const endPrefix = r.endDate.substring(0, 7);
      if (startPrefix !== monthYear && endPrefix !== monthYear) return false;
    }

    return true;
  });
}

/**
 * Fetch live leave requests from MongoDB Atlas backend API (HR_ADMIN query)
 */
export async function fetchLeavesFromBackend(params = {}) {
  try {
    const query = new URLSearchParams();
    if (params.department && params.department !== 'ALL') query.set('department', params.department);
    if (params.status && params.status !== 'ALL') query.set('status', params.status);
    if (params.leaveType && params.leaveType !== 'ALL') query.set('leaveType', params.leaveType);
    if (params.employeeId) query.set('employeeId', params.employeeId);
    if (params.page) query.set('page', params.page);
    if (params.limit) query.set('limit', params.limit);

    const qs = query.toString();
    const endpoint = `/leaves${qs ? `?${qs}` : ''}`;
    const res = await api.get(endpoint);

    if (res.success && Array.isArray(res.leaves)) {
      const employees = getEmployees();
      const mapped = res.leaves.map((l) => {
        const emp = employees.find((e) => e.id === l.employeeId) || {};
        return {
          id: l._id || l.id,
          mongoId: l._id,
          employeeId: l.employeeId,
          employeeName: l.employeeName || emp.name || l.employeeId,
          department: l.department || emp.department || 'Engineering',
          jobTitle: l.jobTitle || emp.jobTitle || '',
          leaveType: l.leaveType,
          startDate: l.startDate,
          endDate: l.endDate,
          days: l.days,
          reason: l.reason,
          status: l.status,
          appliedAt: l.createdAt || new Date().toISOString(),
          reviewedBy: l.reviewedBy || null,
          reviewedAt: l.reviewedAt || null,
          reviewerComments: l.reviewerComments || '',
        };
      });

      if (mapped.length > 0) {
        localStorage.setItem(STORAGE_KEY_REQUESTS, JSON.stringify(mapped));
        window.dispatchEvent(new Event('leaves-updated'));
      }
      return {
        leaves: mapped,
        totalCount: res.totalCount || mapped.length,
        page: res.page || 1,
        totalPages: res.totalPages || 1,
      };
    }
  } catch (err) {
    console.warn('Backend leaves fetch error, using local fallback:', err);
  }
  const fallback = getStoredLeaveRequests();
  return {
    leaves: fallback,
    totalCount: fallback.length,
    page: 1,
    totalPages: 1,
  };
}

/**
 * Fetch employee's personal leave requests from live backend
 */
export async function fetchMyLeavesFromBackend(params = {}) {
  try {
    const query = new URLSearchParams();
    if (params.status && params.status !== 'ALL') query.set('status', params.status);
    if (params.leaveType && params.leaveType !== 'ALL') query.set('leaveType', params.leaveType);
    if (params.page) query.set('page', params.page);
    if (params.limit) query.set('limit', params.limit);

    const qs = query.toString();
    const endpoint = `/leaves/my${qs ? `?${qs}` : ''}`;
    const res = await api.get(endpoint);

    if (res.success && Array.isArray(res.leaves)) {
      const mapped = res.leaves.map((l) => ({
        id: l._id || l.id,
        mongoId: l._id,
        employeeId: l.employeeId,
        leaveType: l.leaveType,
        startDate: l.startDate,
        endDate: l.endDate,
        days: l.days,
        reason: l.reason,
        status: l.status,
        appliedAt: l.createdAt || new Date().toISOString(),
        reviewedBy: l.reviewedBy || null,
        reviewedAt: l.reviewedAt || null,
        reviewerComments: l.reviewerComments || '',
      }));
      return {
        leaves: mapped,
        totalCount: res.totalCount || mapped.length,
        page: res.page || 1,
        totalPages: res.totalPages || 1,
      };
    }
  } catch (err) {
    console.warn('Backend personal leaves fetch error:', err);
  }
  const fallback = getStoredLeaveRequests().filter((r) => r.employeeId === (params.employeeId || 'EMP-006'));
  return {
    leaves: fallback,
    totalCount: fallback.length,
    page: 1,
    totalPages: 1,
  };
}

/**
 * Fetch employee's live leave balances from backend
 */
export async function fetchMyBalanceFromBackend() {
  try {
    const res = await api.get('/leaves/my/balance');
    if (res.success && res.balance) {
      return res.balance;
    }
  } catch (err) {
    console.warn('Backend personal balance fetch error:', err);
  }
  return null;
}

/**
 * Fetch organizational leave statistics for HR Admin
 */
export async function fetchLeaveStatsFromBackend() {
  try {
    const res = await api.get('/leaves/stats');
    if (res.success && res.stats) {
      return res.stats;
    }
  } catch (err) {
    console.warn('Backend leave stats fetch error:', err);
  }
  return getLeaveSystemStats();
}

/**
 * Submit leave request to live backend API with fallback
 */
export async function applyLeaveBackend(leaveData) {
  try {
    const res = await api.post('/leaves', {
      leaveType: leaveData.leaveType?.toUpperCase(),
      startDate: leaveData.startDate,
      endDate: leaveData.endDate,
      reason: leaveData.reason,
    });
    if (res.success && res.leave) {
      await fetchMyLeavesFromBackend();
      window.dispatchEvent(new Event('leaves-updated'));
      return { success: true, leave: res.leave, message: res.message };
    } else if (res.message) {
      throw new Error(res.message);
    }
  } catch (err) {
    if (!err.isOffline) {
      throw err;
    }
  }
  return submitLeaveRequest(leaveData);
}

/**
 * Cancel an employee's leave request on backend
 */
export async function cancelLeaveBackend(id) {
  try {
    const res = await api.patch(`/leaves/${id}/cancel`, {});
    if (res.success && res.leave) {
      window.dispatchEvent(new Event('leaves-updated'));
      return { success: true, leave: res.leave, message: res.message };
    } else if (res.message) {
      throw new Error(res.message);
    }
  } catch (err) {
    if (!err.isOffline) {
      throw err;
    }
  }
  return cancelLeaveRequest(id);
}

/**
 * HR Admin approves leave request on live backend
 */
export async function approveLeaveBackend(id, reviewerComments = '') {
  try {
    const res = await api.patch(`/leaves/${id}/approve`, { reviewerComments });
    if (res.success && res.leave) {
      await fetchLeavesFromBackend();
      window.dispatchEvent(new Event('leaves-updated'));
      return { success: true, leave: res.leave, message: res.message };
    } else if (res.message) {
      throw new Error(res.message);
    }
  } catch (err) {
    if (!err.isOffline) {
      throw err;
    }
  }
  return reviewLeaveRequest(id, 'APPROVE', 'HR Administrator', reviewerComments);
}

/**
 * HR Admin rejects leave request on live backend
 */
export async function rejectLeaveBackend(id, reviewerComments = '') {
  try {
    const res = await api.patch(`/leaves/${id}/reject`, { reviewerComments });
    if (res.success && res.leave) {
      await fetchLeavesFromBackend();
      window.dispatchEvent(new Event('leaves-updated'));
      return { success: true, leave: res.leave, message: res.message };
    } else if (res.message) {
      throw new Error(res.message);
    }
  } catch (err) {
    if (!err.isOffline) {
      throw err;
    }
  }
  return reviewLeaveRequest(id, 'REJECT', 'HR Administrator', reviewerComments);
}

/**
 * Legacy status update wrapper
 */
export async function updateLeaveStatusBackend(id, status, comments = '') {
  if (status === 'APPROVED') {
    return approveLeaveBackend(id, comments);
  } else if (status === 'REJECTED') {
    return rejectLeaveBackend(id, comments);
  } else if (status === 'CANCELLED') {
    return cancelLeaveBackend(id);
  }
}
