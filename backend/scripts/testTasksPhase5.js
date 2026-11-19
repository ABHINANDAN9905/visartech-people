import http from 'http';
import app from '../server.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { signToken } from '../config/jwt.js';
import User from '../models/User.js';
import Task from '../models/Task.js';

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

async function runTasksPhase5Tests() {
  console.log('====================================================');
  console.log('VISARTECH People — Step 18 Phase 5 Task & Performance QA Suite');
  console.log('====================================================');

  await connectDB();

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  // Isolated QA Test IDs
  const qaEmpId = 'EMP-QATSK1';
  const otherEmpId = 'EMP-QATSK2';

  const createdTestTaskIds = [];

  try {
    // Reference seeded users
    const adminUser = await User.findOne({ role: 'HR_ADMIN' });
    const empUser1 = await User.findOne({ employeeId: 'EMP-001' });

    if (!adminUser || !empUser1) {
      throw new Error('Database is missing required seeded users (HR Admin, EMP-001).');
    }

    const initialTaskCount = await Task.countDocuments();

    // Cleanup any lingering test users/tasks
    await User.deleteMany({ employeeId: { $in: [qaEmpId, otherEmpId] } });
    await Task.deleteMany({ assignedEmployeeId: { $in: [qaEmpId, otherEmpId] } });

    // Create test employees
    const qaUser = await User.create({
      employeeId: qaEmpId,
      firstName: 'Elena',
      lastName: 'Tester',
      email: 'elena.tester.tasks@visartech.demo',
      passwordHash: await User.hashPassword('Pass@123'),
      role: 'EMPLOYEE',
      jobTitle: 'QA Specialist',
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
      firstName: 'Marcus',
      lastName: 'Colleague',
      email: 'marcus.colleague.tasks@visartech.demo',
      passwordHash: await User.hashPassword('Pass@123'),
      role: 'EMPLOYEE',
      jobTitle: 'Product Designer',
      department: 'Product & Design',
      employmentStatus: 'Active',
      joiningDate: new Date(),
      phone: '+1 (312) 555-0177',
      address: '200 N State St',
      city: 'Chicago',
      state: 'IL',
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
      return { status: res.status, headers: res.headers, data };
    }

    // TEST 1: Unauthenticated task requests return 401
    console.log('\n--- 1. Authentication Enforcement ---');
    const unauthGetTasks = await apiRequest('/api/tasks');
    const unauthPostTasks = await apiRequest('/api/tasks', { method: 'POST', body: { title: 'Test' } });
    const unauthMyTasks = await apiRequest('/api/tasks/my');
    assert(
      unauthGetTasks.status === 401 && unauthPostTasks.status === 401 && unauthMyTasks.status === 401,
      'Test 1: Unauthenticated requests to /api/tasks, /api/tasks/my return 401 Unauthorized',
      `Got statuses: get=${unauthGetTasks.status}, post=${unauthPostTasks.status}, my=${unauthMyTasks.status}`
    );

    // TEST 2: HR_ADMIN can create tasks (returns 201)
    console.log('\n--- 2. Task Creation (HR_ADMIN) ---');
    const createRes = await apiRequest('/api/tasks', {
      method: 'POST',
      token: adminToken,
      body: {
        title: 'Implement QA Automation Workflow',
        description: 'Design and execute comprehensive regression tests for Phase 5.',
        assignedEmployeeId: qaEmpId,
        priority: 'HIGH',
        startDate: '2026-11-20',
        dueDate: '2026-11-30',
        estimatedHours: 16,
      },
    });
    const createdTask = createRes.data?.task;
    if (createdTask?.taskId) createdTestTaskIds.push(createdTask.taskId);

    assert(
      createRes.status === 201 &&
        createRes.data?.success === true &&
        createdTask &&
        createdTask.taskId &&
        createdTask.taskId.startsWith('TSK-') &&
        createdTask.status === 'TODO' &&
        createdTask.progress === 0 &&
        createdTask.assignedEmployeeId === qaEmpId,
      'Test 2: HR_ADMIN can create tasks with auto-generated taskId and initial TODO status',
      JSON.stringify(createRes.data)
    );

    // TEST 3: EMPLOYEE cannot create tasks (returns 403)
    console.log('\n--- 3. Role-Based Access Control on Creation ---');
    const empCreateRes = await apiRequest('/api/tasks', {
      method: 'POST',
      token: qaToken,
      body: {
        title: 'Unauthorized Employee Task',
        description: 'Employees must not be allowed to create tasks directly.',
        assignedEmployeeId: qaEmpId,
        priority: 'LOW',
        startDate: '2026-11-20',
        dueDate: '2026-11-25',
      },
    });
    assert(
      empCreateRes.status === 403,
      'Test 3: EMPLOYEE cannot create tasks (returns 403 Forbidden)',
      `Status: ${empCreateRes.status}`
    );

    // TEST 4: Invalid assigned employee is rejected (returns 400)
    console.log('\n--- 4. Assignee Validation ---');
    const invalidAssigneeRes = await apiRequest('/api/tasks', {
      method: 'POST',
      token: adminToken,
      body: {
        title: 'Task for Ghost Employee',
        description: 'Should fail assignment validation.',
        assignedEmployeeId: 'EMP-NONEXISTENT',
        priority: 'MEDIUM',
        startDate: '2026-11-20',
        dueDate: '2026-11-25',
      },
    });
    assert(
      invalidAssigneeRes.status === 400 && invalidAssigneeRes.data?.success === false,
      'Test 4: Task creation with non-existent employeeId is rejected with 400 Bad Request',
      `Status: ${invalidAssigneeRes.status}, Message: ${invalidAssigneeRes.data?.message}`
    );

    // TEST 5: HR_ADMIN can view organizational tasks (returns 200)
    console.log('\n--- 5. Organization-wide Task Listing ---');
    const hrListRes = await apiRequest('/api/tasks', { token: adminToken });
    assert(
      hrListRes.status === 200 &&
        hrListRes.data?.success === true &&
        Array.isArray(hrListRes.data?.tasks) &&
        hrListRes.data.totalCount >= 1 &&
        hrListRes.data.page === 1,
      'Test 5: HR_ADMIN can retrieve all organizational tasks with pagination metadata',
      `Total count: ${hrListRes.data?.totalCount}`
    );

    // Create a second task assigned to otherUser for isolation tests
    const otherTaskRes = await apiRequest('/api/tasks', {
      method: 'POST',
      token: adminToken,
      body: {
        title: 'Design System Typography Audit',
        description: 'Refactor font scaling across design components.',
        assignedEmployeeId: otherEmpId,
        priority: 'MEDIUM',
        startDate: '2026-11-20',
        dueDate: '2026-11-28',
        estimatedHours: 10,
      },
    });
    const otherTask = otherTaskRes.data?.task;
    if (otherTask?.taskId) createdTestTaskIds.push(otherTask.taskId);

    // TEST 6: EMPLOYEE sees only assigned tasks (returns 200)
    console.log('\n--- 6. Scoped Employee Task Retrieval ---');
    const myTasksRes = await apiRequest('/api/tasks/my', { token: qaToken });
    const allAssignedToQa = myTasksRes.data?.tasks?.every((t) => t.assignedEmployeeId === qaEmpId);
    assert(
      myTasksRes.status === 200 &&
        myTasksRes.data?.success === true &&
        Array.isArray(myTasksRes.data?.tasks) &&
        myTasksRes.data.tasks.length >= 1 &&
        allAssignedToQa,
      'Test 6: EMPLOYEE sees only tasks assigned to them via /api/tasks/my',
      `Tasks count: ${myTasksRes.data?.tasks?.length}`
    );

    // TEST 7: EMPLOYEE cannot view another employee's task (returns 403)
    console.log('\n--- 7. Unauthorized Cross-Employee Access ---');
    const viewOtherRes = await apiRequest(`/api/tasks/${otherTask.taskId}`, { token: qaToken });
    assert(
      viewOtherRes.status === 403,
      'Test 7: EMPLOYEE cannot view another employee’s task (returns 403 Forbidden)',
      `Status: ${viewOtherRes.status}`
    );

    // TEST 8: HR_ADMIN can update task details (returns 200)
    console.log('\n--- 8. Administrative Task Modification ---');
    const adminUpdateRes = await apiRequest(`/api/tasks/${createdTask.taskId}`, {
      method: 'PUT',
      token: adminToken,
      body: {
        title: 'Implement QA Automation Workflow (Updated)',
        estimatedHours: 20,
        priority: 'URGENT',
      },
    });
    assert(
      adminUpdateRes.status === 200 &&
        adminUpdateRes.data?.success === true &&
        adminUpdateRes.data.task.title === 'Implement QA Automation Workflow (Updated)' &&
        adminUpdateRes.data.task.estimatedHours === 20 &&
        adminUpdateRes.data.task.priority === 'URGENT',
      'Test 8: HR_ADMIN can modify title, priority, and estimated hours',
      `Title: ${adminUpdateRes.data?.task?.title}`
    );

    // TEST 9: EMPLOYEE can update permitted status and progress fields
    console.log('\n--- 9. Permitted Employee Updates ---');
    const empUpdatePermittedRes = await apiRequest(`/api/tasks/${createdTask.taskId}`, {
      method: 'PUT',
      token: qaToken,
      body: {
        status: 'IN_PROGRESS',
        progress: 40,
        comment: 'Started writing test cases.',
      },
    });
    assert(
      empUpdatePermittedRes.status === 200 &&
        empUpdatePermittedRes.data?.success === true &&
        empUpdatePermittedRes.data.task.status === 'IN_PROGRESS' &&
        empUpdatePermittedRes.data.task.progress === 40,
      'Test 9: EMPLOYEE can update status (TODO -> IN_PROGRESS) and progress (40%)',
      `Status: ${empUpdatePermittedRes.data?.task?.status}, Progress: ${empUpdatePermittedRes.data?.task?.progress}`
    );

    // TEST 10: EMPLOYEE cannot modify assignment or protected fields (returns 403)
    console.log('\n--- 10. Employee Protected Field Restriction ---');
    const empReassignRes = await apiRequest(`/api/tasks/${createdTask.taskId}`, {
      method: 'PUT',
      token: qaToken,
      body: {
        assignedEmployeeId: otherEmpId,
      },
    });
    const empTitleModRes = await apiRequest(`/api/tasks/${createdTask.taskId}`, {
      method: 'PUT',
      token: qaToken,
      body: {
        title: 'Hacked Title by Employee',
      },
    });
    assert(
      empReassignRes.status === 403 && empTitleModRes.status === 403,
      'Test 10: EMPLOYEE cannot modify assignedEmployeeId or title (returns 403 Forbidden)',
      `Reassign status: ${empReassignRes.status}, Title mod status: ${empTitleModRes.status}`
    );

    // TEST 11: Invalid status transitions are rejected (returns 400)
    console.log('\n--- 11. Workflow Transition Enforcement ---');
    // Task is currently IN_PROGRESS. Permitted next transitions: IN_PROGRESS, IN_REVIEW, TODO.
    // Attempting to jump directly from IN_PROGRESS to COMPLETED without IN_REVIEW
    const invalidJumpRes = await apiRequest(`/api/tasks/${createdTask.taskId}`, {
      method: 'PUT',
      token: qaToken,
      body: {
        status: 'COMPLETED',
      },
    });
    assert(
      invalidJumpRes.status === 400,
      'Test 11: Invalid status transition (IN_PROGRESS directly to COMPLETED) is rejected with 400',
      `Status: ${invalidJumpRes.status}, Message: ${invalidJumpRes.data?.message}`
    );

    // TEST 12: Progress outside 0–100 is rejected (returns 400)
    console.log('\n--- 12. Progress Range Bounds ---');
    const negProgressRes = await apiRequest(`/api/tasks/${createdTask.taskId}`, {
      method: 'PUT',
      token: qaToken,
      body: { progress: -15 },
    });
    const overProgressRes = await apiRequest(`/api/tasks/${createdTask.taskId}`, {
      method: 'PUT',
      token: qaToken,
      body: { progress: 120 },
    });
    assert(
      negProgressRes.status === 400 && overProgressRes.status === 400,
      'Test 12: Progress outside 0–100 range (-15, 120) is rejected with 400 Bad Request',
      `neg: ${negProgressRes.status}, over: ${overProgressRes.status}`
    );

    // TEST 13: COMPLETED task requires 100% progress
    console.log('\n--- 13. Completion Progress Requirement ---');
    // First advance to IN_REVIEW
    await apiRequest(`/api/tasks/${createdTask.taskId}`, {
      method: 'PUT',
      token: qaToken,
      body: { status: 'IN_REVIEW', progress: 85 },
    });

    // Attempt to mark COMPLETED with progress < 100 explicitly
    const incompleteProgressRes = await apiRequest(`/api/tasks/${createdTask.taskId}`, {
      method: 'PUT',
      token: adminToken,
      body: { status: 'COMPLETED', progress: 75 },
    });

    // Mark COMPLETED with progress 100
    const completeValidRes = await apiRequest(`/api/tasks/${createdTask.taskId}`, {
      method: 'PUT',
      token: adminToken,
      body: { status: 'COMPLETED', progress: 100 },
    });

    assert(
      incompleteProgressRes.status === 400 &&
        completeValidRes.status === 200 &&
        completeValidRes.data.task.status === 'COMPLETED' &&
        completeValidRes.data.task.progress === 100,
      'Test 13: Marking task COMPLETED rejects < 100% progress and enforces 100%',
      `Incomplete status: ${incompleteProgressRes.status}, Valid completion status: ${completeValidRes.status}`
    );

    // TEST 14: Task comments are saved correctly (returns 200)
    console.log('\n--- 14. Collaborative Task Commenting ---');
    const commentRes = await apiRequest(`/api/tasks/${createdTask.taskId}/comments`, {
      method: 'POST',
      token: qaToken,
      body: { text: 'All regression scenarios verified successfully!' },
    });
    const hasComment = commentRes.data?.task?.comments?.some(
      (c) => c.text === 'All regression scenarios verified successfully!'
    );
    assert(
      commentRes.status === 200 &&
        commentRes.data?.success === true &&
        hasComment,
      'Test 14: Task comments are saved correctly with author name and timestamp',
      `Comment added: ${hasComment}`
    );

    // TEST 15: Task deletion follows policy (HR_ADMIN only)
    console.log('\n--- 15. Task Deletion Policy ---');
    // Employee tries to delete
    const empDeleteRes = await apiRequest(`/api/tasks/${otherTask.taskId}`, {
      method: 'DELETE',
      token: qaToken,
    });
    // HR Admin deletes
    const adminDeleteRes = await apiRequest(`/api/tasks/${otherTask.taskId}`, {
      method: 'DELETE',
      token: adminToken,
    });
    assert(
      empDeleteRes.status === 403 &&
        adminDeleteRes.status === 200 &&
        adminDeleteRes.data?.success === true,
      'Test 15: Only HR_ADMIN can delete tasks; EMPLOYEE deletion returns 403 Forbidden',
      `Emp delete: ${empDeleteRes.status}, Admin delete: ${adminDeleteRes.status}`
    );

    // TEST 16: Search, filters, and pagination work
    console.log('\n--- 16. Querying, Filtering, and Pagination ---');
    const filterRes = await apiRequest(
      `/api/tasks?status=COMPLETED&priority=URGENT&search=Workflow&page=1&limit=5`,
      { token: adminToken }
    );
    assert(
      filterRes.status === 200 &&
        filterRes.data?.success === true &&
        Array.isArray(filterRes.data?.tasks) &&
        filterRes.data.tasks.some((t) => t.taskId === createdTask.taskId),
      'Test 16: Search keyword, status, priority filters, and pagination return matched records',
      `Returned count: ${filterRes.data?.tasks?.length}`
    );

    // TEST 17: Overdue calculations are accurate
    console.log('\n--- 17. Overdue Calculation Logic ---');
    const overdueTaskRes = await apiRequest('/api/tasks', {
      method: 'POST',
      token: adminToken,
      body: {
        title: 'Past Due Deliverable',
        description: 'Deliberately overdue task to verify Chicago overdue calculation.',
        assignedEmployeeId: qaEmpId,
        priority: 'HIGH',
        startDate: '2026-10-01',
        dueDate: '2026-10-15',
        estimatedHours: 8,
      },
    });
    const overdueTask = overdueTaskRes.data?.task;
    if (overdueTask?.taskId) createdTestTaskIds.push(overdueTask.taskId);

    const getOverdueRes = await apiRequest(`/api/tasks/${overdueTask.taskId}`, {
      token: adminToken,
    });
    assert(
      getOverdueRes.status === 200 && getOverdueRes.data?.task?.isOverdue === true,
      'Test 17: Overdue tasks (dueDate < today & status != COMPLETED) return isOverdue === true',
      `isOverdue: ${getOverdueRes.data?.task?.isOverdue}`
    );

    // TEST 18: Task statistics match database records
    console.log('\n--- 18. Organizational Task Statistics ---');
    const statsRes = await apiRequest('/api/tasks/stats', { token: adminToken });
    const stats = statsRes.data?.stats;
    assert(
      statsRes.status === 200 &&
        statsRes.data?.success === true &&
        stats &&
        typeof stats.total === 'number' &&
        typeof stats.completed === 'number' &&
        typeof stats.overdueCount === 'number' &&
        typeof stats.completionRate === 'number' &&
        stats.total >= 1,
      'Test 18: /api/tasks/stats returns accurate organizational aggregates and breakdown',
      `Stats: total=${stats?.total}, completed=${stats?.completed}, overdue=${stats?.overdueCount}`
    );

    // TEST 19: Employee performance metrics are calculated correctly
    console.log('\n--- 19. Employee Workload and Performance Indicators ---');
    const employeeWorkload = statsRes.data?.employeeWorkload;
    const qaMetrics = employeeWorkload?.find((e) => e.employeeId === qaEmpId);
    assert(
      Array.isArray(employeeWorkload) &&
        qaMetrics &&
        typeof qaMetrics.totalAssigned === 'number' &&
        typeof qaMetrics.completed === 'number' &&
        typeof qaMetrics.overdue === 'number' &&
        typeof qaMetrics.completionRate === 'number' &&
        qaMetrics.totalAssigned >= 1,
      'Test 19: Performance metrics per active employee computed with completion rates and overdue counts',
      `QA Metrics: assigned=${qaMetrics?.totalAssigned}, completed=${qaMetrics?.completed}, overdue=${qaMetrics?.overdue}`
    );

    // TEST 20: Clean up test records and verify existing task data remains intact
    console.log('\n--- 20. Isolation & Cleanup Verification ---');
    // Delete created test tasks
    await Task.deleteMany({ taskId: { $in: createdTestTaskIds } });
    await Task.deleteMany({ assignedEmployeeId: { $in: [qaEmpId, otherEmpId] } });
    // Delete test users
    await User.deleteMany({ employeeId: { $in: [qaEmpId, otherEmpId] } });

    const finalTaskCount = await Task.countDocuments();
    const finalSeededUsers = await User.countDocuments({
      employeeId: { $in: ['EMP-001', 'EMP-002', 'EMP-003', 'EMP-004', 'EMP-005', 'EMP-006'] },
    });
    const finalAdminUser = await User.findOne({ role: 'HR_ADMIN' });

    assert(
      finalTaskCount === initialTaskCount &&
        finalSeededUsers === 6 &&
        finalAdminUser !== null,
      'Test 20: Test cleanup succeeded; all original seeded tasks and 6 employees + HR Admin remain intact',
      `Initial: ${initialTaskCount}, Final: ${finalTaskCount}, Seeded employees: ${finalSeededUsers}`
    );

  } catch (err) {
    console.error('Fatal error during Task Phase 5 test run:', err);
    assert(false, 'Phase 5 Execution Safety', err.message);
  } finally {
    server.close();
    await disconnectDB();

    console.log('\n====================================================');
    console.log(`Phase 5 QA Summary: Passed ${passed} / ${passed + failed}`);
    console.log('====================================================\n');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
}

runTasksPhase5Tests();
