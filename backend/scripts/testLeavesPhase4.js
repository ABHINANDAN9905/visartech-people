import http from 'http';
import app from '../server.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { signToken } from '../config/jwt.js';
import User from '../models/User.js';
import LeaveRequest from '../models/LeaveRequest.js';
import LeaveBalance from '../models/LeaveBalance.js';

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

async function runLeavesPhase4Tests() {
  console.log('====================================================');
  console.log('VISARTECH People — Step 18 Phase 4 Leave QA Suite');
  console.log('====================================================');

  await connectDB();

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  // Isolated QA Test IDs
  const qaEmpId = 'EMP-QALV99';
  const otherEmpId = 'EMP-QALV88';

  try {
    // 1. Fetch reference users from database
    const adminUser = await User.findOne({ role: 'HR_ADMIN' });
    const empUser1 = await User.findOne({ employeeId: 'EMP-001' });

    if (!adminUser || !empUser1) {
      throw new Error('Database is missing required seeded users (HR Admin, EMP-001).');
    }

    // 2. Setup isolated test employees
    await User.deleteMany({ employeeId: { $in: [qaEmpId, otherEmpId] } });
    await LeaveRequest.deleteMany({ employeeId: { $in: [qaEmpId, otherEmpId] } });
    await LeaveBalance.deleteMany({ employeeId: { $in: [qaEmpId, otherEmpId] } });

    const qaUser = await User.create({
      employeeId: qaEmpId,
      firstName: 'Elena',
      lastName: 'Tester',
      email: 'elena.tester@visartech.demo',
      passwordHash: await User.hashPassword('Pass@123'),
      role: 'EMPLOYEE',
      jobTitle: 'QA Lead',
      department: 'Engineering',
      employmentStatus: 'Active',
      joiningDate: new Date(),
      phone: '+1 (312) 555-0188',
      address: '100 N State St',
      city: 'Chicago',
      state: 'IL',
    });

    const otherUser = await User.create({
      employeeId: otherEmpId,
      firstName: 'Other',
      lastName: 'Colleague',
      email: 'other.colleague@visartech.demo',
      passwordHash: await User.hashPassword('Pass@123'),
      role: 'EMPLOYEE',
      jobTitle: 'Developer',
      department: 'Product & Design',
      employmentStatus: 'Active',
      joiningDate: new Date(),
      phone: '+1 (312) 555-0177',
      address: '200 N State St',
      city: 'Chicago',
      state: 'IL',
    });

    // Create custom balance for qaUser: 6 casual, 8 sick, 14 paid
    await LeaveBalance.create({
      employeeId: qaEmpId,
      user: qaUser._id,
      casual: { total: 6, used: 0, remaining: 6 },
      sick: { total: 8, used: 0, remaining: 8 },
      paid: { total: 14, used: 0, remaining: 14 },
    });

    // Generate tokens
    const adminToken = signToken({
      _id: adminUser._id.toString(),
      id: adminUser._id.toString(),
      employeeId: adminUser.employeeId,
      email: adminUser.email,
      role: 'HR_ADMIN',
    });

    const qaToken = signToken({
      _id: qaUser._id.toString(),
      id: qaUser._id.toString(),
      employeeId: qaEmpId,
      email: qaUser.email,
      role: 'EMPLOYEE',
    });

    const otherToken = signToken({
      _id: otherUser._id.toString(),
      id: otherUser._id.toString(),
      employeeId: otherEmpId,
      email: otherUser.email,
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
    // Test Group 1: Apply Leave & Input Validation
    // -------------------------------------------------------------
    console.log('\n--- 1. Apply Leave & Input Validation ---');

    // 1.1 Unauthenticated leave application
    const unauthApply = await apiRequest('/api/leaves', {
      method: 'POST',
      body: { leaveType: 'CASUAL', startDate: '2026-12-01', endDate: '2026-12-02', reason: 'Vacation' },
    });
    assert(unauthApply.status === 401, 'Unauthenticated POST /api/leaves returns 401 Unauthorized');

    // 1.2 Invalid date range (end before start)
    const invalidDateRange = await apiRequest('/api/leaves', {
      method: 'POST',
      token: qaToken,
      body: { leaveType: 'CASUAL', startDate: '2026-12-05', endDate: '2026-12-01', reason: 'Invalid dates' },
    });
    assert(invalidDateRange.status === 400, 'Invalid date range (endDate < startDate) is rejected with 400 Bad Request');

    // 1.3 Invalid leave type
    const invalidType = await apiRequest('/api/leaves', {
      method: 'POST',
      token: qaToken,
      body: { leaveType: 'PARTY_TIME', startDate: '2026-12-01', endDate: '2026-12-02', reason: 'Not real type' },
    });
    assert(invalidType.status === 400, 'Invalid leave type is rejected with 400 Bad Request');

    // 1.4 Valid leave application & server day calculation
    const validApply = await apiRequest('/api/leaves', {
      method: 'POST',
      token: qaToken,
      body: {
        leaveType: 'CASUAL',
        startDate: '2026-12-01',
        endDate: '2026-12-03', // Dec 1, 2, 3 = 3 days
        reason: 'Personal family event',
      },
    });
    assert(validApply.status === 201, 'Employee can apply for valid leave (201 Created)');
    assert(validApply.data?.leave?.days === 3, 'Server calculates leave days correctly (Dec 1 to Dec 3 = 3 days)');
    assert(validApply.data?.leave?.status === 'PENDING', 'Created leave request has PENDING status');
    assert(validApply.data?.leave?.employeeId === qaEmpId, `Request strictly assigned to authenticated employee ${qaEmpId}`);

    const firstLeaveId = validApply.data?.leave?._id;

    // 1.5 Insufficient leave balance rejected
    const excessApply = await apiRequest('/api/leaves', {
      method: 'POST',
      token: qaToken,
      body: {
        leaveType: 'CASUAL',
        startDate: '2026-12-10',
        endDate: '2026-12-25', // 16 days (available casual is 6)
        reason: 'Too many days',
      },
    });
    assert(excessApply.status === 400, 'Insufficient leave balance is rejected with 400 Bad Request');
    assert(
      excessApply.data?.message?.includes('Insufficient CASUAL leave balance'),
      'Error message clarifies insufficient balance'
    );

    // 1.6 Overlapping leave request rejected
    const overlapApply = await apiRequest('/api/leaves', {
      method: 'POST',
      token: qaToken,
      body: {
        leaveType: 'CASUAL',
        startDate: '2026-12-02', // Overlaps with 2026-12-01 - 2026-12-03
        endDate: '2026-12-04',
        reason: 'Overlapping request',
      },
    });
    assert(overlapApply.status === 400, 'Overlapping leave request is rejected with 400 Bad Request');

    // -------------------------------------------------------------
    // Test Group 2: Employee Self-Service Scope & Privacy
    // -------------------------------------------------------------
    console.log('\n--- 2. Employee Scope & Privacy ---');

    // 2.1 Employee views only their own leave requests
    const myLeavesRes = await apiRequest('/api/leaves/my', { token: qaToken });
    assert(myLeavesRes.status === 200, 'GET /api/leaves/my returns 200 OK');
    assert(
      myLeavesRes.data?.leaves?.every((l) => l.employeeId === qaEmpId),
      `Returned requests belong exclusively to authenticated employee ${qaEmpId}`
    );

    // 2.2 Employee cannot view another employee's records via query spoofing
    const spoofQuery = await apiRequest(`/api/leaves/my?employeeId=${otherEmpId}`, { token: qaToken });
    assert(
      spoofQuery.data?.leaves?.every((l) => l.employeeId === qaEmpId),
      'Client query param employeeId is ignored; scoped strictly to req.user'
    );

    // 2.3 Employee views their own leave balance
    const myBalanceRes = await apiRequest('/api/leaves/my/balance', { token: qaToken });
    assert(myBalanceRes.status === 200, 'GET /api/leaves/my/balance returns 200 OK');
    assert(myBalanceRes.data?.balance?.casual?.total === 6, 'Casual total entitlement is 6');
    assert(myBalanceRes.data?.balance?.casual?.remaining === 6, 'Casual remaining entitlement is 6 (not yet deducted while PENDING)');

    // -------------------------------------------------------------
    // Test Group 3: Cancellation Rules & Privacy
    // -------------------------------------------------------------
    console.log('\n--- 3. Leave Request Cancellation & Permissions ---');

    // 3.1 Employee cannot cancel another employee's request
    const unauthorizedCancel = await apiRequest(`/api/leaves/${firstLeaveId}/cancel`, {
      method: 'PATCH',
      token: otherToken, // Other colleague trying to cancel QA lead's request
    });
    assert(unauthorizedCancel.status === 403, 'Employee attempting to cancel colleague request returns 403 Forbidden');

    // 3.2 Employee can cancel their own eligible PENDING request
    const validCancel = await apiRequest(`/api/leaves/${firstLeaveId}/cancel`, {
      method: 'PATCH',
      token: qaToken,
    });
    assert(validCancel.status === 200, 'Employee cancels their own eligible pending request returns 200 OK');
    assert(validCancel.data?.leave?.status === 'CANCELLED', 'Request status transitioned to CANCELLED');

    // 3.3 Repeated cancellation attempt rejected
    const repeatCancel = await apiRequest(`/api/leaves/${firstLeaveId}/cancel`, {
      method: 'PATCH',
      token: qaToken,
    });
    assert(repeatCancel.status === 400, 'Repeated cancellation of already cancelled leave returns 400 Bad Request');

    // -------------------------------------------------------------
    // Test Group 4: Role-Based Access Control (RBAC)
    // -------------------------------------------------------------
    console.log('\n--- 4. Role-Based Access Control (RBAC) ---');

    // 4.1 EMPLOYEE accessing HR Admin roster (Forbidden)
    const empOrgLeaves = await apiRequest('/api/leaves', { token: qaToken });
    assert(empOrgLeaves.status === 403, 'EMPLOYEE access to GET /api/leaves returns 403 Forbidden');

    // 4.2 EMPLOYEE accessing HR Admin stats (Forbidden)
    const empStats = await apiRequest('/api/leaves/stats', { token: qaToken });
    assert(empStats.status === 403, 'EMPLOYEE access to GET /api/leaves/stats returns 403 Forbidden');

    // 4.3 EMPLOYEE attempting approval (Forbidden)
    const empApprove = await apiRequest(`/api/leaves/${firstLeaveId}/approve`, {
      method: 'PATCH',
      token: qaToken,
    });
    assert(empApprove.status === 403, 'EMPLOYEE attempting PATCH /api/leaves/:id/approve returns 403 Forbidden');

    // 4.4 HR_ADMIN access to organization roster (Success)
    const adminRoster = await apiRequest('/api/leaves', { token: adminToken });
    assert(adminRoster.status === 200, 'HR_ADMIN access to GET /api/leaves returns 200 OK');
    assert(Array.isArray(adminRoster.data?.leaves), 'HR_ADMIN roster returns leaves array');

    // -------------------------------------------------------------
    // Test Group 5: Approval, Balance Deduction & Concurrency
    // -------------------------------------------------------------
    console.log('\n--- 5. Approval & Atomic Balance Deduction ---');

    // Create a fresh PENDING request for testing approval
    const freshApply = await apiRequest('/api/leaves', {
      method: 'POST',
      token: qaToken,
      body: {
        leaveType: 'PAID',
        startDate: '2026-12-15',
        endDate: '2026-12-18', // 4 days
        reason: 'Holiday vacation',
      },
    });
    const freshLeaveId = freshApply.data?.leave?._id;
    assert(freshApply.status === 201, 'Fresh leave application created for approval testing (201 Created)');

    // 5.1 HR_ADMIN approves pending request
    const approveRes = await apiRequest(`/api/leaves/${freshLeaveId}/approve`, {
      method: 'PATCH',
      token: adminToken,
      body: { reviewerComments: 'Approved by People Operations' },
    });
    assert(approveRes.status === 200, 'HR_ADMIN approves pending request returns 200 OK');
    assert(approveRes.data?.leave?.status === 'APPROVED', 'Leave status updated to APPROVED');
    assert(
      approveRes.data?.leave?.reviewerComments === 'Approved by People Operations',
      'Reviewer comments recorded correctly'
    );

    // 5.2 Balance deducted exactly once
    const balanceAfterApprove = await LeaveBalance.findOne({ employeeId: qaEmpId });
    assert(
      balanceAfterApprove.paid.used === 4,
      `Leave balance used count incremented by 4 (actual: ${balanceAfterApprove.paid.used})`
    );
    assert(
      balanceAfterApprove.paid.remaining === 10,
      `Leave balance remaining count decremented to 10 (actual: ${balanceAfterApprove.paid.remaining})`
    );

    // 5.3 Repeated approval attempt rejected
    const repeatApprove = await apiRequest(`/api/leaves/${freshLeaveId}/approve`, {
      method: 'PATCH',
      token: adminToken,
    });
    assert(repeatApprove.status === 400, 'Repeated approval of already APPROVED request returns 400 Bad Request');

    // 5.4 Rejection of already approved request rejected
    const rejectApproved = await apiRequest(`/api/leaves/${freshLeaveId}/reject`, {
      method: 'PATCH',
      token: adminToken,
    });
    assert(rejectApproved.status === 400, 'Attempting to reject an already approved request returns 400 Bad Request');

    // -------------------------------------------------------------
    // Test Group 6: Approved Leave Cancellation & Balance Restoration
    // -------------------------------------------------------------
    console.log('\n--- 6. Approved Leave Cancellation & Restoration ---');

    // 6.1 Cancellation of APPROVED leave restores balance exactly once
    const cancelApproved = await apiRequest(`/api/leaves/${freshLeaveId}/cancel`, {
      method: 'PATCH',
      token: qaToken,
    });
    assert(cancelApproved.status === 200, 'Cancellation of APPROVED leave succeeds with 200 OK');
    assert(cancelApproved.data?.leave?.status === 'CANCELLED', 'Status transitioned to CANCELLED');

    const balanceAfterCancel = await LeaveBalance.findOne({ employeeId: qaEmpId });
    assert(
      balanceAfterCancel.paid.used === 0,
      `Balance used days restored back to 0 (actual: ${balanceAfterCancel.paid.used})`
    );
    assert(
      balanceAfterCancel.paid.remaining === 14,
      `Balance remaining days restored back to 14 (actual: ${balanceAfterCancel.paid.remaining})`
    );

    // -------------------------------------------------------------
    // Test Group 7: Rejection Flow & Zero Deduction
    // -------------------------------------------------------------
    console.log('\n--- 7. Rejection Flow & Balance Preservation ---');

    // Create a new PENDING request for testing rejection
    const rejectTestApply = await apiRequest('/api/leaves', {
      method: 'POST',
      token: qaToken,
      body: {
        leaveType: 'SICK',
        startDate: '2026-12-20',
        endDate: '2026-12-21', // 2 days
        reason: 'Medical recovery',
      },
    });
    const rejectLeaveId = rejectTestApply.data?.leave?._id;

    // 7.1 HR_ADMIN rejects pending request
    const rejectRes = await apiRequest(`/api/leaves/${rejectLeaveId}/reject`, {
      method: 'PATCH',
      token: adminToken,
      body: { reviewerComments: 'Scheduling conflict with deployment window' },
    });
    assert(rejectRes.status === 200, 'HR_ADMIN rejects pending request returns 200 OK');
    assert(rejectRes.data?.leave?.status === 'REJECTED', 'Status updated to REJECTED');

    // 7.2 Rejection does not deduct leave balance
    const balanceAfterReject = await LeaveBalance.findOne({ employeeId: qaEmpId });
    assert(
      balanceAfterReject.sick.used === 0 && balanceAfterReject.sick.remaining === 8,
      'Rejection does not deduct any leave balance (sick used: 0, remaining: 8)'
    );

    // -------------------------------------------------------------
    // Test Group 8: Filters, Pagination, and Statistics
    // -------------------------------------------------------------
    console.log('\n--- 8. Filters, Pagination, and Statistics ---');

    // 8.1 Department filter
    const engFilter = await apiRequest('/api/leaves?department=Engineering', { token: adminToken });
    assert(engFilter.status === 200, 'Filter by department=Engineering returns 200 OK');
    assert(
      engFilter.data?.leaves?.every((l) => l.department === 'Engineering'),
      'All returned leaves belong to Engineering department'
    );

    // 8.2 Status filter
    const pendingFilter = await apiRequest('/api/leaves?status=PENDING', { token: adminToken });
    assert(pendingFilter.status === 200, 'Filter by status=PENDING returns 200 OK');
    assert(
      pendingFilter.data?.leaves?.every((l) => l.status === 'PENDING'),
      'All returned leaves have status: PENDING'
    );

    // 8.3 Pagination
    const pageRes = await apiRequest('/api/leaves?page=1&limit=2', { token: adminToken });
    assert(pageRes.status === 200, 'Pagination query (page=1, limit=2) returns 200 OK');
    assert(pageRes.data?.leaves?.length <= 2, 'Pagination limits output to <= 2');
    assert(pageRes.data?.page === 1, 'Pagination response reports page: 1');
    assert(pageRes.data?.totalPages >= 1, 'Pagination response computes totalPages');

    // 8.4 Statistics match underlying records
    const statsRes = await apiRequest('/api/leaves/stats', { token: adminToken });
    assert(statsRes.status === 200, 'GET /api/leaves/stats returns 200 OK');
    assert(typeof statsRes.data?.stats?.totalRequests === 'number', 'Stats return totalRequests count');
    assert(typeof statsRes.data?.stats?.pendingCount === 'number', 'Stats return pendingCount');
    assert(typeof statsRes.data?.stats?.approvedCount === 'number', 'Stats return approvedCount');
    assert(typeof statsRes.data?.stats?.rejectedCount === 'number', 'Stats return rejectedCount');
    assert(typeof statsRes.data?.stats?.cancelledCount === 'number', 'Stats return cancelledCount');
    assert(typeof statsRes.data?.stats?.byType?.CASUAL === 'number', 'Stats return CASUAL breakdown count');

    // -------------------------------------------------------------
    // Cleanup: Remove isolated test employee, leaves, balances
    // -------------------------------------------------------------
    console.log('\n--- Cleanup ---');
    await LeaveRequest.deleteMany({ employeeId: { $in: [qaEmpId, otherEmpId] } });
    await LeaveBalance.deleteMany({ employeeId: { $in: [qaEmpId, otherEmpId] } });
    await User.deleteMany({ employeeId: { $in: [qaEmpId, otherEmpId] } });
    console.log('Cleaned up isolated QA test employees, leaves, and balances.');

  } catch (err) {
    console.error('Fatal test execution error:', err);
    failed++;
  } finally {
    server.close();
    await disconnectDB();
  }

  console.log('\n====================================================');
  console.log(`Phase 4 Test Summary: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runLeavesPhase4Tests();
