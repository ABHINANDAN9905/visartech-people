/**
 * Fictional sample data for VISARTECH People Employee Self-Service Dashboard
 * Tailored for Jordan Lee (emp-002, Full Stack Software Engineer)
 */

export const INITIAL_EMPLOYEE_ATTENDANCE = {
  isCheckedIn: true,
  checkInTime: '2026-11-17T09:15:00Z',
  checkInDisplayTime: '09:15 AM CST',
  checkOutTime: null,
  checkOutDisplayTime: null,
  status: 'Checked In',
  shiftDate: '2026-11-17',
  totalHoursCompletedToday: 0,
};

export const EMPLOYEE_LEAVE_BALANCES = {
  casual: { total: 6, used: 2, remaining: 4 },
  sick: { total: 8, used: 3, remaining: 5 },
  annual: { total: 10, used: 5, remaining: 5 },
  pendingCount: 1,
};

export const EMPLOYEE_RECENT_LEAVES = [
  {
    id: 'emp-lv-01',
    type: 'Annual Leave',
    startDate: '2026-12-24',
    endDate: '2026-12-26',
    days: 3,
    status: 'pending',
    appliedDate: '2026-11-14',
    reason: 'Winter holidays with family.',
  },
  {
    id: 'emp-lv-02',
    type: 'Sick Leave',
    startDate: '2026-10-12',
    endDate: '2026-10-13',
    days: 2,
    status: 'approved',
    appliedDate: '2026-10-11',
    reason: 'Seasonal viral flu and recovery.',
  },
  {
    id: 'emp-lv-03',
    type: 'Casual Leave',
    startDate: '2026-09-04',
    endDate: '2026-09-04',
    days: 1,
    status: 'approved',
    appliedDate: '2026-09-01',
    reason: 'Home utility maintenance appointment.',
  },
];

export const INITIAL_EMPLOYEE_TASKS = [
  {
    id: 'tsk-101',
    title: 'Implement JWT Cookie Auth Handler',
    description: 'Build backend middleware for HTTP-only cookie extraction and validation.',
    assignedDate: '2026-11-12',
    dueDate: '2026-11-20',
    priority: 'High',
    status: 'IN_PROGRESS', // TODO | IN_PROGRESS | IN_REVIEW | COMPLETED
    project: 'Core Platform Security',
  },
  {
    id: 'tsk-102',
    title: 'Responsive Employee Directory Table',
    description: 'Ensure mobile viewports stack table rows into cards seamlessly without overflow.',
    assignedDate: '2026-11-14',
    dueDate: '2026-11-22',
    priority: 'Medium',
    status: 'TODO',
    project: 'Workforce UI',
  },
  {
    id: 'tsk-103',
    title: 'Chicago Timezone Punch-Clock Widget',
    description: 'Integrate real-time America/Chicago clock and persistent attendance punch actions.',
    assignedDate: '2026-11-15',
    dueDate: '2026-11-18',
    priority: 'High',
    status: 'IN_REVIEW',
    project: 'Attendance Engine',
  },
  {
    id: 'tsk-104',
    title: 'Automated Unit Tests for Leave Calculations',
    description: 'Write Jest/Mocha assertions verifying balance deduction and boundary checks.',
    assignedDate: '2026-11-05',
    dueDate: '2026-11-10',
    priority: 'Medium',
    status: 'COMPLETED',
    project: 'Leave Management',
  },
  {
    id: 'tsk-105',
    title: 'Sprint 23 Retrospective Documentation',
    description: 'Document engineering bottlenecks and deploy pipeline improvements.',
    assignedDate: '2026-11-02',
    dueDate: '2026-11-06',
    priority: 'Low',
    status: 'COMPLETED',
    project: 'Engineering Operations',
  },
];

export const UPCOMING_HOLIDAYS = [
  { name: 'Thanksgiving Day', date: 'Thu, Nov 26, 2026', type: 'Public Holiday', daysLeft: '9 days' },
  { name: 'Day After Thanksgiving', date: 'Fri, Nov 27, 2026', type: 'Company Holiday', daysLeft: '10 days' },
  { name: 'Christmas Eve & Day', date: 'Dec 24 - 25, 2026', type: 'Public Holiday', daysLeft: '37 days' },
  { name: "New Year's Day", date: 'Fri, Jan 01, 2027', type: 'Public Holiday', daysLeft: '45 days' },
];

export const EMPLOYEE_ANNOUNCEMENTS = [
  {
    id: 'ann-01',
    title: 'Q4 Townhall & Benefits Renewal',
    preview: 'Join the executive leadership team on Friday, Nov 20 at 10:00 AM CST for our quarterly townhall.',
    date: 'Today at 11:00 AM CST',
    author: 'Alex Morgan (HR Administrator)',
    isUnread: true,
  },
  {
    id: 'ann-02',
    title: 'New Remote Collaboration Policies',
    preview: 'Updated guidelines regarding hybrid office hours and equipment reimbursement allowances.',
    date: 'Nov 12, 2026',
    author: 'People Operations',
    isUnread: false,
  },
  {
    id: 'ann-03',
    title: 'Engineering Hackathon 2026',
    preview: 'Annual technology showcase scheduled for the first week of December. Team registration now open.',
    date: 'Nov 08, 2026',
    author: 'Engineering Leadership',
    isUnread: false,
  },
];
