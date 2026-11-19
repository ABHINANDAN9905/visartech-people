/**
 * Centralized Employee Data Service for VISARTECH People
 * Single Source of Truth across the entire application.
 * All employee profiles, emails, phone numbers, and compensation figures are 100% fictional.
 */

import api from './apiClient';

const STORAGE_KEY = 'visartech_employees_data';

export const INITIAL_EMPLOYEES = [
  {
    id: 'EMP-001',
    firstName: 'Marcus',
    lastName: 'Vance',
    name: 'Marcus Vance',
    email: 'marcus.vance@visartech.demo',
    phone: '+1 (312) 555-0143',
    dateOfBirth: '1989-06-14',
    gender: 'Male',
    jobTitle: 'Lead Full Stack Architect',
    department: 'Engineering',
    employmentType: 'Full-Time',
    joiningDate: '2022-03-15',
    reportingManager: 'Sarah Jenkins (VP of People)',
    employmentStatus: 'Active',
    attendanceStatus: 'present',
    checkInTime: '09:02 AM CST',
    address: '452 N Michigan Ave',
    city: 'Chicago',
    state: 'IL',
    country: 'United States',
    workSummary: {
      attendanceRate: '98.5%',
      assignedTasks: 4,
      completedTasks: 18,
      leaveBalance: 12,
    },
    recentActivities: [
      { type: 'check_in', text: 'Checked in at 09:02 AM CST', date: 'Today' },
      { type: 'task', text: 'Merged Pull Request #142 (Auth Engine)', date: 'Yesterday' },
      { type: 'leave', text: 'Submitted Annual Leave for Thanksgiving', date: '3 days ago' },
    ],
  },
  {
    id: 'EMP-002',
    firstName: 'Elena',
    lastName: 'Rostova',
    name: 'Elena Rostova',
    email: 'elena.rostova@visartech.demo',
    phone: '+1 (312) 555-0188',
    dateOfBirth: '1992-09-21',
    gender: 'Female',
    jobTitle: 'Senior Product Designer',
    department: 'Product & Design',
    employmentType: 'Full-Time',
    joiningDate: '2023-01-10',
    reportingManager: 'Alex Morgan (HR Administrator)',
    employmentStatus: 'On Leave',
    attendanceStatus: 'on_leave',
    checkInTime: null,
    address: '820 W Fulton Market',
    city: 'Chicago',
    state: 'IL',
    country: 'United States',
    workSummary: {
      attendanceRate: '94.0%',
      assignedTasks: 2,
      completedTasks: 14,
      leaveBalance: 9,
    },
    recentActivities: [
      { type: 'leave', text: 'Approved for 2-day Medical Recovery', date: 'Today' },
      { type: 'task', text: 'Uploaded Figma Design Tokens v2.4', date: 'Nov 14' },
      { type: 'check_in', text: 'Checked in at 08:58 AM CST', date: 'Nov 13' },
    ],
  },
  {
    id: 'EMP-003',
    firstName: 'David',
    lastName: 'Chen',
    name: 'David Chen',
    email: 'david.chen@visartech.demo',
    phone: '+1 (312) 555-0165',
    dateOfBirth: '1990-11-04',
    gender: 'Male',
    jobTitle: 'DevOps & Cloud Engineer',
    department: 'Infrastructure',
    employmentType: 'Full-Time',
    joiningDate: '2022-08-01',
    reportingManager: 'Marcus Vance (Lead Architect)',
    employmentStatus: 'Active',
    attendanceStatus: 'late',
    checkInTime: '09:35 AM CST',
    address: '1120 S Halsted St',
    city: 'Chicago',
    state: 'IL',
    country: 'United States',
    workSummary: {
      attendanceRate: '96.2%',
      assignedTasks: 3,
      completedTasks: 21,
      leaveBalance: 15,
    },
    recentActivities: [
      { type: 'check_in', text: 'Clocked in at 09:35 AM CST (Late)', date: 'Today' },
      { type: 'task', text: 'Completed Cloudflare WAF Ingress Update', date: 'Today' },
      { type: 'task', text: 'Provisioned staging Kubernetes nodes', date: 'Nov 15' },
    ],
  },
  {
    id: 'EMP-004',
    firstName: 'Maya',
    lastName: 'Patel',
    name: 'Maya Patel',
    email: 'maya.patel@visartech.demo',
    phone: '+1 (312) 555-0199',
    dateOfBirth: '1995-03-30',
    gender: 'Female',
    jobTitle: 'Frontend Engineer',
    department: 'Engineering',
    employmentType: 'Full-Time',
    joiningDate: '2023-06-15',
    reportingManager: 'Marcus Vance (Lead Architect)',
    employmentStatus: 'Active',
    attendanceStatus: 'present',
    checkInTime: '08:55 AM CST',
    address: '330 E Ohio St',
    city: 'Chicago',
    state: 'IL',
    country: 'United States',
    workSummary: {
      attendanceRate: '99.0%',
      assignedTasks: 2,
      completedTasks: 16,
      leaveBalance: 14,
    },
    recentActivities: [
      { type: 'check_in', text: 'Checked in at 08:55 AM CST (On-Time)', date: 'Today' },
      { type: 'task', text: 'Implemented Lucide React Icon System', date: 'Yesterday' },
      { type: 'leave', text: 'Annual leave query resolved by HR', date: 'Nov 12' },
    ],
  },
  {
    id: 'EMP-005',
    firstName: 'Liam',
    lastName: 'Novak',
    name: 'Liam Novak',
    email: 'liam.novak@visartech.demo',
    phone: '+1 (312) 555-0122',
    dateOfBirth: '1993-12-18',
    gender: 'Male',
    jobTitle: 'QA Automation Specialist',
    department: 'Quality Assurance',
    employmentType: 'Full-Time',
    joiningDate: '2023-09-01',
    reportingManager: 'Sarah Jenkins (VP of People)',
    employmentStatus: 'Active',
    attendanceStatus: 'present',
    checkInTime: '09:10 AM CST',
    address: '150 N Riverside Plaza',
    city: 'Chicago',
    state: 'IL',
    country: 'United States',
    workSummary: {
      attendanceRate: '97.8%',
      assignedTasks: 2,
      completedTasks: 19,
      leaveBalance: 16,
    },
    recentActivities: [
      { type: 'check_in', text: 'Checked in at 09:10 AM CST', date: 'Today' },
      { type: 'task', text: 'Verified Jest regression suite passed', date: 'Yesterday' },
      { type: 'leave', text: 'Completed 2-day Personal Leave', date: 'Nov 11' },
    ],
  },
  {
    id: 'EMP-006',
    firstName: 'Jordan',
    lastName: 'Lee',
    name: 'Jordan Lee',
    email: 'employee1@visartech.demo',
    phone: '+1 (312) 555-0194',
    dateOfBirth: '1994-07-25',
    gender: 'Non-Binary',
    jobTitle: 'Full Stack Software Engineer',
    department: 'Engineering',
    employmentType: 'Full-Time',
    joiningDate: '2024-01-15',
    reportingManager: 'Marcus Vance (Lead Architect)',
    employmentStatus: 'Active',
    attendanceStatus: 'present',
    checkInTime: '09:15 AM CST',
    address: '600 W Adams St',
    city: 'Chicago',
    state: 'IL',
    country: 'United States',
    workSummary: {
      attendanceRate: '95.4%',
      assignedTasks: 3,
      completedTasks: 12,
      leaveBalance: 14,
    },
    recentActivities: [
      { type: 'check_in', text: 'Checked in at 09:15 AM CST', date: 'Today' },
      { type: 'task', text: 'Configured Chicago Punch-Clock Widget', date: 'Today' },
      { type: 'leave', text: 'Submitted Dec 24-26 Vacation Request', date: 'Nov 14' },
    ],
  },
];

/**
 * Retrieve all employees from localStorage or initialize with exactly the 6 fictional records
 */
export function getEmployees() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_EMPLOYEES));
      return INITIAL_EMPLOYEES;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_EMPLOYEES));
      return INITIAL_EMPLOYEES;
    }
    return parsed;
  } catch (err) {
    console.error('Error reading employee dataset:', err);
    return INITIAL_EMPLOYEES;
  }
}

/**
 * Reset dataset back to the canonical 6 fictional employees
 */
export function resetEmployeesToCanonical() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_EMPLOYEES));
  window.dispatchEvent(new Event('employees-updated'));
  return INITIAL_EMPLOYEES;
}

/**
 * Get single employee by ID
 */
export function getEmployeeById(id) {
  const employees = getEmployees();
  return employees.find((e) => e.id.toLowerCase() === id.toLowerCase()) || null;
}

/**
 * Auto-generate next sequential employee ID (e.g. EMP-007, EMP-008)
 */
export function getNextEmployeeId() {
  const employees = getEmployees();
  const maxNum = employees.reduce((max, emp) => {
    const idStr = emp.id || emp.employeeId || '';
    const match = idStr.match(/^EMP-(\d+)$/i);
    if (match) {
      const num = parseInt(match[1], 10);
      return num > max ? num : max;
    }
    return max;
  }, 0);
  return `EMP-${String(maxNum + 1).padStart(3, '0')}`;
}

/**
 * Add a new fictional employee with validation
 */
export function addEmployee(employeeData) {
  const employees = getEmployees();

  const assignedId = (employeeData.id?.trim() || `EMP-${String(employees.length + 1).padStart(3, '0')}`).toUpperCase();

  // Validate unique employee ID
  const existingId = employees.find(
    (e) => e.id.toLowerCase() === assignedId.toLowerCase()
  );
  if (existingId) {
    throw new Error(`Employee ID "${assignedId}" already exists. Please choose a unique ID.`);
  }

  // Validate unique email
  const existingEmail = employees.find(
    (e) => e.email.toLowerCase() === employeeData.email.trim().toLowerCase()
  );
  if (existingEmail) {
    throw new Error(`Email address "${employeeData.email}" is already registered.`);
  }

  const fullName = `${employeeData.firstName.trim()} ${employeeData.lastName.trim()}`;

  const newEmployee = {
    ...employeeData,
    id: assignedId,
    name: fullName,
    attendanceStatus: 'present',
    checkInTime: '09:00 AM CST',
    workSummary: {
      attendanceRate: '100%',
      assignedTasks: 1,
      completedTasks: 0,
      leaveBalance: 18,
    },
    recentActivities: [
      { type: 'check_in', text: 'Onboarded to VISARTECH People system', date: 'Just now' },
    ],
  };

  const updated = [newEmployee, ...employees];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event('employees-updated'));
  return newEmployee;
}

/**
 * Update an existing employee record
 */
export function updateEmployee(id, updatedFields) {
  const employees = getEmployees();
  const index = employees.findIndex((e) => e.id.toLowerCase() === id.toLowerCase());

  if (index === -1) {
    throw new Error(`Employee with ID "${id}" was not found.`);
  }

  const existing = employees[index];

  // If email changed, ensure new email is unique
  if (
    updatedFields.email &&
    updatedFields.email.toLowerCase() !== existing.email.toLowerCase()
  ) {
    const emailConflict = employees.find(
      (e) => e.email.toLowerCase() === updatedFields.email.trim().toLowerCase() && e.id !== existing.id
    );
    if (emailConflict) {
      throw new Error(`Email "${updatedFields.email}" is already used by another employee.`);
    }
  }

  const firstName = updatedFields.firstName !== undefined ? updatedFields.firstName : existing.firstName;
  const lastName = updatedFields.lastName !== undefined ? updatedFields.lastName : existing.lastName;
  const fullName = `${firstName.trim()} ${lastName.trim()}`;

  const updatedRecord = {
    ...existing,
    ...updatedFields,
    name: fullName,
  };

  employees[index] = updatedRecord;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(employees));
  window.dispatchEvent(new Event('employees-updated'));
  return updatedRecord;
}

/**
 * Remove an employee record
 */
export function deleteEmployee(id) {
  const employees = getEmployees();
  const filtered = employees.filter((e) => e.id.toLowerCase() !== id.toLowerCase());
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  window.dispatchEvent(new Event('employees-updated'));
  return true;
}

/**
 * Get centralized directory KPI metrics
 */
export function getDirectoryStats() {
  const employees = getEmployees();
  const total = employees.length;
  const active = employees.filter((e) => e.employmentStatus === 'Active').length;
  const onLeave = employees.filter((e) => e.employmentStatus === 'On Leave').length;
  const inactive = employees.filter((e) => e.employmentStatus === 'Inactive').length;

  return { total, active, onLeave, inactive };
}

/**
 * Department list for filtering and form dropdowns
 */
export const DEPARTMENTS = [
  'Engineering',
  'Product & Design',
  'Infrastructure',
  'Quality Assurance',
  'People Operations',
  'Finance & Legal',
];

export const EMPLOYMENT_TYPES = [
  'Full-Time',
  'Part-Time',
  'Contract',
  'Internship',
];

export const EMPLOYMENT_STATUSES = [
  'Active',
  'On Leave',
  'Inactive',
];

export const MANAGERS = [
  'Sarah Jenkins (VP of People)',
  'Marcus Vance (Lead Architect)',
  'Alex Morgan (HR Administrator)',
];

/**
 * Fetch employee records live from backend MongoDB Atlas API
 * Supports search, department, status filters, and pagination.
 * Reconciles with local state and caches in localStorage.
 */
export async function fetchEmployeesFromBackend(params = {}) {
  try {
    const queryParts = [];
    if (params.search) queryParts.push(`search=${encodeURIComponent(params.search)}`);
    if (params.department && params.department !== 'All') queryParts.push(`department=${encodeURIComponent(params.department)}`);
    if (params.status && params.status !== 'All') queryParts.push(`status=${encodeURIComponent(params.status)}`);
    if (params.page) queryParts.push(`page=${params.page}`);
    queryParts.push(`limit=${params.limit || 100}`);

    const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
    const res = await api.get(`/employees${queryString}`);

    if (res.success && Array.isArray(res.employees)) {
      const employeeRecords = res.employees
        .filter((u) => u.role === 'EMPLOYEE')
        .map((u) => ({
          id: u.employeeId,
          employeeId: u.employeeId,
          firstName: u.firstName,
          lastName: u.lastName,
          name: `${u.firstName} ${u.lastName}`,
          email: u.email,
          phone: u.phone || '+1 (312) 555-0100',
          jobTitle: u.jobTitle,
          department: u.department,
          employmentType: u.employmentType || 'Full-Time',
          joiningDate: u.joiningDate ? new Date(u.joiningDate).toISOString().slice(0, 10) : '2023-01-01',
          reportingManager: u.reportingManager || 'Sarah Jenkins (VP of People)',
          employmentStatus: u.employmentStatus || 'Active',
          attendanceStatus: u.employmentStatus === 'On Leave' ? 'on_leave' : 'present',
          address: u.address || '100 S Wacker Dr',
          city: u.city || 'Chicago',
          state: u.state || 'IL',
          country: 'United States',
          workSummary: {
            attendanceRate: '97.2%',
            assignedTasks: 3,
            completedTasks: 16,
            leaveBalance: 12,
          },
          recentActivities: [
            { type: 'check_in', text: 'Active on platform', date: 'Today' },
          ],
        }));

      if (employeeRecords.length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(employeeRecords));
        // Note: Do NOT dispatch 'employees-updated' here to prevent recursive client fetch loops
        return {
          employees: employeeRecords,
          totalCount: res.totalCount || employeeRecords.length,
          totalPages: res.totalPages || 1,
          page: res.page || 1,
        };
      }
    }
  } catch (err) {
    console.warn('Could not fetch employees from live backend API, using cached data:', err);
  }

  const cached = getEmployees();
  return {
    employees: cached,
    totalCount: cached.length,
    totalPages: 1,
    page: 1,
  };
}

/**
 * Fetch a single employee record from backend
 */
export async function fetchEmployeeByIdFromBackend(id) {
  try {
    const res = await api.get(`/employees/${id}`);
    if (res.success && res.employee) {
      const u = res.employee;
      const formatted = {
        id: u.employeeId,
        employeeId: u.employeeId,
        firstName: u.firstName,
        lastName: u.lastName,
        name: `${u.firstName} ${u.lastName}`,
        email: u.email,
        phone: u.phone || '+1 (312) 555-0100',
        jobTitle: u.jobTitle,
        department: u.department,
        employmentType: u.employmentType || 'Full-Time',
        joiningDate: u.joiningDate ? new Date(u.joiningDate).toISOString().slice(0, 10) : '2023-01-01',
        reportingManager: u.reportingManager || 'Sarah Jenkins (VP of People)',
        employmentStatus: u.employmentStatus || 'Active',
        attendanceStatus: u.employmentStatus === 'On Leave' ? 'on_leave' : 'present',
        address: u.address || '100 S Wacker Dr',
        city: u.city || 'Chicago',
        state: u.state || 'IL',
        country: 'United States',
        workSummary: {
          attendanceRate: '97.2%',
          assignedTasks: 3,
          completedTasks: 16,
          leaveBalance: 12,
        },
        recentActivities: [
          { type: 'check_in', text: 'Active on platform', date: 'Today' },
        ],
      };
      return formatted;
    }
  } catch (err) {
    console.warn('Could not fetch employee by ID from backend, using local cache:', err);
  }
  return getEmployeeById(id);
}

/**
 * Add employee via backend with local cache update
 */
export async function addEmployeeBackend(employeeData) {
  const res = await api.post('/employees', {
    employeeId: employeeData.id || employeeData.employeeId,
    firstName: employeeData.firstName,
    lastName: employeeData.lastName,
    email: employeeData.email,
    role: employeeData.role || 'EMPLOYEE',
    jobTitle: employeeData.jobTitle,
    department: employeeData.department,
    employmentType: employeeData.employmentType,
    joiningDate: employeeData.joiningDate,
    reportingManager: employeeData.reportingManager,
    employmentStatus: employeeData.employmentStatus,
    phone: employeeData.phone,
    address: employeeData.address,
    city: employeeData.city,
    state: employeeData.state,
  });

  if (res.success && res.employee) {
    addEmployee(res.employee);
    return res.employee;
  }

  const errorMsg = res.message || res.data?.message || 'Failed to create employee record on backend';
  throw new Error(errorMsg);
}

/**
 * Update employee via backend with local cache update
 */
export async function updateEmployeeBackend(id, updatedFields) {
  try {
    const res = await api.put(`/employees/${id}`, updatedFields);
    if (res.success && res.employee) {
      await fetchEmployeesFromBackend();
      return res.employee;
    } else if (res.message) {
      throw new Error(res.message);
    }
  } catch (err) {
    if (!err.isOffline) {
      throw err;
    }
  }
  return updateEmployee(id, updatedFields);
}

/**
 * Safely deactivate employee via backend
 */
export async function deactivateEmployeeBackend(id) {
  try {
    const res = await api.delete(`/employees/${id}`);
    if (res.success) {
      await fetchEmployeesFromBackend();
      return true;
    } else if (res.message) {
      throw new Error(res.message);
    }
  } catch (err) {
    if (!err.isOffline) {
      throw err;
    }
  }
  return updateEmployee(id, { employmentStatus: 'Inactive' });
}

/**
 * Resend employee invitation via backend
 */
export async function resendEmployeeInvitationBackend(id) {
  try {
    const res = await api.post(`/employees/${id}/resend-invitation`);
    if (res.success) {
      return res;
    }
    throw new Error(res.message || 'Failed to resend employee invitation.');
  } catch (err) {
    if (!err.isOffline) {
      throw err;
    }
    return {
      success: true,
      message: 'Demo mode: Fresh invitation link generated.',
    };
  }
}
