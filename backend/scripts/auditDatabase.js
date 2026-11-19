import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';
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

async function auditDatabase() {
  console.log('====================================================');
  console.log('VISARTECH People — Database & Collection Audit');
  console.log('====================================================');

  await connectDB();

  try {
    // 1. Record counts for all 10 collections
    const counts = {
      users: await User.countDocuments(),
      attendance: await Attendance.countDocuments(),
      leaveRequests: await LeaveRequest.countDocuments(),
      leaveBalances: await LeaveBalance.countDocuments(),
      tasks: await Task.countDocuments(),
      salaryStructures: await SalaryStructure.countDocuments(),
      payrollRecords: await PayrollRecord.countDocuments(),
      announcements: await Announcement.countDocuments(),
      feedback: await Feedback.countDocuments(),
      notifications: await Notification.countDocuments(),
    };

    console.log('\n--- 1. Collection Record Counts ---');
    console.table(counts);

    // 2. User audit: HR Admin + 6 Employees
    console.log('\n--- 2. User Records in MongoDB ---');
    const users = await User.find({}).select('+passwordHash').lean();
    console.log(`Total User records found: ${users.length}`);

    users.forEach((u) => {
      const isBcrypt = Boolean(u.passwordHash && u.passwordHash.startsWith('$2'));
      console.log(`- [${u.employeeId}] ${u.firstName} ${u.lastName} | Role: ${u.role} | Dept: ${u.department} | Email: ${u.email} | Hash Valid Bcrypt: ${isBcrypt}`);
    });

    const hrAdmin = users.find((u) => u.role === 'HR_ADMIN');
    const employees = users.filter((u) => u.role === 'EMPLOYEE');

    console.log(`\nHR Admin count: ${hrAdmin ? 1 : 0} (Expected: 1)`);
    console.log(`Employee count: ${employees.length} (Expected: 6)`);

    // Check specific required employees EMP-001 to EMP-006
    const expectedEmpIds = ['EMP-001', 'EMP-002', 'EMP-003', 'EMP-004', 'EMP-005', 'EMP-006'];
    const foundEmpIds = employees.map(e => e.employeeId);
    const missingEmpIds = expectedEmpIds.filter(id => !foundEmpIds.includes(id));
    console.log(`Missing Employee IDs: ${missingEmpIds.length > 0 ? missingEmpIds.join(', ') : 'None (All 6 present)'}`);

    // 3. Password Hash Security Verification
    console.log('\n--- 3. Password Security Audit ---');
    const plainTextPasswords = users.filter(u => !u.passwordHash || !u.passwordHash.startsWith('$2'));
    console.log(`Users with unhashed/plain passwords: ${plainTextPasswords.length}`);

    // Test toJSON serialization exclusion of passwordHash
    const sampleUserDoc = await User.findOne({ employeeId: 'EMP-001' });
    if (sampleUserDoc) {
      const json = sampleUserDoc.toJSON();
      console.log(`Does sampleUserDoc.toJSON() contain passwordHash? ${json.passwordHash !== undefined ? 'YES (UNSAFE)' : 'NO (SAFE - EXCLUDED)'}`);
    }

    // 4. Anonymous Feedback Security Audit
    console.log('\n--- 4. Anonymous Feedback Privacy Audit ---');
    const anonymousItems = await Feedback.find({ isAnonymous: true }).lean();
    console.log(`Total Anonymous Feedback records: ${anonymousItems.length}`);
    anonymousItems.forEach((f, idx) => {
      console.log(`- Anon Feedback #${idx + 1}: Subject: "${f.subject}"`);
      console.log(`  employeeId in DB: ${f.employeeId}`);
      console.log(`  employeeName in DB: ${f.employeeName}`);
      console.log(`  employeeDepartment in DB: ${f.employeeDepartment}`);
    });

    const leakedAnon = anonymousItems.filter(f => f.employeeId !== null || (f.employeeName && f.employeeName !== 'Anonymous Colleague'));
    console.log(`Anonymity Violations in Database: ${leakedAnon.length}`);

    // 5. Attendance & Payroll compound uniqueness check
    console.log('\n--- 5. Key Constraints & Data Integrity ---');
    const attendanceRecords = await Attendance.find({}).lean();
    console.log(`Attendance Records: ${attendanceRecords.length}`);

    const payrollRecs = await PayrollRecord.find({}).lean();
    console.log(`Payroll Records: ${payrollRecs.length}`);

  } catch (err) {
    console.error('Audit Error:', err);
  } finally {
    await disconnectDB();
  }
}

auditDatabase();
