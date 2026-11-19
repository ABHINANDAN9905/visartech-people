/**
 * Model Architecture & Schema Validation Test Suite
 * Tests all 10 Mongoose models, enums, required fields, virtuals,
 * index definitions, security hooks, and anonymity guarantees.
 */

import mongoose from 'mongoose';
import {
  User,
  Attendance,
  LeaveRequest,
  LeaveBalance,
  Task,
  SalaryStructure,
  PayrollRecord,
  Announcement,
  Feedback,
  Notification,
} from '../models/index.js';

console.log('====================================================');
console.log('VISARTECH People — MongoDB Models & Architecture QA');
console.log('====================================================');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    throw new Error(`Test Failed: ${message}`);
  }
  passedTests++;
  console.log(`[PASS] ${message}`);
}

async function runTests() {
  // --- TEST 1: Model Compilation ---
  console.log('\n[1/7] Testing Model Compilation...');
  assert(User && User.modelName === 'User', 'User model compiled successfully');
  assert(Attendance && Attendance.modelName === 'Attendance', 'Attendance model compiled successfully');
  assert(LeaveRequest && LeaveRequest.modelName === 'LeaveRequest', 'LeaveRequest model compiled successfully');
  assert(LeaveBalance && LeaveBalance.modelName === 'LeaveBalance', 'LeaveBalance model compiled successfully');
  assert(Task && Task.modelName === 'Task', 'Task model compiled successfully');
  assert(SalaryStructure && SalaryStructure.modelName === 'SalaryStructure', 'SalaryStructure model compiled successfully');
  assert(PayrollRecord && PayrollRecord.modelName === 'PayrollRecord', 'PayrollRecord model compiled successfully');
  assert(Announcement && Announcement.modelName === 'Announcement', 'Announcement model compiled successfully');
  assert(Feedback && Feedback.modelName === 'Feedback', 'Feedback model compiled successfully');
  assert(Notification && Notification.modelName === 'Notification', 'Notification model compiled successfully');

  // --- TEST 2: Schema Validation & Required Fields ---
  console.log('\n[2/7] Testing Required Fields & Schema Validation...');
  // User missing fields
  const invalidUser = new User({});
  const userValError = invalidUser.validateSync();
  assert(userValError.errors['employeeId'], 'User requires employeeId');
  assert(userValError.errors['email'], 'User requires email');
  assert(userValError.errors['firstName'], 'User requires firstName');
  assert(userValError.errors['jobTitle'], 'User requires jobTitle');

  // Attendance missing fields
  const invalidAtt = new Attendance({});
  const attValError = invalidAtt.validateSync();
  assert(attValError.errors['employeeId'], 'Attendance requires employeeId');
  assert(attValError.errors['date'], 'Attendance requires date');

  // LeaveRequest missing fields
  const invalidLeave = new LeaveRequest({});
  const leaveValError = invalidLeave.validateSync();
  assert(leaveValError.errors['employeeId'], 'LeaveRequest requires employeeId');
  assert(leaveValError.errors['leaveType'], 'LeaveRequest requires leaveType');
  assert(leaveValError.errors['days'], 'LeaveRequest requires days');

  // Task missing fields
  const invalidTask = new Task({});
  const taskValError = invalidTask.validateSync();
  assert(taskValError.errors['taskId'], 'Task requires taskId');
  assert(taskValError.errors['title'], 'Task requires title');
  assert(taskValError.errors['assignedEmployeeId'], 'Task requires assignedEmployeeId');

  // PayrollRecord missing fields
  const invalidPayroll = new PayrollRecord({});
  const payValError = invalidPayroll.validateSync();
  assert(payValError.errors['payrollId'], 'PayrollRecord requires payrollId');
  assert(payValError.errors['payrollMonth'], 'PayrollRecord requires payrollMonth');
  assert(payValError.errors['employeeId'], 'PayrollRecord requires employeeId');

  // --- TEST 3: Enum Constraints & Rejections ---
  console.log('\n[3/7] Testing Enum Constraints...');
  // Invalid user role
  const badRoleUser = new User({
    employeeId: 'EMP-999',
    firstName: 'Test',
    lastName: 'User',
    email: 'test@visartech.demo',
    passwordHash: 'hashed',
    role: 'SUPER_ADMIN_INVALID', // invalid
    jobTitle: 'Engineer',
    department: 'Engineering',
    joiningDate: new Date(),
  });
  const badRoleError = badRoleUser.validateSync();
  assert(badRoleError.errors['role'], 'User rejects invalid role enum');

  // Invalid leaveType
  const badLeave = new LeaveRequest({
    employeeId: 'EMP-001',
    leaveType: 'VACATION_INVALID',
    startDate: '2026-11-20',
    endDate: '2026-11-21',
    days: 2,
    reason: 'Test',
  });
  const badLeaveError = badLeave.validateSync();
  assert(badLeaveError.errors['leaveType'], 'LeaveRequest rejects invalid leaveType enum');

  // Invalid task status
  const badTask = new Task({
    taskId: 'TSK-999',
    title: 'Test',
    description: 'Test',
    assignedEmployeeId: 'EMP-001',
    startDate: '2026-11-20',
    dueDate: '2026-11-21',
    status: 'ARCHIVED_INVALID',
  });
  const badTaskError = badTask.validateSync();
  assert(badTaskError.errors['status'], 'Task rejects invalid status enum');

  // --- TEST 4: Value Constraints & Non-Negative Validation ---
  console.log('\n[4/7] Testing Value Bounds & Non-Negative Rules...');
  // Negative salary
  const badSalary = new SalaryStructure({
    employeeId: 'EMP-001',
    basicSalary: -5000,
  });
  const badSalaryError = badSalary.validateSync();
  assert(badSalaryError.errors['basicSalary'], 'SalaryStructure rejects negative basicSalary');

  // Negative leave balance
  const badBalance = new LeaveBalance({
    employeeId: 'EMP-001',
    casual: { total: 6, used: 10, remaining: -4 },
  });
  const badBalError = badBalance.validateSync();
  assert(badBalError.errors['casual.remaining'], 'LeaveBalance rejects negative remaining days');

  // Task progress > 100
  const badProgressTask = new Task({
    taskId: 'TSK-999',
    title: 'Test',
    description: 'Test',
    assignedEmployeeId: 'EMP-001',
    startDate: '2026-11-20',
    dueDate: '2026-11-21',
    progress: 150,
  });
  const badProgError = badProgressTask.validateSync();
  assert(badProgError.errors['progress'], 'Task rejects progress > 100%');

  // --- TEST 5: Virtual Properties & Calculations ---
  console.log('\n[5/7] Testing Virtuals & Calculated Fields...');
  // User name virtual
  const validUser = new User({
    employeeId: 'EMP-001',
    firstName: 'Marcus',
    lastName: 'Vance',
    email: 'marcus.vance@visartech.demo',
    passwordHash: 'secretHash',
    role: 'EMPLOYEE',
    jobTitle: 'Lead Architect',
    department: 'Engineering',
    joiningDate: new Date('2022-03-15'),
  });
  assert(validUser.name === 'Marcus Vance', 'User.name virtual computes correctly');

  // SalaryStructure virtuals
  const validSalary = new SalaryStructure({
    employeeId: 'EMP-001',
    basicSalary: 8500,
    housingAllowance: 1200,
    otherAllowances: 500,
    bonus: 800,
    taxDeduction: 2200,
    otherDeductions: 300,
  });
  assert(validSalary.grossSalary === 11000, 'SalaryStructure.grossSalary computes 11,000');
  assert(validSalary.totalDeductions === 2500, 'SalaryStructure.totalDeductions computes 2,500');
  assert(validSalary.netSalary === 8500, 'SalaryStructure.netSalary computes 8,500');

  // LeaveBalance totalRemaining virtual
  const validBal = new LeaveBalance({
    employeeId: 'EMP-001',
    casual: { total: 6, used: 1, remaining: 5 },
    sick: { total: 8, used: 2, remaining: 6 },
    paid: { total: 14, used: 3, remaining: 11 },
  });
  assert(validBal.totalRemaining === 22, 'LeaveBalance.totalRemaining computes 22');

  // --- TEST 6: Security & Privacy Guarantees ---
  console.log('\n[6/7] Testing Security & Anonymity Enforcement...');
  // PasswordHash omitted in JSON
  const userJson = validUser.toJSON();
  assert(userJson.passwordHash === undefined, 'User.toJSON() strictly excludes passwordHash');

  // Anonymous Feedback identity scrubbing
  const anonFeedback = new Feedback({
    category: 'Workplace',
    subject: 'Ergonomic Pods',
    message: 'Test message for anonymous feedback evaluation.',
    isAnonymous: true,
    employeeId: 'EMP-006', // attempting to attach ID
    employeeName: 'Jordan Lee',
    employeeDepartment: 'Engineering',
  });
  // Execute pre-validate hook logic via validate()
  await anonFeedback.validate();
  const feedbackJson = anonFeedback.toJSON();
  assert(anonFeedback.employeeId === null, 'Feedback pre-validate hook scrubbed employeeId to null');
  assert(anonFeedback.employeeName === 'Anonymous Colleague', 'Feedback pre-validate hook scrubbed employeeName');
  assert(feedbackJson.employeeId === null, 'Feedback.toJSON() scrubs employeeId to null');
  assert(feedbackJson.employeeName === 'Anonymous Colleague', 'Feedback.toJSON() masks employeeName to Anonymous Colleague');

  // Named Feedback retains identity
  const namedFeedback = new Feedback({
    category: 'Workplace',
    subject: 'Named Suggestion',
    message: 'Test message for named feedback evaluation.',
    isAnonymous: false,
    employeeId: 'EMP-001',
    employeeName: 'Marcus Vance',
    employeeDepartment: 'Engineering',
  });
  await namedFeedback.validate();
  assert(namedFeedback.employeeId === 'EMP-001', 'Named feedback correctly preserves employeeId');
  assert(namedFeedback.employeeName === 'Marcus Vance', 'Named feedback correctly preserves employeeName');

  // --- TEST 7: Indexes Audit ---
  console.log('\n[7/7] Testing Compound & Unique Index Definitions...');
  // Attendance compound index
  const attIndexes = Attendance.schema.indexes();
  const attCompound = attIndexes.find(idx => idx[0].employeeId === 1 && idx[0].date === 1 && idx[1]?.unique === true);
  assert(Boolean(attCompound), 'Attendance has compound unique index on { employeeId: 1, date: 1 }');

  // PayrollRecord compound index
  const payIndexes = PayrollRecord.schema.indexes();
  const payCompound = payIndexes.find(idx => idx[0].employeeId === 1 && idx[0].payrollMonth === 1 && idx[1]?.unique === true);
  assert(Boolean(payCompound), 'PayrollRecord has compound unique index on { employeeId: 1, payrollMonth: 1 }');

  // Notification partial unique index on eventId
  const notifIndexes = Notification.schema.indexes();
  const notifPartial = notifIndexes.find(idx => idx[0].eventId === 1 && idx[1]?.unique === true && idx[1]?.partialFilterExpression);
  assert(Boolean(notifPartial), 'Notification has unique partial index on eventId');

  // LeaveBalance static methods for safe atomic transactions
  assert(typeof LeaveBalance.deductBalance === 'function', 'LeaveBalance defines deductBalance atomic handler');
  assert(typeof LeaveBalance.restoreBalance === 'function', 'LeaveBalance defines restoreBalance atomic handler');

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED CLEANLY (100%)`);
  console.log('====================================================');
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\nTest Suite Failed:', err);
    process.exit(1);
  });
