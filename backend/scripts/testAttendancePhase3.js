import http from 'http';
import app from '../server.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { signToken } from '../config/jwt.js';
import User from '../models/User.js';
import Attendance from '../models/Attendance.js';
import { getTodayChicagoDate, getChicagoTimeParts } from '../controllers/attendanceController.js';

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

async function runAttendancePhase3Tests() {
  console.log('====================================================');
  console.log('VISARTECH People — Step 18 Phase 3 Attendance QA Suite');
  console.log('====================================================');

  await connectDB();

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. Fetch reference users from database
    const adminUser = await User.findOne({ role: 'HR_ADMIN' });
    const empUser1 = await User.findOne({ employeeId: 'EMP-001' });
    const empUser6 = await User.findOne({ employeeId: 'EMP-006' });

    if (!adminUser || !empUser1 || !empUser6) {
      throw new Error('Database is missing required seeded users (HR Admin, EMP-001, EMP-006).');
    }

    // Create an isolated temporary test employee to prevent altering seeded employee attendance
    const testEmpId = 'EMP-QA99';
    await User.deleteOne({ employeeId: testEmpId });
    const testUser = await User.create({
      employeeId: testEmpId,
      firstName: 'Test',
      lastName: 'Attendee',
      email: 'test.attendee@visartech.demo',
      passwordHash: await User.hashPassword('Pass@123'),
      role: 'EMPLOYEE',
      jobTitle: 'QA Automation Engineer',
      department: 'Engineering',
      employmentStatus: 'Active',
      joiningDate: new Date(),
      phone: '+1 (312) 555-0199',
      address: '100 N State St',
      city: 'Chicago',
      state: 'IL',
    });

    // Clean any pre-existing attendance for this test employee
    await Attendance.deleteMany({ employeeId: testEmpId });

    // Generate Tokens
    const adminToken = signToken({
      _id: adminUser._id.toString(),
      id: adminUser._id.toString(),
      employeeId: adminUser.employeeId,
      email: adminUser.email,
      role: 'HR_ADMIN',
    });

    const empToken = signToken({
      _id: testUser._id.toString(),
      id: testUser._id.toString(),
      employeeId: testUser.employeeId,
      email: testUser.email,
      role: 'EMPLOYEE',
    });

    const emp6Token = signToken({
      _id: empUser6._id.toString(),
      id: empUser6._id.toString(),
      employeeId: empUser6.employeeId,
      email: empUser6.email,
      role: 'EMPLOYEE',
    });

    // Helper fetch wrapper
    async function apiRequest(endpoint, options = {}) {
      const { method = 'GET', token, body } = options;
      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const fetchOpts = { method, headers };
      if (body) {
        fetchOpts.body = JSON.stringify(body);
      }
      const res = await fetch(`${baseUrl}${endpoint}`, fetchOpts);
      let data = null;
      try {
        data = await res.json();
      } catch (e) {
        data = null;
      }
      return { status: res.status, data };
    }

    // -------------------------------------------------------------
    // Test Group 1: Employee Check-In & Validation
    // -------------------------------------------------------------
    console.log('\n--- 1. Employee Check-In & Validation ---');

    // 1.1 Unauthenticated check-in rejected
    const unauthCheckIn = await apiRequest('/api/attendance/check-in', { method: 'POST' });
    assert(unauthCheckIn.status === 401, 'Unauthenticated POST /api/attendance/check-in returns 401 Unauthorized');

    // 1.2 Employee successful check-in
    const checkInRes = await apiRequest('/api/attendance/check-in', {
      method: 'POST',
      token: empToken,
      body: { note: 'Starting morning engineering session' },
    });
    assert(
      checkInRes.status === 201 || checkInRes.status === 200,
      'Employee check-in succeeds with 200/201 status'
    );
    assert(checkInRes.data?.success === true, 'Check-in response indicates success: true');
    assert(checkInRes.data?.record?.employeeId === testEmpId, `Check-in record is assigned to ${testEmpId}`);
    assert(checkInRes.data?.record?.checkInTime !== null, 'Server-generated check-in timestamp is set');
    assert(
      ['present', 'late'].includes(checkInRes.data?.record?.status),
      `Check-in status is valid enum ('present' or 'late') [actual: ${checkInRes.data?.record?.status}]`
    );

    // 1.3 Duplicate check-in rejected
    const dupCheckInRes = await apiRequest('/api/attendance/check-in', {
      method: 'POST',
      token: empToken,
      body: { note: 'Attempting second check-in' },
    });
    assert(dupCheckInRes.status === 409, 'Duplicate check-in for the same date is rejected with 409 Conflict');
    assert(dupCheckInRes.data?.success === false, 'Duplicate check-in response indicates success: false');

    // -------------------------------------------------------------
    // Test Group 2: Check-Out & Duration Calculation
    // -------------------------------------------------------------
    console.log('\n--- 2. Employee Check-Out & Duration Calculation ---');

    // 2.1 Check-out without check-in rejected (using a user that has not checked in today)
    // Create an employee with no check-in today
    const noCheckInEmpId = 'EMP-QA00';
    await User.deleteOne({ employeeId: noCheckInEmpId });
    const noCheckInUser = await User.create({
      employeeId: noCheckInEmpId,
      firstName: 'No',
      lastName: 'Punch',
      email: 'nopunch@visartech.demo',
      passwordHash: await User.hashPassword('Pass@123'),
      role: 'EMPLOYEE',
      jobTitle: 'Intern',
      department: 'Engineering',
      employmentStatus: 'Active',
      joiningDate: new Date(),
      phone: '+1 (312) 555-0100',
      address: '100 N State St',
      city: 'Chicago',
      state: 'IL',
    });
    const noCheckInToken = signToken({
      _id: noCheckInUser._id.toString(),
      id: noCheckInUser._id.toString(),
      employeeId: noCheckInEmpId,
      email: noCheckInUser.email,
      role: 'EMPLOYEE',
    });

    const checkOutWithoutCheckIn = await apiRequest('/api/attendance/check-out', {
      method: 'POST',
      token: noCheckInToken,
    });
    assert(
      checkOutWithoutCheckIn.status === 400,
      'Check-out without active check-in is rejected with 400 Bad Request'
    );
    await User.deleteOne({ employeeId: noCheckInEmpId });

    // 2.2 Employee check-out succeeds
    // Artificially adjust testUser's checkInTime to 8 hours ago in DB to verify duration calculation
    const eightHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000);
    const todayChicago = getTodayChicagoDate();
    await Attendance.updateOne(
      { employeeId: testEmpId, date: todayChicago },
      { checkInTime: eightHoursAgo }
    );

    const checkOutRes = await apiRequest('/api/attendance/check-out', {
      method: 'POST',
      token: empToken,
    });
    assert(checkOutRes.status === 200, 'Employee check-out succeeds with 200 OK');
    assert(checkOutRes.data?.success === true, 'Check-out response indicates success: true');
    assert(checkOutRes.data?.record?.checkOutTime !== null, 'Check-out timestamp is recorded');

    // 2.3 Duration calculated accurately
    const duration = checkOutRes.data?.record?.durationHours;
    assert(
      typeof duration === 'number' && duration >= 7.9 && duration <= 8.1,
      `Working duration calculated accurately based on elapsed timestamps (expected ~8.0, actual: ${duration})`
    );

    // 2.4 Duplicate check-out rejected
    const dupCheckOutRes = await apiRequest('/api/attendance/check-out', {
      method: 'POST',
      token: empToken,
    });
    assert(dupCheckOutRes.status === 409, 'Duplicate check-out is rejected with 409 Conflict');

    // -------------------------------------------------------------
    // Test Group 3: Employee Self-Service Scope & Privacy
    // -------------------------------------------------------------
    console.log('\n--- 3. Employee Self-Service Scope & Privacy ---');

    // 3.1 Employee can view own attendance
    const myAttRes = await apiRequest('/api/attendance/my', { token: empToken });
    assert(myAttRes.status === 200, 'GET /api/attendance/my returns 200 OK');
    assert(myAttRes.data?.success === true, 'My attendance response indicates success: true');
    assert(
      myAttRes.data?.attendance?.every((r) => r.employeeId === testEmpId),
      `Returned records belong exclusively to logged-in employee (${testEmpId})`
    );

    // 3.2 Client cannot spoof employeeId in /my query
    const spoofAttempt = await apiRequest(`/api/attendance/my?employeeId=EMP-001`, { token: empToken });
    assert(
      spoofAttempt.data?.attendance?.every((r) => r.employeeId === testEmpId),
      'Client-provided employeeId in query is ignored; scoped strictly to req.user.employeeId'
    );

    // 3.3 Employee personal summary
    const mySummaryRes = await apiRequest('/api/attendance/my/summary', { token: empToken });
    assert(mySummaryRes.status === 200, 'GET /api/attendance/my/summary returns 200 OK');
    assert(mySummaryRes.data?.summary?.totalRecords >= 1, 'Summary reflects at least 1 record for test user');
    assert(
      typeof mySummaryRes.data?.summary?.totalWorkingHours === 'number',
      'Summary returns totalWorkingHours numeric metric'
    );

    // 3.4 Today endpoint returns today status
    const todayRes = await apiRequest('/api/attendance/today', { token: empToken });
    assert(todayRes.status === 200, 'GET /api/attendance/today returns 200 OK');
    assert(todayRes.data?.isCheckedOut === true, 'Today endpoint reflects checked-out state');

    // -------------------------------------------------------------
    // Test Group 4: Role-Based Access Control (RBAC)
    // -------------------------------------------------------------
    console.log('\n--- 4. Role-Based Access Control (RBAC) ---');

    // 4.1 EMPLOYEE accessing organization attendance roster (Forbidden)
    const empOrgRoster = await apiRequest('/api/attendance', { token: empToken });
    assert(empOrgRoster.status === 403, 'EMPLOYEE access to GET /api/attendance returns 403 Forbidden');

    // 4.2 EMPLOYEE accessing organization summary (Forbidden)
    const empOrgSummary = await apiRequest('/api/attendance/summary', { token: empToken });
    assert(empOrgSummary.status === 403, 'EMPLOYEE access to GET /api/attendance/summary returns 403 Forbidden');

    // 4.3 EMPLOYEE attempting attendance record update (Forbidden)
    const empUpdate = await apiRequest(`/api/attendance/${checkInRes.data?.record?._id}`, {
      method: 'PUT',
      token: empToken,
      body: { status: 'present' },
    });
    assert(empUpdate.status === 403, 'EMPLOYEE attempting PUT /api/attendance/:id returns 403 Forbidden');

    // 4.4 HR_ADMIN access to organization roster (Success)
    const adminRoster = await apiRequest('/api/attendance', { token: adminToken });
    assert(adminRoster.status === 200, 'HR_ADMIN access to GET /api/attendance returns 200 OK');
    assert(adminRoster.data?.success === true, 'HR_ADMIN roster indicates success: true');
    assert(adminRoster.data?.totalCount >= 1, 'HR_ADMIN roster contains organizational records');
    assert(Array.isArray(adminRoster.data?.attendance), 'HR_ADMIN roster returns attendance array');

    // -------------------------------------------------------------
    // Test Group 5: Filters, Search, and Pagination
    // -------------------------------------------------------------
    console.log('\n--- 5. Search, Filters, and Pagination ---');

    // 5.1 Department filter
    const deptRes = await apiRequest('/api/attendance?department=Engineering', { token: adminToken });
    assert(deptRes.status === 200, 'Filter by department=Engineering returns 200 OK');
    assert(
      deptRes.data?.attendance?.every((r) => r.department === 'Engineering'),
      'All returned records belong to Engineering department'
    );

    // 5.2 Status filter
    const statusRes = await apiRequest('/api/attendance?status=present', { token: adminToken });
    assert(statusRes.status === 200, 'Filter by status=present returns 200 OK');
    assert(
      statusRes.data?.attendance?.every((r) => r.status.toLowerCase() === 'present'),
      'All filtered records have status: present'
    );

    // 5.3 Date filter
    const dateRes = await apiRequest(`/api/attendance?date=${todayChicago}`, { token: adminToken });
    assert(dateRes.status === 200, `Filter by date=${todayChicago} returns 200 OK`);
    assert(
      dateRes.data?.attendance?.every((r) => r.date === todayChicago),
      'All filtered records have matching Chicago date'
    );

    // 5.4 Pagination
    const pageRes = await apiRequest('/api/attendance?page=1&limit=2', { token: adminToken });
    assert(pageRes.status === 200, 'Pagination query (page=1, limit=2) returns 200 OK');
    assert(pageRes.data?.attendance?.length <= 2, 'Pagination limits output to <= 2 records');
    assert(pageRes.data?.page === 1, 'Pagination response specifies page: 1');
    assert(pageRes.data?.totalPages >= 1, 'Pagination response computes totalPages');

    // -------------------------------------------------------------
    // Test Group 6: Organization Attendance Metrics
    // -------------------------------------------------------------
    console.log('\n--- 6. Organization Attendance Metrics ---');

    const orgSummaryRes = await apiRequest('/api/attendance/summary', { token: adminToken });
    assert(orgSummaryRes.status === 200, 'GET /api/attendance/summary returns 200 OK');
    assert(orgSummaryRes.data?.summary?.totalEmployees >= 7, 'Metrics report total active employees >= 7');
    assert(typeof orgSummaryRes.data?.summary?.presentCount === 'number', 'Metrics include presentCount');
    assert(typeof orgSummaryRes.data?.summary?.lateCount === 'number', 'Metrics include lateCount');
    assert(typeof orgSummaryRes.data?.summary?.absentCount === 'number', 'Metrics include absentCount');
    assert(typeof orgSummaryRes.data?.summary?.totalHoursLogged === 'number', 'Metrics include totalHoursLogged');

    // -------------------------------------------------------------
    // Test Group 7: HR Admin Record Correction & Audit Trail
    // -------------------------------------------------------------
    console.log('\n--- 7. HR Admin Record Correction & Validation ---');

    const recordToCorrect = checkInRes.data?.record;
    if (recordToCorrect?._id) {
      // 7.1 Invalid status rejected
      const invalidStatusRes = await apiRequest(`/api/attendance/${recordToCorrect._id}`, {
        method: 'PUT',
        token: adminToken,
        body: { status: 'invalid_status_enum' },
      });
      assert(invalidStatusRes.status === 400, 'Updating record with invalid status enum returns 400 Bad Request');

      // 7.2 Check-out earlier than check-in rejected
      const invalidSeqRes = await apiRequest(`/api/attendance/${recordToCorrect._id}`, {
        method: 'PUT',
        token: adminToken,
        body: {
          checkInTime: '2026-11-18T15:00:00Z',
          checkOutTime: '2026-11-18T14:00:00Z',
        },
      });
      assert(invalidSeqRes.status === 400, 'Check-out time earlier than check-in time returns 400 Bad Request');

      // 7.3 Valid correction by HR_ADMIN
      const validCorrectionRes = await apiRequest(`/api/attendance/${recordToCorrect._id}`, {
        method: 'PUT',
        token: adminToken,
        body: {
          status: 'present',
          durationHours: 8.5,
          note: 'Approved by VP of People',
        },
      });
      assert(validCorrectionRes.status === 200, 'Valid attendance correction returns 200 OK');
      assert(validCorrectionRes.data?.record?.status === 'present', 'Record status updated to present');
      assert(validCorrectionRes.data?.record?.durationHours === 8.5, 'Duration hours updated to 8.5');
      assert(
        validCorrectionRes.data?.record?.checkInNote?.includes('Admin Correction: Approved by VP of People'),
        'Audit trail note appended to record'
      );
    } else {
      assert(false, 'Record to correct was missing', 'Check-in record ID not found');
    }

    // -------------------------------------------------------------
    // Test Group 8: Timezone & Boundary Compliance
    // -------------------------------------------------------------
    console.log('\n--- 8. America/Chicago Timezone Compliance ---');

    // Test timezone date resolution
    const utcDate = new Date();
    const resolvedChicagoDate = getTodayChicagoDate(utcDate);
    assert(
      /^\d{4}-\d{2}-\d{2}$/.test(resolvedChicagoDate),
      `Chicago business date resolves to valid YYYY-MM-DD (${resolvedChicagoDate})`
    );

    // Test Chicago time parts
    const timeParts = getChicagoTimeParts(utcDate);
    assert(
      typeof timeParts.hour === 'number' && timeParts.hour >= 0 && timeParts.hour < 24,
      `Chicago hour is within valid 0-23 range (${timeParts.hour})`
    );
    assert(
      typeof timeParts.minute === 'number' && timeParts.minute >= 0 && timeParts.minute < 60,
      `Chicago minute is within valid 0-59 range (${timeParts.minute})`
    );

    // -------------------------------------------------------------
    // Cleanup: Remove temporary test records
    // -------------------------------------------------------------
    console.log('\n--- Cleanup ---');
    await Attendance.deleteMany({ employeeId: testEmpId });
    await User.deleteOne({ employeeId: testEmpId });
    console.log('Cleaned up isolated QA test employee and attendance records.');

  } catch (err) {
    console.error('Fatal test execution error:', err);
    failed++;
  } finally {
    server.close();
    await disconnectDB();
  }

  console.log('\n====================================================');
  console.log(`Phase 3 Test Summary: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAttendancePhase3Tests();
