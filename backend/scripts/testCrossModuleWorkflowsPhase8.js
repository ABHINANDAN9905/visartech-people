import http from 'http';
import app from '../server.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { signToken } from '../config/jwt.js';
import User from '../models/User.js';
import Attendance from '../models/Attendance.js';
import LeaveRequest from '../models/LeaveRequest.js';
import LeaveBalance from '../models/LeaveBalance.js';
import Task from '../models/Task.js';
import PayrollRecord from '../models/PayrollRecord.js';
import SalaryStructure from '../models/SalaryStructure.js';
import Announcement from '../models/Announcement.js';
import Notification from '../models/Notification.js';
import Feedback from '../models/Feedback.js';

let passed = 0;
let failed = 0;
const results = [];

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passed++;
    results.push({ test: testName, status: 'PASS' });
  } else {
    console.error(`  [FAIL] ${testName} ${details ? '- ' + details : ''}`);
    failed++;
    results.push({ test: testName, status: 'FAIL', details });
  }
}

async function request(baseUrl, path, options = {}) {
  const url = `${baseUrl}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  return { status: response.status, body: data, headers: response.headers };
}

async function runWorkflowsPhase8() {
  console.log('====================================================');
  console.log('VISARTECH People — Step 18 Phase 8 Cross-Module Workflows');
  console.log('====================================================');

  await connectDB();

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const hrAdmin = await User.findOne({ role: 'HR_ADMIN' });
  if (!hrAdmin) {
    throw new Error('HR_ADMIN account not found in database.');
  }
  const hrToken = signToken({
    id: hrAdmin._id,
    employeeId: hrAdmin.employeeId,
    email: hrAdmin.email,
    role: 'HR_ADMIN',
    department: hrAdmin.department,
  });

  const testEmpId = 'EMP-WF8-001';
  const testEmail = 'clara.oswald@visartech.demo';
  let employeeToken = null;
  let testUserId = null;
  let createdLeaveId = null;
  let createdTaskId = null;
  let createdAnnouncementId = null;
  let createdFeedbackId = null;

  try {
    // Initial cleanup of any previous workflow test artifacts
    await User.deleteMany({ employeeId: testEmpId });
    await Attendance.deleteMany({ employeeId: testEmpId });
    await LeaveRequest.deleteMany({ employeeId: testEmpId });
    await LeaveBalance.deleteMany({ employeeId: testEmpId });
    await Task.deleteMany({ assignedEmployeeId: testEmpId });
    await SalaryStructure.deleteMany({ employeeId: testEmpId });
    await PayrollRecord.deleteMany({ employeeId: testEmpId });
    await Announcement.deleteMany({ title: 'WF8 Company Townhall & Strategic Roadmap' });
    await Notification.deleteMany({ title: { $regex: /WF8/ } });
    await Feedback.deleteMany({ feedbackText: { $regex: /WF8/ } });

    console.log('\n--- Workflow A: Employee Onboarding ---');
    // 1. HR Admin creates a new employee
    const createRes = await request(baseUrl, '/api/employees', {
      method: 'POST',
      headers: { Authorization: `Bearer ${hrToken}` },
      body: JSON.stringify({
        employeeId: testEmpId,
        firstName: 'Clara',
        lastName: 'Oswald',
        email: testEmail,
        password: 'Employee@123',
        department: 'Engineering',
        jobTitle: 'Frontend Integration Specialist',
        employmentType: 'Full-Time',
        employmentStatus: 'Active',
        joiningDate: new Date().toISOString(),
      }),
    });
    assert(
      createRes.status === 201 && createRes.body.success && createRes.body.employee?.employeeId === testEmpId,
      'Workflow A1: HR Admin successfully onboards new employee via POST /api/employees',
      `Status: ${createRes.status}, Body: ${JSON.stringify(createRes.body)}`
    );
    testUserId = createRes.body.employee?._id;

    // 2. Employee logs in with credentials
    const loginRes = await request(baseUrl, '/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: testEmail,
        password: 'Employee@123',
      }),
    });
    assert(
      loginRes.status === 200 && loginRes.body.success && !!loginRes.body.token,
      'Workflow A2: Onboarded employee authenticates successfully via POST /api/auth/login',
      `Status: ${loginRes.status}`
    );
    employeeToken = loginRes.body.token;

    // 3. Employee views own profile
    const profileRes = await request(baseUrl, `/api/employees/${testEmpId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${employeeToken}` },
    });
    assert(
      profileRes.status === 200 && profileRes.body.employee?.email === testEmail,
      'Workflow A3: Employee profile is accessible and matches created record',
      `Status: ${profileRes.status}`
    );

    console.log('\n--- Workflow B: Attendance Lifecycle ---');
    // 1. Employee checks in
    const checkInRes = await request(baseUrl, '/api/attendance/check-in', {
      method: 'POST',
      headers: { Authorization: `Bearer ${employeeToken}` },
    });
    assert(
      checkInRes.status === 201 && checkInRes.body.success && (checkInRes.body.record?.status || checkInRes.body.record?.attendanceStatus),
      'Workflow B1: Employee records check-in punch via POST /api/attendance/check-in',
      `Status: ${checkInRes.status}`
    );

    // 2. Employee checks out
    const checkOutRes = await request(baseUrl, '/api/attendance/check-out', {
      method: 'POST',
      headers: { Authorization: `Bearer ${employeeToken}` },
    });
    assert(
      checkOutRes.status === 200 && checkOutRes.body.success && checkOutRes.body.record?.checkOutTime,
      'Workflow B2: Employee records check-out punch via POST /api/attendance/check-out',
      `Status: ${checkOutRes.status}`
    );

    // 3. HR Admin verifies attendance summary & employee record
    const summaryRes = await request(baseUrl, '/api/attendance/summary', {
      method: 'GET',
      headers: { Authorization: `Bearer ${hrToken}` },
    });
    assert(
      summaryRes.status === 200 && summaryRes.body.success && (summaryRes.body.summary?.totalEmployees > 0 || summaryRes.body.totalEmployees > 0),
      'Workflow B3: HR Admin attendance summary reflects active workplace attendance',
      `Status: ${summaryRes.status}, Total: ${summaryRes.body.summary?.totalEmployees || summaryRes.body.totalEmployees}`
    );

    console.log('\n--- Workflow C: Leave Application & Approval ---');
    // Ensure initial leave balance for test employee
    let balance = await LeaveBalance.findOne({ employeeId: testEmpId });
    if (!balance) {
      balance = await LeaveBalance.create({
        employeeId: testEmpId,
        year: 2026,
        casual: { total: 6, used: 0, remaining: 6 },
        sick: { total: 8, used: 0, remaining: 8 },
        paid: { total: 14, used: 0, remaining: 14 },
      });
    }

    // 1. Employee applies for leave
    const leaveApplyRes = await request(baseUrl, '/api/leaves', {
      method: 'POST',
      headers: { Authorization: `Bearer ${employeeToken}` },
      body: JSON.stringify({
        leaveType: 'CASUAL',
        startDate: '2026-12-10',
        endDate: '2026-12-11',
        reason: 'WF8 Personal errands and home maintenance',
      }),
    });
    assert(
      leaveApplyRes.status === 201 && leaveApplyRes.body.success && leaveApplyRes.body.leave?.status === 'PENDING',
      'Workflow C1: Employee submits leave application via POST /api/leaves',
      `Status: ${leaveApplyRes.status}, Body: ${JSON.stringify(leaveApplyRes.body)}`
    );
    createdLeaveId = leaveApplyRes.body.leave?._id || leaveApplyRes.body.leave?.id;

    // 2. HR Admin reviews and approves leave
    const approveRes = await request(baseUrl, `/api/leaves/${createdLeaveId}/approve`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${hrToken}` },
      body: JSON.stringify({ reviewerComments: 'WF8 Approved by People Ops' }),
    });
    assert(
      approveRes.status === 200 && approveRes.body.success && approveRes.body.leave?.status === 'APPROVED',
      'Workflow C2: HR Admin approves leave request via PATCH /api/leaves/:id/approve',
      `Status: ${approveRes.status}`
    );

    // 3. Employee verifies updated leave balance
    const myBalanceRes = await request(baseUrl, '/api/leaves/my/balance', {
      method: 'GET',
      headers: { Authorization: `Bearer ${employeeToken}` },
    });
    assert(
      myBalanceRes.status === 200 && myBalanceRes.body.balance?.casual?.used > 0,
      'Workflow C3: Employee leave balance atomically updates reflecting approved days',
      `Status: ${myBalanceRes.status}, Used: ${myBalanceRes.body.balance?.casual?.used}`
    );

    console.log('\n--- Workflow D: Task Assignment & Execution ---');
    // 1. HR Admin assigns a task to employee
    const taskRes = await request(baseUrl, '/api/tasks', {
      method: 'POST',
      headers: { Authorization: `Bearer ${hrToken}` },
      body: JSON.stringify({
        title: 'WF8 Complete E2E Integration Suite',
        description: 'Validate cross-module APIs and real-time dashboard reactivity',
        assignedEmployeeId: testEmpId,
        priority: 'HIGH',
        startDate: '2026-11-18',
        dueDate: '2026-11-25',
        estimatedHours: 20,
      }),
    });
    assert(
      taskRes.status === 201 && taskRes.body.success && taskRes.body.task?.taskId,
      'Workflow D1: HR Admin creates & assigns task via POST /api/tasks',
      `Status: ${taskRes.status}`
    );
    createdTaskId = taskRes.body.task?.taskId || taskRes.body.task?._id;

    // 2. Employee updates task status and progress
    const updateTaskRes = await request(baseUrl, `/api/tasks/${createdTaskId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${employeeToken}` },
      body: JSON.stringify({
        status: 'IN_PROGRESS',
        progress: 60,
        actualHours: 12,
      }),
    });
    assert(
      updateTaskRes.status === 200 && updateTaskRes.body.success && updateTaskRes.body.task?.status === 'IN_PROGRESS',
      'Workflow D2: Employee updates task progress and status via PUT /api/tasks/:id',
      `Status: ${updateTaskRes.status}`
    );

    // 3. HR Admin checks task stats
    const taskStatsRes = await request(baseUrl, '/api/tasks/stats', {
      method: 'GET',
      headers: { Authorization: `Bearer ${hrToken}` },
    });
    assert(
      taskStatsRes.status === 200 && taskStatsRes.body.success && taskStatsRes.body.stats?.inProgress > 0,
      'Workflow D3: HR Admin task dashboard metrics reflect active in-progress workload',
      `Status: ${taskStatsRes.status}, In Progress: ${taskStatsRes.body.stats?.inProgress}`
    );

    console.log('\n--- Workflow E: Payroll Structure & Pay Run ---');
    // 1. HR Admin configures salary structure
    const structRes = await request(baseUrl, '/api/payroll/salary-structures', {
      method: 'POST',
      headers: { Authorization: `Bearer ${hrToken}` },
      body: JSON.stringify({
        employeeId: testEmpId,
        basicSalary: 6000,
        housingAllowance: 2000,
        otherAllowances: 1000,
        taxDeductions: 1200,
        otherDeductions: 300,
      }),
    });
    assert(
      (structRes.status === 200 || structRes.status === 201) && structRes.body.success,
      'Workflow E1: HR Admin defines employee compensation structure via POST /api/payroll/salary-structures',
      `Status: ${structRes.status}`
    );

    // 2. HR Admin generates payroll for the month
    const genRes = await request(baseUrl, '/api/payroll/generate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${hrToken}` },
      body: JSON.stringify({
        month: '2026-11',
      }),
    });
    assert(
      (genRes.status === 200 || genRes.status === 201) && genRes.body.success,
      'Workflow E2: HR Admin generates monthly payroll batch via POST /api/payroll/generate',
      `Status: ${genRes.status}`
    );

    // 3. Employee views personal payslip
    const myPayrollRes = await request(baseUrl, '/api/payroll/my', {
      method: 'GET',
      headers: { Authorization: `Bearer ${employeeToken}` },
    });
    assert(
      myPayrollRes.status === 200 && myPayrollRes.body.success && myPayrollRes.body.records?.length > 0,
      'Workflow E3: Employee accesses generated payslip voucher via GET /api/payroll/my',
      `Status: ${myPayrollRes.status}, Records: ${myPayrollRes.body.records?.length}`
    );
    const myRecordId = myPayrollRes.body.records[0]?.payrollId || myPayrollRes.body.records[0]?._id;

    // 4. HR Admin marks payroll voucher as paid
    const markPaidRes = await request(baseUrl, `/api/payroll/${myRecordId}/mark-paid`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${hrToken}` },
    });
    assert(
      markPaidRes.status === 200 && markPaidRes.body.success && markPaidRes.body.record?.paymentStatus === 'PAID',
      'Workflow E4: HR Admin marks payroll item as PAID via PATCH /api/payroll/:id/mark-paid',
      `Status: ${markPaidRes.status}`
    );

    console.log('\n--- Workflow F: Company Communication & Targeting ---');
    // 1. HR Admin publishes targeted announcement
    const annRes = await request(baseUrl, '/api/announcements', {
      method: 'POST',
      headers: { Authorization: `Bearer ${hrToken}` },
      body: JSON.stringify({
        title: 'WF8 Company Townhall & Strategic Roadmap',
        description: 'Comprehensive review of company performance and Q1 roadmap',
        category: 'Company Events',
        priority: 'HIGH',
        targetAudience: 'Selected Department',
        targetDepartment: 'Engineering',
        status: 'PUBLISHED',
        publishDate: '2026-11-01',
        expiryDate: '2026-12-31',
      }),
    });
    assert(
      annRes.status === 201 && annRes.body.success && annRes.body.announcement?._id,
      'Workflow F1: HR Admin publishes department-targeted bulletin via POST /api/announcements',
      `Status: ${annRes.status}`
    );
    createdAnnouncementId = annRes.body.announcement?._id;

    // 2. Engineering employee views bulletin
    const myAnnRes = await request(baseUrl, '/api/announcements', {
      method: 'GET',
      headers: { Authorization: `Bearer ${employeeToken}` },
    });
    const foundAnn = myAnnRes.body.announcements?.find((a) => (a._id || a.id) === createdAnnouncementId);
    assert(
      myAnnRes.status === 200 && !!foundAnn,
      'Workflow F2: Targeted employee receives bulletin in personalized company feed',
      `Found: ${!!foundAnn}`
    );

    // 3. Employee marks announcement as read
    const readAnnRes = await request(baseUrl, `/api/announcements/${createdAnnouncementId}/read`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${employeeToken}` },
    });
    assert(
      readAnnRes.status === 200 && readAnnRes.body.success && readAnnRes.body.readCount >= 1,
      'Workflow F3: Employee marks announcement read; server registers idempotent read state',
      `Status: ${readAnnRes.status}, ReadCount: ${readAnnRes.body.readCount}`
    );

    console.log('\n--- Workflow G: Anonymous Feedback & Privacy Assurance ---');
    // 1. Employee submits anonymous feedback
    const fbRes = await request(baseUrl, '/api/feedback', {
      method: 'POST',
      headers: { Authorization: `Bearer ${employeeToken}` },
      body: JSON.stringify({
        subject: 'WF8 Suggestion: Continuous Integration Pipeline',
        message: 'Implement automated CI pipeline for faster deployments and automated regression tests',
        category: 'Suggestions',
        isAnonymous: true,
      }),
    });
    assert(
      fbRes.status === 201 && fbRes.body.success && fbRes.body.feedback?.isAnonymous === true,
      'Workflow G1: Employee submits anonymous feedback via POST /api/feedback',
      `Status: ${fbRes.status}`
    );
    createdFeedbackId = fbRes.body.feedback?._id || fbRes.body.feedback?.id;

    // 2. HR Admin reviews feedback - employeeId must be strictly null
    const hrFbRes = await request(baseUrl, `/api/feedback/${createdFeedbackId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${hrToken}` },
    });
    assert(
      hrFbRes.status === 200 && hrFbRes.body.feedback?.employeeId === null && hrFbRes.body.feedback?.employeeName === 'Anonymous Colleague',
      'Workflow G2: HR Admin inspects anonymous feedback; submitter identity is strictly masked with null ID',
      `EmployeeId: ${hrFbRes.body.feedback?.employeeId}, Name: ${hrFbRes.body.feedback?.employeeName}`
    );

    // 3. Database direct query verification
    const dbFeedback = await Feedback.findById(createdFeedbackId);
    assert(
      dbFeedback && dbFeedback.employeeId === null && dbFeedback.isAnonymous === true,
      'Workflow G3: MongoDB storage confirms employeeId is null at database level',
      `DB EmployeeId: ${dbFeedback?.employeeId}`
    );

    console.log('\n--- Workflow Teardown & Integrity Audit ---');
    // Clean up all temporary records created during this test
    await User.deleteMany({ employeeId: testEmpId });
    await Attendance.deleteMany({ employeeId: testEmpId });
    await LeaveRequest.deleteMany({ employeeId: testEmpId });
    await LeaveBalance.deleteMany({ employeeId: testEmpId });
    await Task.deleteMany({ assignedEmployeeId: testEmpId });
    await SalaryStructure.deleteMany({ employeeId: testEmpId });
    await PayrollRecord.deleteMany({ employeeId: testEmpId });
    if (createdAnnouncementId) {
      await Announcement.findByIdAndDelete(createdAnnouncementId);
    }
    if (createdFeedbackId) {
      await Feedback.findByIdAndDelete(createdFeedbackId);
    }
    await Notification.deleteMany({
      $or: [
        { recipientId: testEmpId },
        { title: { $regex: /WF8/ } },
      ],
    });

    // Verify canonical employees exist and are intact
    const canonicalEmployees = await User.find({ role: 'EMPLOYEE' });
    const canonicalAdmin = await User.findOne({ role: 'HR_ADMIN' });
    assert(
      canonicalEmployees.length >= 6 && !!canonicalAdmin,
      'Workflow Cleanup: Canonical 6 employees and 1 HR Admin remain completely intact in MongoDB',
      `Employees: ${canonicalEmployees.length}, Admin: ${canonicalAdmin?.email}`
    );

  } catch (err) {
    console.error('Fatal error in Workflow QA suite:', err);
    assert(false, 'Phase 8 Workflows Execution Safety', err.message);
  } finally {
    server.close();
    await disconnectDB();
  }

  console.log('\n====================================================');
  console.log(`Phase 8 Workflows QA Summary: Passed ${passed} / ${passed + failed}`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runWorkflowsPhase8();
