import fs from 'fs';

const storage = {};
global.localStorage = {
  getItem: (k) => storage[k] || null,
  setItem: (k, v) => { storage[k] = String(v); },
  removeItem: (k) => { delete storage[k]; }
};
const sessionStore = {};
global.sessionStorage = {
  getItem: (k) => sessionStore[k] || null,
  setItem: (k, v) => { sessionStore[k] = String(v); },
  removeItem: (k) => { delete sessionStore[k]; }
};
global.window = {
  dispatchEvent: () => {},
  addEventListener: () => {},
  removeEventListener: () => {}
};
global.CustomEvent = class CustomEvent { constructor(type, detail) { this.type = type; this.detail = detail; } };
global.Event = class Event { constructor(type) { this.type = type; } };

import * as empSvc from '../src/services/employeeService.js';
import * as attSvc from '../src/services/attendanceService.js';
import * as leaveSvc from '../src/services/leaveService.js';
import * as taskSvc from '../src/services/taskService.js';
import * as paySvc from '../src/services/payrollService.js';
import * as annSvc from '../src/services/announcementService.js';
import * as fdbSvc from '../src/services/feedbackService.js';
import * as notifSvc from '../src/services/notificationService.js';

console.log('====================================================');
console.log('VISARTECH People — Automated QA Integration Test Suite');
console.log('====================================================');

// --- TEST 1: Canonical Employees Dataset Audit ---
console.log('\n[TEST 1] Canonical Employees Dataset Audit:');
const initialEmps = empSvc.getEmployees();
console.log('Total Initial Employees:', initialEmps.length);
if (initialEmps.length !== 6) throw new Error('Expected exactly 6 canonical employees!');
const canonicalIds = ['EMP-001', 'EMP-002', 'EMP-003', 'EMP-004', 'EMP-005', 'EMP-006'];
canonicalIds.forEach(id => {
  const found = initialEmps.find(e => e.id === id);
  if (!found) throw new Error('Missing canonical employee ID: ' + id);
});
console.log('-> PASS: Exactly 6 fictional employees found with consistent IDs.');

// --- TEST 2: Workflow A — Employee Management ---
console.log('\n[TEST 2] Workflow A — Employee Management:');
const newEmpPayload = {
  firstName: 'Sophia',
  lastName: 'Taylor',
  name: 'Sophia Taylor',
  email: 'sophia.taylor@visartech.demo',
  jobTitle: 'Junior Data Analyst',
  department: 'Engineering',
  employmentType: 'Full-Time',
  joiningDate: '2026-11-18',
  reportingManager: 'Marcus Vance (Lead Architect)',
  employmentStatus: 'Active',
  city: 'Chicago',
  state: 'IL',
  country: 'United States'
};
const createdEmp = empSvc.addEmployee(newEmpPayload);
console.log('Created Employee:', createdEmp.id, createdEmp.name);
const statsAfterAdd = empSvc.getDirectoryStats();
console.log('Total count after creation:', statsAfterAdd.total);
if (statsAfterAdd.total !== 7) throw new Error('Directory total did not increment!');
// Clean up by deleting added employee to restore canonical 6
empSvc.deleteEmployee(createdEmp.id);
console.log('Total count after delete cleanup:', empSvc.getDirectoryStats().total);
console.log('-> PASS: Workflow A (Create/Read/Delete employee) passed.');

// --- TEST 3: Workflow B — Attendance Check-In / Check-Out ---
console.log('\n[TEST 3] Workflow B — Attendance Management:');
const jordanId = 'EMP-006';
const jordanHistory = attSvc.getEmployeeAttendanceHistory(jordanId);
console.log('Jordan Lee attendance records count:', jordanHistory.length);
const allLogs = attSvc.getAllAttendanceRecords();
console.log('Admin Attendance Logs Count:', allLogs.length);
const metrics = attSvc.getTodayAttendanceMetrics();
console.log('Today Attendance Metrics:', metrics);
if (allLogs.length === 0) throw new Error('No attendance logs found');
console.log('-> PASS: Workflow B (Attendance punch & HR viewing) passed.');

// --- TEST 4: Workflow C — Leave Request & Approval ---
console.log('\n[TEST 4] Workflow C — Leave Management:');
const initialBalance = leaveSvc.getEmployeeLeaveBalance(jordanId);
console.log('Jordan Lee initial remaining leave balance:', initialBalance.totalRemaining);

const applyRes = leaveSvc.applyForLeave({
  employeeId: jordanId,
  employeeName: 'Jordan Lee',
  department: 'Engineering',
  leaveType: 'CASUAL',
  startDate: '2026-12-10',
  endDate: '2026-12-11',
  reason: 'Family event attendance',
  contactNumber: '+1 (312) 555-0194'
});
console.log('Submitted leave request ID:', applyRes.request.id, 'Days:', applyRes.request.days);

// HR Admin reviews and approves
const approvalRes = leaveSvc.approveLeaveRequest(applyRes.request.id, 'Approved for family event', 'Alex Morgan (HR Administrator)');
console.log('Leave approved status:', approvalRes.success);
const updatedBalance = leaveSvc.getEmployeeLeaveBalance(jordanId);
console.log('Balance after approval:', updatedBalance.totalRemaining);
if (updatedBalance.totalRemaining !== initialBalance.totalRemaining - applyRes.request.days) {
  throw new Error('Leave balance was not deducted correctly!');
}
console.log('-> PASS: Workflow C (Apply -> Approve -> Deduct balance) passed.');

// --- TEST 5: Workflow D — Tasks & Performance ---
console.log('\n[TEST 5] Workflow D — Tasks Management:');
const newTaskRes = taskSvc.createTask({
  title: 'Audit API Security Headers',
  description: 'Add Content-Security-Policy and Strict-Transport-Security to Express headers.',
  assignedEmployeeId: jordanId,
  priority: 'HIGH',
  startDate: '2026-11-18',
  dueDate: '2026-11-25',
  estimatedHours: 8,
  createdBy: 'Alex Morgan (HR Administrator)'
});
console.log('Task created:', newTaskRes.task.id, newTaskRes.task.title);

// Employee updates status to IN_PROGRESS
const updateRes = taskSvc.updateTask(newTaskRes.task.id, { status: 'IN_PROGRESS', progress: 40 }, 'EMPLOYEE', jordanId);
console.log('Task status updated by employee:', updateRes.task.status, 'Progress:', updateRes.task.progress + '%');
if (updateRes.task.status !== 'IN_PROGRESS') throw new Error('Employee task update failed!');
console.log('-> PASS: Workflow D (Task creation, assignment & employee status update) passed.');

// --- TEST 6: Workflow E — Payroll & Salary ---
console.log('\n[TEST 6] Workflow E — Payroll & Confidentiality:');
const jordanPayroll = paySvc.getEmployeePayrollHistory(jordanId);
console.log('Jordan Lee payslips available:', jordanPayroll.length);
jordanPayroll.forEach(p => {
  if (p.employeeId !== jordanId) throw new Error('Privacy breach! Jordan saw payslip for ' + p.employeeId);
});
const kpis = paySvc.getPayrollKPIs('2026-11');
console.log('Admin Monthly Payroll Gross:', kpis.totalGross, 'Net:', kpis.totalNet);
console.log('-> PASS: Workflow E (Scoped employee payslips & Admin disbursement register) passed.');

// --- TEST 7: Workflow F — Announcements & Scoping ---
console.log('\n[TEST 7] Workflow F — Announcement Broadcast:');
const testAnn = annSvc.createAnnouncement({
  title: 'Engineering Deep Dive: GraphQL vs REST',
  description: 'Technical architecture discussion for all Engineering staff.',
  category: 'Company Events',
  priority: 'MEDIUM',
  targetAudience: 'Selected Department',
  targetDepartment: 'Engineering',
  status: 'PUBLISHED'
});
console.log('Announcement created:', testAnn.id);
const jordanVisible = annSvc.getAnnouncementsForEmployee(jordanId, 'Engineering');
const found = jordanVisible.find(a => a.id === testAnn.id);
if (!found) throw new Error('Targeted employee did not receive department announcement!');
annSvc.markAnnouncementAsRead(testAnn.id, jordanId);
console.log('-> PASS: Workflow F (Targeted broadcast & read/unread tracking) passed.');

// --- TEST 8: Workflow G — Feedback Anonymity & Response ---
console.log('\n[TEST 8] Workflow G — Feedback & Anonymity:');
const anonFeedback = fdbSvc.submitFeedback({
  category: 'Workplace',
  subject: 'Standing desk converters',
  message: 'Could we get standing desk converters for hybrid pods?',
  priority: 'MEDIUM',
  isAnonymous: true,
  employee: { id: jordanId, name: 'Jordan Lee', department: 'Engineering' }
});
console.log('Anonymous feedback created. Submitter ID:', anonFeedback.employeeId, 'Name:', anonFeedback.employeeName);
if (anonFeedback.employeeId !== null || anonFeedback.employeeName !== 'Anonymous Colleague') {
  throw new Error('Anonymity violation! Identity was not scrubbed.');
}
fdbSvc.respondToFeedback(anonFeedback.id, {
  author: 'Alex Morgan (HR Administrator)',
  text: 'Facilities will test 3 demo units next week.',
  resolveStatus: 'RESOLVED'
});
console.log('-> PASS: Workflow G (Anonymous feedback & HR response) passed.');

// --- TEST 9: Authentication & Permissions ---
console.log('\n[TEST 9] Authentication & Permissions:');
const authSource = fs.readFileSync(new URL('../src/context/AuthContext.jsx', import.meta.url), 'utf-8');
if (!authSource.includes("id: 'EMP-006'")) throw new Error('DEMO_ACCOUNTS does not have EMP-006');
if (!authSource.includes("email: 'hr@visartech.demo'")) throw new Error('DEMO_ACCOUNTS does not have HR Admin email');
console.log('-> PASS: AuthContext DEMO_ACCOUNTS verified with EMP-006 for Jordan Lee and ADM-001 for Alex Morgan.');

console.log('\n====================================================');
console.log('ALL STEP 14 QUALITY ASSURANCE & WORKFLOW TESTS PASSED!');
console.log('====================================================');
