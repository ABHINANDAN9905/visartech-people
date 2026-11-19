/**
 * Fictional sample data for VISARTECH People HR Admin Dashboard.
 * Re-exports and synchronizes directly with the centralized Employee Data Service.
 */
import { INITIAL_EMPLOYEES, getEmployees } from '../services/employeeService';

// Synchronized with single source of truth in employeeService
export const FICTIONAL_EMPLOYEES = INITIAL_EMPLOYEES.map((emp) => ({
  id: emp.id,
  name: emp.name,
  role: emp.jobTitle,
  department: emp.department,
  email: emp.email,
  attendanceStatus: emp.attendanceStatus,
  checkInTime: emp.checkInTime,
  activeTasksCount: emp.workSummary.assignedTasks,
  taskStatusSummary: emp.workSummary.assignedTasks > 0 ? `${emp.workSummary.assignedTasks} In Progress` : 'Completed',
  avatar: '',
}));

export const INITIAL_LEAVE_REQUESTS = [
  {
    id: 'lv-101',
    employeeId: 'EMP-001',
    employeeName: 'Marcus Vance',
    employeeRole: 'Lead Full Stack Architect',
    leaveType: 'Annual Vacation',
    startDate: '2026-11-25',
    endDate: '2026-11-27',
    days: 3,
    status: 'pending',
    reason: 'Thanksgiving family gathering and annual vacation.',
    appliedAt: '2026-11-16T14:30:00Z',
  },
  {
    id: 'lv-102',
    employeeId: 'EMP-002',
    employeeName: 'Elena Rostova',
    employeeRole: 'Senior Product Designer',
    leaveType: 'Medical Leave',
    startDate: '2026-11-17',
    endDate: '2026-11-18',
    days: 2,
    status: 'pending',
    reason: 'Outpatient treatment and doctor recommended recovery.',
    appliedAt: '2026-11-17T08:15:00Z',
  },
  {
    id: 'lv-103',
    employeeId: 'EMP-005',
    employeeName: 'Liam Novak',
    employeeRole: 'QA Automation Specialist',
    leaveType: 'Personal Leave',
    startDate: '2026-11-10',
    endDate: '2026-11-11',
    days: 2,
    status: 'approved',
    reason: 'Moving to new apartment and family errands.',
    appliedAt: '2026-11-08T10:00:00Z',
  },
  {
    id: 'lv-104',
    employeeId: 'EMP-003',
    employeeName: 'David Chen',
    employeeRole: 'DevOps & Cloud Engineer',
    leaveType: 'Emergency Leave',
    startDate: '2026-11-04',
    endDate: '2026-11-05',
    days: 1,
    status: 'rejected',
    reason: 'Critical cloud deployment scheduled during the same window.',
    appliedAt: '2026-11-03T16:45:00Z',
  },
];

export const ATTENDANCE_WEEKLY_TREND = [
  { day: 'Mon', present: 6, late: 0, onLeave: 0, target: 6 },
  { day: 'Tue', present: 5, late: 1, onLeave: 1, target: 6 },
  { day: 'Wed', present: 6, late: 0, onLeave: 0, target: 6 },
  { day: 'Thu', present: 5, late: 0, onLeave: 1, target: 6 },
  { day: 'Fri', present: 6, late: 1, onLeave: 0, target: 6 },
];

export const TASK_STATUS_DISTRIBUTION = [
  { name: 'Completed', value: 12, color: '#16A36A' },
  { name: 'In Progress', value: 6, color: '#356AE6' },
  { name: 'Overdue', value: 2, color: '#DC5353' },
];

export const RECENT_ACTIVITIES = [
  {
    id: 'act-001',
    type: 'check_in',
    title: 'Employee Check-in',
    description: 'Marcus Vance checked in for the workday on time.',
    timestamp: '09:02 AM CST',
    user: 'Marcus Vance',
  },
  {
    id: 'act-002',
    type: 'leave_request',
    title: 'New Leave Request',
    description: 'Elena Rostova applied for 2 days of Medical Leave.',
    timestamp: '09:20 AM CST',
    user: 'Elena Rostova',
  },
  {
    id: 'act-003',
    type: 'check_in_late',
    title: 'Late Arrival',
    description: 'David Chen clocked in at 09:35 AM CST (35 mins past shift start).',
    timestamp: '09:35 AM CST',
    user: 'David Chen',
  },
  {
    id: 'act-004',
    type: 'task_complete',
    title: 'Task Milestone Completed',
    description: 'David Chen resolved "Kubernetes ingress SSL certificate auto-renew".',
    timestamp: '10:15 AM CST',
    user: 'David Chen',
  },
  {
    id: 'act-005',
    type: 'announcement',
    title: 'Company Notice Published',
    description: 'Alex Morgan broadcasted "Q4 All-Hands Townhall Agenda".',
    timestamp: '11:00 AM CST',
    user: 'Alex Morgan',
  },
];
