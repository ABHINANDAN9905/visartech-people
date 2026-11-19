/**
 * Centralized Attendance Service for VISARTECH People
 * All timestamps stored in UTC ISO-8601 strings, displayed in America/Chicago.
 * Prevents duplicate punches, calculates durations, and persists in localStorage.
 */

import { getEmployees } from './employeeService.js';
import { formatChicagoDate, formatChicagoTime, getChicagoNow } from '../utils/timezone.js';
import api from './apiClient.js';

const ATTENDANCE_STORAGE_KEY = 'visartech_attendance_records';
const ACTIVE_PUNCH_STORAGE_KEY = 'visartech_active_punches';

// Configurable attendance threshold rules
export const ATTENDANCE_RULES = {
  shiftStartHour: 9,      // 9:00 AM CST
  shiftStartMinute: 0,
  lateGraceMinutes: 15,   // Late after 9:15 AM
  halfDayThresholdHours: 4,
  fullDayStandardHours: 8,
};

// Seed historical attendance records for the 6 fictional employees
export const INITIAL_ATTENDANCE_RECORDS = [
  // Today's records (Nov 17, 2026)
  {
    id: 'att-20261117-001',
    employeeId: 'EMP-001',
    employeeName: 'Marcus Vance',
    department: 'Engineering',
    date: '2026-11-17',
    checkInTime: '2026-11-17T15:02:00Z', // 09:02 AM CST
    checkInDisplay: '09:02 AM CST',
    checkOutTime: null,
    checkOutDisplay: '--:--',
    totalHours: 7.8,
    status: 'Present',
    note: 'On-time shift start',
  },
  {
    id: 'att-20261117-002',
    employeeId: 'EMP-002',
    employeeName: 'Elena Rostova',
    department: 'Product & Design',
    date: '2026-11-17',
    checkInTime: null,
    checkInDisplay: '--:--',
    checkOutTime: null,
    checkOutDisplay: '--:--',
    totalHours: 0,
    status: 'On Leave',
    note: 'Approved Medical Leave',
  },
  {
    id: 'att-20261117-003',
    employeeId: 'EMP-003',
    employeeName: 'David Chen',
    department: 'Infrastructure',
    date: '2026-11-17',
    checkInTime: '2026-11-17T15:35:00Z', // 09:35 AM CST
    checkInDisplay: '09:35 AM CST',
    checkOutTime: null,
    checkOutDisplay: '--:--',
    totalHours: 7.2,
    status: 'Late',
    note: 'Late arrival (35 mins past shift)',
  },
  {
    id: 'att-20261117-004',
    employeeId: 'EMP-004',
    employeeName: 'Maya Patel',
    department: 'Engineering',
    date: '2026-11-17',
    checkInTime: '2026-11-17T14:55:00Z', // 08:55 AM CST
    checkInDisplay: '08:55 AM CST',
    checkOutTime: null,
    checkOutDisplay: '--:--',
    totalHours: 8.0,
    status: 'Present',
    note: 'On-time shift start',
  },
  {
    id: 'att-20261117-005',
    employeeId: 'EMP-005',
    employeeName: 'Liam Novak',
    department: 'Quality Assurance',
    date: '2026-11-17',
    checkInTime: '2026-11-17T15:10:00Z', // 09:10 AM CST
    checkInDisplay: '09:10 AM CST',
    checkOutTime: null,
    checkOutDisplay: '--:--',
    totalHours: 7.7,
    status: 'Present',
    note: 'On-time shift start',
  },
  {
    id: 'att-20261117-006',
    employeeId: 'EMP-006',
    employeeName: 'Jordan Lee',
    department: 'Engineering',
    date: '2026-11-17',
    checkInTime: '2026-11-17T15:15:00Z', // 09:15 AM CST
    checkInDisplay: '09:15 AM CST',
    checkOutTime: null,
    checkOutDisplay: '--:--',
    totalHours: 7.6,
    status: 'Present',
    note: 'Active session',
  },

  // Yesterday's records (Nov 16, 2026)
  {
    id: 'att-20261116-001',
    employeeId: 'EMP-001',
    employeeName: 'Marcus Vance',
    department: 'Engineering',
    date: '2026-11-16',
    checkInTime: '2026-11-16T15:00:00Z',
    checkInDisplay: '09:00 AM CST',
    checkOutTime: '2026-11-16T23:05:00Z',
    checkOutDisplay: '05:05 PM CST',
    totalHours: 8.1,
    status: 'Present',
    note: 'Full day completed',
  },
  {
    id: 'att-20261116-002',
    employeeId: 'EMP-002',
    employeeName: 'Elena Rostova',
    department: 'Product & Design',
    date: '2026-11-16',
    checkInTime: '2026-11-16T15:05:00Z',
    checkInDisplay: '09:05 AM CST',
    checkOutTime: '2026-11-16T19:05:00Z',
    checkOutDisplay: '01:05 PM CST',
    totalHours: 4.0,
    status: 'Half Day',
    note: 'Doctor appointment afternoon',
  },
  {
    id: 'att-20261116-003',
    employeeId: 'EMP-003',
    employeeName: 'David Chen',
    department: 'Infrastructure',
    date: '2026-11-16',
    checkInTime: '2026-11-16T15:02:00Z',
    checkInDisplay: '09:02 AM CST',
    checkOutTime: '2026-11-16T23:30:00Z',
    checkOutDisplay: '05:30 PM CST',
    totalHours: 8.5,
    status: 'Present',
    note: 'Release deployment overtime',
  },
  {
    id: 'att-20261116-004',
    employeeId: 'EMP-004',
    employeeName: 'Maya Patel',
    department: 'Engineering',
    date: '2026-11-16',
    checkInTime: '2026-11-16T14:58:00Z',
    checkInDisplay: '08:58 AM CST',
    checkOutTime: '2026-11-16T23:00:00Z',
    checkOutDisplay: '05:00 PM CST',
    totalHours: 8.0,
    status: 'Present',
    note: 'Full day completed',
  },
  {
    id: 'att-20261116-005',
    employeeId: 'EMP-005',
    employeeName: 'Liam Novak',
    department: 'Quality Assurance',
    date: '2026-11-16',
    checkInTime: '2026-11-16T15:10:00Z',
    checkInDisplay: '09:10 AM CST',
    checkOutTime: '2026-11-16T23:10:00Z',
    checkOutDisplay: '05:10 PM CST',
    totalHours: 8.0,
    status: 'Present',
    note: 'Full day completed',
  },
  {
    id: 'att-20261116-006',
    employeeId: 'EMP-006',
    employeeName: 'Jordan Lee',
    department: 'Engineering',
    date: '2026-11-16',
    checkInTime: '2026-11-16T15:12:00Z',
    checkInDisplay: '09:12 AM CST',
    checkOutTime: '2026-11-16T23:15:00Z',
    checkOutDisplay: '05:15 PM CST',
    totalHours: 8.0,
    status: 'Present',
    note: 'Full day completed',
  },
];

/**
 * Retrieve all attendance records from localStorage or seed
 */
export function getAllAttendanceRecords() {
  try {
    const raw = localStorage.getItem(ATTENDANCE_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(ATTENDANCE_STORAGE_KEY, JSON.stringify(INITIAL_ATTENDANCE_RECORDS));
      return INITIAL_ATTENDANCE_RECORDS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_ATTENDANCE_RECORDS;
  } catch (err) {
    console.error('Error reading attendance storage:', err);
    return INITIAL_ATTENDANCE_RECORDS;
  }
}

/**
 * Get active punch state for a specific employee ID
 */
export function getActivePunch(employeeId) {
  try {
    const raw = localStorage.getItem(`${ACTIVE_PUNCH_STORAGE_KEY}_${employeeId}`);
    if (raw) return JSON.parse(raw);

    // Default: EMP-006 (Jordan Lee) starts checked in at 09:15 AM
    if (employeeId === 'EMP-006') {
      const defaultState = {
        isCheckedIn: true,
        checkInTime: '2026-11-17T15:15:00Z',
        checkInDisplay: '09:15 AM CST',
        checkOutTime: null,
        checkOutDisplay: null,
        shiftDate: '2026-11-17',
      };
      localStorage.setItem(`${ACTIVE_PUNCH_STORAGE_KEY}_${employeeId}`, JSON.stringify(defaultState));
      return defaultState;
    }

    return {
      isCheckedIn: false,
      checkInTime: null,
      checkInDisplay: null,
      checkOutTime: null,
      checkOutDisplay: null,
      shiftDate: null,
    };
  } catch {
    return { isCheckedIn: false };
  }
}

/**
 * Perform Employee Check-In punch
 */
export function checkInEmployee(employee) {
  const currentPunch = getActivePunch(employee.id);

  if (currentPunch && currentPunch.isCheckedIn) {
    throw new Error('You are already checked in. You must check out before checking in again.');
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const cstTimeDisplay = formatChicagoTime(now);
  const chicagoDate = getChicagoNow();
  const dateKey = `${chicagoDate.getFullYear()}-${String(chicagoDate.getMonth() + 1).padStart(2, '0')}-${String(chicagoDate.getDate()).padStart(2, '0')}`;

  // Evaluate status: check if arrival is past shift start + grace minutes
  const arrivalMinutes = chicagoDate.getHours() * 60 + chicagoDate.getMinutes();
  const shiftCutoffMinutes = ATTENDANCE_RULES.shiftStartHour * 60 + ATTENDANCE_RULES.lateGraceMinutes;
  const status = arrivalMinutes > shiftCutoffMinutes ? 'Late' : 'Present';

  const punchState = {
    isCheckedIn: true,
    checkInTime: nowIso,
    checkInDisplay: cstTimeDisplay,
    checkOutTime: null,
    checkOutDisplay: null,
    shiftDate: dateKey,
    status,
  };

  localStorage.setItem(`${ACTIVE_PUNCH_STORAGE_KEY}_${employee.id}`, JSON.stringify(punchState));

  // Update or append daily attendance record
  const records = getAllAttendanceRecords();
  const recordId = `att-${dateKey.replace(/-/g, '')}-${employee.id}`;

  const existingIndex = records.findIndex((r) => r.id === recordId || (r.employeeId === employee.id && r.date === dateKey));

  const newRecord = {
    id: recordId,
    employeeId: employee.id,
    employeeName: employee.name,
    department: employee.department || 'Engineering',
    date: dateKey,
    checkInTime: nowIso,
    checkInDisplay: cstTimeDisplay,
    checkOutTime: null,
    checkOutDisplay: '--:--',
    totalHours: 0,
    status,
    note: status === 'Late' ? 'Late check-in past 09:15 AM' : 'Shift active',
  };

  let updatedRecords;
  if (existingIndex !== -1) {
    updatedRecords = [...records];
    updatedRecords[existingIndex] = { ...updatedRecords[existingIndex], ...newRecord };
  } else {
    updatedRecords = [newRecord, ...records];
  }

  localStorage.setItem(ATTENDANCE_STORAGE_KEY, JSON.stringify(updatedRecords));
  window.dispatchEvent(new Event('attendance-updated'));

  return punchState;
}

/**
 * Perform Employee Check-Out punch
 */
export function checkOutEmployee(employee) {
  const currentPunch = getActivePunch(employee.id);

  if (!currentPunch || !currentPunch.isCheckedIn) {
    throw new Error('Cannot check out without an active check-in record.');
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const cstTimeDisplay = formatChicagoTime(now);

  // Compute duration in hours
  const checkInMs = new Date(currentPunch.checkInTime).getTime();
  const diffHours = Math.max(0.1, Number(((now.getTime() - checkInMs) / (1000 * 60 * 60)).toFixed(1)));

  // If simulation duration is tiny, give a realistic shift simulation
  const finalHours = diffHours < 1 ? 8.0 : diffHours;

  let finalStatus = currentPunch.status || 'Present';
  if (finalHours < ATTENDANCE_RULES.halfDayThresholdHours && finalStatus !== 'On Leave') {
    finalStatus = 'Half Day';
  }

  const punchState = {
    isCheckedIn: false,
    checkInTime: currentPunch.checkInTime,
    checkInDisplay: currentPunch.checkInDisplay,
    checkOutTime: nowIso,
    checkOutDisplay: cstTimeDisplay,
    shiftDate: currentPunch.shiftDate,
    status: finalStatus,
    completedHours: finalHours,
  };

  localStorage.setItem(`${ACTIVE_PUNCH_STORAGE_KEY}_${employee.id}`, JSON.stringify(punchState));

  // Update in records table
  const records = getAllAttendanceRecords();
  const dateKey = currentPunch.shiftDate;
  const existingIndex = records.findIndex((r) => r.employeeId === employee.id && r.date === dateKey);

  if (existingIndex !== -1) {
    records[existingIndex] = {
      ...records[existingIndex],
      checkOutTime: nowIso,
      checkOutDisplay: cstTimeDisplay,
      totalHours: finalHours,
      status: finalStatus,
      note: 'Shift completed',
    };
    localStorage.setItem(ATTENDANCE_STORAGE_KEY, JSON.stringify(records));
  }

  window.dispatchEvent(new Event('attendance-updated'));
  return punchState;
}

/**
 * Get attendance records for a specific employee
 */
export function getEmployeeAttendanceHistory(employeeId) {
  const all = getAllAttendanceRecords();
  return all.filter((r) => r.employeeId.toLowerCase() === employeeId.toLowerCase());
}

/**
 * Get today's attendance metrics across all employees
 */
export function getTodayAttendanceMetrics() {
  const employees = getEmployees();
  const allRecords = getAllAttendanceRecords();
  const chicagoDate = getChicagoNow();
  const todayKey = `${chicagoDate.getFullYear()}-${String(chicagoDate.getMonth() + 1).padStart(2, '0')}-${String(chicagoDate.getDate()).padStart(2, '0')}`;

  const todayRecords = allRecords.filter((r) => r.date === todayKey);

  const totalEmployees = employees.length;
  const present = todayRecords.filter((r) => r.status === 'Present').length;
  const late = todayRecords.filter((r) => r.status === 'Late').length;
  const onLeave = todayRecords.filter((r) => r.status === 'On Leave').length;
  const halfDay = todayRecords.filter((r) => r.status === 'Half Day').length;
  const absent = Math.max(0, totalEmployees - (present + late + onLeave + halfDay));
  const checkedInCurrently = todayRecords.filter((r) => r.checkInTime && (!r.checkOutTime || r.checkOutDisplay === '--:--')).length;

  return {
    totalEmployees,
    presentToday: present + late,
    onTime: present,
    late,
    onLeave,
    halfDay,
    absent,
    currentlyCheckedIn: checkedInCurrently,
  };
}

/**
 * Attendance status styling tokens
 */
export const ATTENDANCE_STATUS_TOKENS = {
  Present: { badgeVariant: 'success', color: '#16A36A', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  Late: { badgeVariant: 'warning', color: '#E9A23B', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
  'On Leave': { badgeVariant: 'rejected', color: '#DC5353', bg: 'bg-rose-50 text-rose-700 border-rose-200' },
  'Half Day': { badgeVariant: 'info', color: '#6366F1', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  Absent: { badgeVariant: 'danger', color: '#991B1B', bg: 'bg-red-50 text-red-700 border-red-200' },
};

/**
 * Status mapping utility
 */
const STATUS_MAP = {
  present: 'Present',
  late: 'Late',
  half_day: 'Half Day',
  on_leave: 'On Leave',
  absent: 'Absent',
};

/**
 * Fetch attendance logs from MongoDB Atlas backend API (HR_ADMIN or filtered)
 */
export async function fetchAttendanceFromBackend(params = {}) {
  try {
    let endpoint = '/attendance';
    const query = new URLSearchParams();
    if (typeof params === 'string') {
      query.set('employeeId', params);
    } else if (params && typeof params === 'object') {
      if (params.employeeId) query.set('employeeId', params.employeeId);
      if (params.department && params.department !== 'All') query.set('department', params.department);
      if (params.status && params.status !== 'All') query.set('status', params.status);
      if (params.date && params.date !== 'All') query.set('date', params.date);
      if (params.startDate) query.set('startDate', params.startDate);
      if (params.endDate) query.set('endDate', params.endDate);
      if (params.page) query.set('page', params.page);
      if (params.limit) query.set('limit', params.limit);
    }
    const queryString = query.toString();
    if (queryString) {
      endpoint += `?${queryString}`;
    }

    const res = await api.get(endpoint);

    if (res.success && Array.isArray(res.attendance)) {
      const employees = getEmployees();
      const mapped = res.attendance.map((doc) => {
        const emp = employees.find((e) => e.id === doc.employeeId) || {};
        const checkInDate = doc.checkInTime ? new Date(doc.checkInTime) : null;
        const checkOutDate = doc.checkOutTime ? new Date(doc.checkOutTime) : null;

        return {
          id: doc._id || `att-${doc.date}-${doc.employeeId}`,
          mongoId: doc._id,
          employeeId: doc.employeeId,
          employeeName: doc.employeeName || emp.name || doc.employeeId,
          department: doc.department || emp.department || 'Engineering',
          jobTitle: doc.jobTitle || emp.jobTitle || '',
          date: doc.date,
          checkInTime: doc.checkInTime,
          checkInDisplay: checkInDate ? formatChicagoTime(checkInDate) : '--:--',
          checkOutTime: doc.checkOutTime,
          checkOutDisplay: checkOutDate ? formatChicagoTime(checkOutDate) : '--:--',
          totalHours: doc.durationHours || 0,
          status: STATUS_MAP[doc.status] || doc.status || 'Present',
          note: doc.checkInNote || '',
        };
      });

      if (mapped.length > 0) {
        localStorage.setItem(ATTENDANCE_STORAGE_KEY, JSON.stringify(mapped));
        window.dispatchEvent(new Event('attendance-updated'));
      }
      return {
        records: mapped,
        totalCount: res.totalCount || mapped.length,
        page: res.page || 1,
        totalPages: res.totalPages || 1,
      };
    }
  } catch (err) {
    console.warn('Backend attendance fetch error, using local fallback:', err);
  }
  const fallback = getAllAttendanceRecords();
  return {
    records: fallback,
    totalCount: fallback.length,
    page: 1,
    totalPages: 1,
  };
}

/**
 * Fetch today's attendance punch status from backend
 */
export async function fetchTodayAttendanceFromBackend(employeeId = 'EMP-006') {
  try {
    const res = await api.get('/attendance/today');
    if (res.success) {
      const record = res.record;
      if (record) {
        const checkInDate = record.checkInTime ? new Date(record.checkInTime) : null;
        const checkOutDate = record.checkOutTime ? new Date(record.checkOutTime) : null;
        const punchState = {
          isCheckedIn: res.isCheckedIn,
          checkInTime: record.checkInTime,
          checkInDisplay: checkInDate ? formatChicagoTime(checkInDate) : null,
          checkOutTime: record.checkOutTime,
          checkOutDisplay: checkOutDate ? formatChicagoTime(checkOutDate) : null,
          shiftDate: record.date,
          status: STATUS_MAP[record.status] || record.status,
          completedHours: record.durationHours || 0,
        };
        localStorage.setItem(`${ACTIVE_PUNCH_STORAGE_KEY}_${employeeId}`, JSON.stringify(punchState));
        window.dispatchEvent(new Event('attendance-updated'));
        return punchState;
      } else {
        const resetState = {
          isCheckedIn: false,
          checkInTime: null,
          checkInDisplay: null,
          checkOutTime: null,
          checkOutDisplay: null,
          shiftDate: res.date,
        };
        localStorage.setItem(`${ACTIVE_PUNCH_STORAGE_KEY}_${employeeId}`, JSON.stringify(resetState));
        return resetState;
      }
    }
  } catch (err) {
    console.warn('Could not fetch today attendance from backend:', err);
  }
  return getActivePunch(employeeId);
}

/**
 * Fetch personal employee attendance history from backend
 */
export async function fetchMyAttendanceFromBackend(params = {}) {
  try {
    const query = new URLSearchParams();
    if (params.startDate) query.set('startDate', params.startDate);
    if (params.endDate) query.set('endDate', params.endDate);
    if (params.status && params.status !== 'All') query.set('status', params.status);
    if (params.page) query.set('page', params.page);
    if (params.limit) query.set('limit', params.limit);

    const qs = query.toString();
    const endpoint = `/attendance/my${qs ? `?${qs}` : ''}`;
    const res = await api.get(endpoint);

    if (res.success && Array.isArray(res.attendance)) {
      const mapped = res.attendance.map((doc) => {
        const checkInDate = doc.checkInTime ? new Date(doc.checkInTime) : null;
        const checkOutDate = doc.checkOutTime ? new Date(doc.checkOutTime) : null;
        return {
          id: doc._id || `att-${doc.date}-${doc.employeeId}`,
          mongoId: doc._id,
          employeeId: doc.employeeId,
          date: doc.date,
          checkInTime: doc.checkInTime,
          checkInDisplay: checkInDate ? formatChicagoTime(checkInDate) : '--:--',
          checkOutTime: doc.checkOutTime,
          checkOutDisplay: checkOutDate ? formatChicagoTime(checkOutDate) : '--:--',
          totalHours: doc.durationHours || 0,
          status: STATUS_MAP[doc.status] || doc.status || 'Present',
          note: doc.checkInNote || '',
        };
      });
      return {
        records: mapped,
        totalCount: res.totalCount || mapped.length,
        page: res.page || 1,
        totalPages: res.totalPages || 1,
      };
    }
  } catch (err) {
    console.warn('Failed to fetch personal attendance from backend:', err);
  }
  const fallback = getEmployeeAttendanceHistory(params.employeeId || 'EMP-006');
  return {
    records: fallback,
    totalCount: fallback.length,
    page: 1,
    totalPages: 1,
  };
}

/**
 * Fetch personal employee attendance summary metrics from backend
 */
export async function fetchMySummaryFromBackend(params = {}) {
  try {
    const query = new URLSearchParams();
    if (params.month) query.set('month', params.month);
    if (params.startDate) query.set('startDate', params.startDate);
    if (params.endDate) query.set('endDate', params.endDate);

    const qs = query.toString();
    const res = await api.get(`/attendance/my/summary${qs ? `?${qs}` : ''}`);
    if (res.success && res.summary) {
      return res.summary;
    }
  } catch (err) {
    console.warn('Failed to fetch personal summary from backend:', err);
  }
  return null;
}

/**
 * Fetch organization-wide attendance summary metrics for HR Admin
 */
export async function fetchAttendanceSummaryFromBackend(date = null) {
  try {
    const endpoint = date ? `/attendance/summary?date=${encodeURIComponent(date)}` : '/attendance/summary';
    const res = await api.get(endpoint);
    if (res.success && res.summary) {
      return res.summary;
    }
  } catch (err) {
    console.warn('Failed to fetch organization attendance summary:', err);
  }
  return getTodayAttendanceMetrics();
}

/**
 * Check-in punch targeting live backend with fallback
 */
export async function checkInBackend(employee, note = '') {
  try {
    const res = await api.post('/attendance/check-in', { note });
    if (res.success && res.record) {
      const rec = res.record;
      const checkInDate = new Date(rec.checkInTime);
      const cstTimeDisplay = formatChicagoTime(checkInDate);
      const punchState = {
        isCheckedIn: true,
        checkInTime: rec.checkInTime,
        checkInDisplay: cstTimeDisplay,
        checkOutTime: null,
        checkOutDisplay: null,
        shiftDate: rec.date,
        status: STATUS_MAP[rec.status] || 'Present',
      };
      localStorage.setItem(`${ACTIVE_PUNCH_STORAGE_KEY}_${employee.id}`, JSON.stringify(punchState));
      window.dispatchEvent(new Event('attendance-updated'));
      return punchState;
    } else if (res.message) {
      throw new Error(res.message);
    }
  } catch (err) {
    if (!err.isOffline) {
      throw err;
    }
  }
  return checkInEmployee(employee);
}

/**
 * Check-out punch targeting live backend with fallback
 */
export async function checkOutBackend(employee) {
  try {
    const res = await api.post('/attendance/check-out', {});
    if (res.success && res.record) {
      const rec = res.record;
      const checkInDate = rec.checkInTime ? new Date(rec.checkInTime) : null;
      const checkOutDate = new Date(rec.checkOutTime);
      const punchState = {
        isCheckedIn: false,
        checkInTime: rec.checkInTime,
        checkInDisplay: checkInDate ? formatChicagoTime(checkInDate) : '--:--',
        checkOutTime: rec.checkOutTime,
        checkOutDisplay: formatChicagoTime(checkOutDate),
        shiftDate: rec.date,
        status: STATUS_MAP[rec.status] || 'Present',
        completedHours: rec.durationHours || 0,
      };
      localStorage.setItem(`${ACTIVE_PUNCH_STORAGE_KEY}_${employee.id}`, JSON.stringify(punchState));
      window.dispatchEvent(new Event('attendance-updated'));
      return punchState;
    } else if (res.message) {
      throw new Error(res.message);
    }
  } catch (err) {
    if (!err.isOffline) {
      throw err;
    }
  }
  return checkOutEmployee(employee);
}

/**
 * HR Admin correction of an attendance record
 */
export async function updateAttendanceBackend(id, updateData) {
  try {
    const res = await api.put(`/attendance/${id}`, updateData);
    if (res.success && res.record) {
      await fetchAttendanceFromBackend();
      return res.record;
    } else if (res.message) {
      throw new Error(res.message);
    }
  } catch (err) {
    if (!err.isOffline) {
      throw err;
    }
  }
  return null;
}
