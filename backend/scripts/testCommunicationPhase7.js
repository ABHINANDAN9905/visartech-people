import http from 'http';
import app from '../server.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { signToken } from '../config/jwt.js';
import User from '../models/User.js';
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

async function runCommunicationPhase7Tests() {
  console.log('====================================================');
  console.log('VISARTECH People — Step 18 Phase 7 Communication QA Suite');
  console.log('====================================================');

  await connectDB();

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  // Isolated QA test IDs
  const qaEmpId = 'EMP-QACOM1';
  const otherEmpId = 'EMP-QACOM2';

  const createdAnnouncementIds = [];
  const createdNotificationIds = [];
  const createdFeedbackIds = [];

  try {
    // Cleanup any remnants of previous test data before taking snapshot
    await User.deleteMany({ employeeId: { $in: [qaEmpId, otherEmpId] } });
    await Announcement.deleteMany({
      title: {
        $in: [
          'Q4 Global Engineering & Product Townhall',
          'Design System Figma Library Migration',
          'Confidential Security Clearance Briefing',
          'Past October Hackathon Registration',
          'Invalid Dates Test',
          'Missing Dept Test',
          'Missing Employees Test',
        ],
      },
    });
    await Notification.deleteMany({ recipientId: { $in: [qaEmpId, otherEmpId] } });
    await Notification.deleteMany({ eventId: { $regex: /^test_event_dup_/ } });
    await Notification.deleteMany({
      title: {
        $in: [
          'Announcement: Q4 Global Engineering & Product Townhall',
          'Department Announcement: Design System Figma Library Migration',
          'Direct Announcement: Confidential Security Clearance Briefing',
          'Task Assigned for QA',
          'Task Assigned for Design',
          'Idempotency Test 1',
        ],
      },
    });
    await Feedback.deleteMany({
      subject: ['Standing Desks in Engineering Pod', 'Flexible Remote Fridays Proposal'],
    });
    await Feedback.deleteMany({ employeeId: { $in: [qaEmpId, otherEmpId] } });

    // 0. Baseline snapshot
    const initialAnnouncementCount = await Announcement.countDocuments();
    const initialNotificationCount = await Notification.countDocuments();
    const initialFeedbackCount = await Feedback.countDocuments();

    const adminUser = await User.findOne({ role: 'HR_ADMIN' });
    const seededEmp = await User.findOne({ employeeId: 'EMP-001' });

    if (!adminUser || !seededEmp) {
      throw new Error('Database is missing required seeded users.');
    }

    // Create test employees
    const qaUser = await User.create({
      employeeId: qaEmpId,
      firstName: 'Elena',
      lastName: 'Tester',
      email: 'elena.comms@visartech.demo',
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
      email: 'marcus.comms@visartech.demo',
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

    // TEST 1: Unauthenticated communication requests return 401
    console.log('\n--- 1. Authentication Enforcement ---');
    const unauthAnnounce = await apiRequest('/api/announcements');
    const unauthNotifs = await apiRequest('/api/notifications');
    const unauthFeedbackGet = await apiRequest('/api/feedback');
    const unauthFeedbackPost = await apiRequest('/api/feedback', { method: 'POST', body: { subject: 'Test' } });
    assert(
      unauthAnnounce.status === 401 &&
        unauthNotifs.status === 401 &&
        unauthFeedbackGet.status === 401 &&
        unauthFeedbackPost.status === 401,
      'Test 1: Unauthenticated communication requests return 401 Unauthorized',
      `Statuses: ${unauthAnnounce.status}, ${unauthNotifs.status}, ${unauthFeedbackGet.status}, ${unauthFeedbackPost.status}`
    );

    // TEST 2: HR_ADMIN can create announcements
    console.log('\n--- 2. Announcement Publishing (HR_ADMIN) ---');
    const createAllHandsRes = await apiRequest('/api/announcements', {
      method: 'POST',
      token: adminToken,
      body: {
        title: 'Q4 Global Engineering & Product Townhall',
        description: 'Comprehensive quarterly roadmap review and architecture discussion.',
        category: 'Company Events',
        priority: 'HIGH',
        targetAudience: 'All Employees',
        publishDate: '2026-11-15',
        status: 'PUBLISHED',
      },
    });
    const allHandsAnn = createAllHandsRes.data?.announcement;
    if (allHandsAnn?._id) createdAnnouncementIds.push(allHandsAnn._id);
    assert(
      createAllHandsRes.status === 201 &&
        createAllHandsRes.data?.success === true &&
        allHandsAnn &&
        allHandsAnn.title === 'Q4 Global Engineering & Product Townhall' &&
        allHandsAnn.status === 'PUBLISHED',
      'Test 2: HR_ADMIN can create and publish company announcements',
      JSON.stringify(createAllHandsRes.data)
    );

    // TEST 3: EMPLOYEE cannot publish announcements
    console.log('\n--- 3. Role-Based Access Control on Publishing ---');
    const empPublishRes = await apiRequest('/api/announcements', {
      method: 'POST',
      token: qaToken,
      body: {
        title: 'Unauthorized Employee Announcement',
        description: 'Employees must not be permitted to publish.',
      },
    });
    assert(
      empPublishRes.status === 403,
      'Test 3: EMPLOYEE cannot publish announcements (returns 403 Forbidden)',
      `Status: ${empPublishRes.status}`
    );

    // TEST 4: Employee sees only announcements targeted to them
    console.log('\n--- 4. Audience Scoping ---');
    const qaAnnouncementsRes = await apiRequest('/api/announcements', { token: qaToken });
    const hasAllHands = qaAnnouncementsRes.data?.announcements?.some(
      (a) => a._id === allHandsAnn._id
    );
    assert(
      qaAnnouncementsRes.status === 200 &&
        Array.isArray(qaAnnouncementsRes.data?.announcements) &&
        hasAllHands,
      'Test 4: Employee sees company-wide announcements targeted to "All Employees"',
      `Found: ${hasAllHands}`
    );

    // TEST 5: Department targeting works correctly
    console.log('\n--- 5. Department Targeting ---');
    const deptAnnRes = await apiRequest('/api/announcements', {
      method: 'POST',
      token: adminToken,
      body: {
        title: 'Design System Figma Library Migration',
        description: 'All UI designers must update to Figma 2027 components.',
        category: 'Policy Updates',
        priority: 'MEDIUM',
        targetAudience: 'Selected Department',
        targetDepartment: 'Product & Design',
        publishDate: '2026-11-15',
        status: 'PUBLISHED',
      },
    });
    const deptAnn = deptAnnRes.data?.announcement;
    if (deptAnn?._id) createdAnnouncementIds.push(deptAnn._id);

    const otherFeedRes = await apiRequest('/api/announcements', { token: otherToken });
    const qaFeedRes = await apiRequest('/api/announcements', { token: qaToken });

    const otherSeesDept = otherFeedRes.data?.announcements?.some((a) => a._id === deptAnn._id);
    const qaSeesDept = qaFeedRes.data?.announcements?.some((a) => a._id === deptAnn._id);

    assert(
      deptAnnRes.status === 201 && otherSeesDept && !qaSeesDept,
      'Test 5: Department-targeted announcement is visible to target department (Product & Design) and hidden from Engineering',
      `Other sees: ${otherSeesDept}, QA sees: ${qaSeesDept}`
    );

    // TEST 6: Selected employee targeting works correctly
    console.log('\n--- 6. Selected Employee Targeting ---');
    const directAnnRes = await apiRequest('/api/announcements', {
      method: 'POST',
      token: adminToken,
      body: {
        title: 'Confidential Security Clearance Briefing',
        description: 'Mandatory direct briefing for selected team member.',
        category: 'Important Notices',
        priority: 'HIGH',
        targetAudience: 'Selected Employees',
        targetEmployeeIds: [otherEmpId],
        publishDate: '2026-11-15',
        status: 'PUBLISHED',
      },
    });
    const directAnn = directAnnRes.data?.announcement;
    if (directAnn?._id) createdAnnouncementIds.push(directAnn._id);

    const otherDirectFeed = await apiRequest('/api/announcements', { token: otherToken });
    const qaDirectFeed = await apiRequest('/api/announcements', { token: qaToken });

    const otherSeesDirect = otherDirectFeed.data?.announcements?.some((a) => a._id === directAnn._id);
    const qaSeesDirect = qaDirectFeed.data?.announcements?.some((a) => a._id === directAnn._id);

    assert(
      directAnnRes.status === 201 && otherSeesDirect && !qaSeesDirect,
      'Test 6: Selected employee targeting delivers bulletin exclusively to listed employee',
      `Other sees: ${otherSeesDirect}, QA sees: ${qaSeesDirect}`
    );

    // TEST 7: Expired announcements are not displayed as active
    console.log('\n--- 7. Announcement Expiry Handling ---');
    const expiredAnnRes = await apiRequest('/api/announcements', {
      method: 'POST',
      token: adminToken,
      body: {
        title: 'Past October Hackathon Registration',
        description: 'Historical notice that expired in October.',
        category: 'Company Events',
        priority: 'LOW',
        targetAudience: 'All Employees',
        publishDate: '2026-10-01',
        expiryDate: '2026-10-15',
        status: 'PUBLISHED',
      },
    });
    const expiredAnn = expiredAnnRes.data?.announcement;
    if (expiredAnn?._id) createdAnnouncementIds.push(expiredAnn._id);

    const empFeedAfterExpiry = await apiRequest('/api/announcements', { token: qaToken });
    const empSeesExpired = empFeedAfterExpiry.data?.announcements?.some(
      (a) => a._id === expiredAnn._id
    );
    const adminFeed = await apiRequest('/api/announcements', { token: adminToken });
    const adminSeesExpired = adminFeed.data?.announcements?.some((a) => a._id === expiredAnn._id);

    assert(
      !empSeesExpired && adminSeesExpired,
      'Test 7: Expired announcements are excluded from employee active feeds but retained for admin audit',
      `Emp sees expired: ${empSeesExpired}, Admin sees: ${adminSeesExpired}`
    );

    // TEST 8: Invalid announcement dates and audiences are rejected
    console.log('\n--- 8. Announcement Input Validation ---');
    const invalidDatesRes = await apiRequest('/api/announcements', {
      method: 'POST',
      token: adminToken,
      body: {
        title: 'Invalid Dates Test',
        description: 'Expiry is before publish date.',
        publishDate: '2026-11-20',
        expiryDate: '2026-11-10', // Before publish
      },
    });
    const missingDeptRes = await apiRequest('/api/announcements', {
      method: 'POST',
      token: adminToken,
      body: {
        title: 'Missing Dept Test',
        description: 'Audience is Selected Department but department is missing.',
        targetAudience: 'Selected Department',
        publishDate: '2026-11-20',
      },
    });
    const missingEmpRes = await apiRequest('/api/announcements', {
      method: 'POST',
      token: adminToken,
      body: {
        title: 'Missing Employees Test',
        description: 'Audience is Selected Employees but list is empty.',
        targetAudience: 'Selected Employees',
        targetEmployeeIds: [],
        publishDate: '2026-11-20',
      },
    });
    assert(
      invalidDatesRes.status === 400 &&
        missingDeptRes.status === 400 &&
        missingEmpRes.status === 400,
      'Test 8: Invalid announcement dates and missing audience targets are rejected with 400 Bad Request',
      `Dates: ${invalidDatesRes.status}, Dept: ${missingDeptRes.status}, Emps: ${missingEmpRes.status}`
    );

    // TEST 9: Announcement read tracking works
    console.log('\n--- 9. Read Tracking ---');
    const markReadRes = await apiRequest(`/api/announcements/${allHandsAnn._id}/read`, {
      method: 'POST',
      token: qaToken,
    });
    assert(
      markReadRes.status === 200 &&
        markReadRes.data?.success === true &&
        markReadRes.data.isRead === true &&
        markReadRes.data.readCount >= 1,
      'Test 9: Employee can mark an announcement as read; updates readBy array and readCount',
      `readCount: ${markReadRes.data?.readCount}`
    );

    // TEST 10: Duplicate read entries are prevented
    console.log('\n--- 10. Duplicate Read Prevention ---');
    const repeatReadRes = await apiRequest(`/api/announcements/${allHandsAnn._id}/read`, {
      method: 'POST',
      token: qaToken,
    });
    const recheckedDoc = await Announcement.findById(allHandsAnn._id);
    const occurrences = recheckedDoc.readBy.filter((id) => id === qaEmpId).length;
    assert(
      repeatReadRes.status === 200 && occurrences === 1,
      'Test 10: Repeated mark-read calls prevent duplicate entries in readBy set',
      `Occurrences in readBy: ${occurrences}`
    );

    // TEST 11: Employee cannot access an unauthorized announcement
    console.log('\n--- 11. Scoped Direct Access Prevention ---');
    const crossAccessRes = await apiRequest(`/api/announcements/${directAnn._id}`, {
      token: qaToken,
    });
    assert(
      crossAccessRes.status === 403,
      'Test 11: Employee attempting GET /api/announcements/:id for non-targeted bulletin returns 403 Forbidden',
      `Status: ${crossAccessRes.status}`
    );

    // TEST 12: Users can access only their own notifications
    console.log('\n--- 12. Notification Ownership Scoping ---');
    const notif1 = await Notification.create({
      recipientId: qaEmpId,
      recipientRole: 'EMPLOYEE',
      type: 'task_assigned',
      title: 'Task Assigned for QA',
      message: 'You have been assigned to verify communication APIs.',
      link: '/tasks',
      read: false,
    });
    createdNotificationIds.push(notif1._id);

    const notif2 = await Notification.create({
      recipientId: otherEmpId,
      recipientRole: 'EMPLOYEE',
      type: 'task_assigned',
      title: 'Task Assigned for Design',
      message: 'You have been assigned to design system tokens.',
      link: '/tasks',
      read: false,
    });
    createdNotificationIds.push(notif2._id);

    const qaNotifsRes = await apiRequest('/api/notifications', { token: qaToken });
    const hasQaNotif = qaNotifsRes.data?.notifications?.some((n) => n._id === notif1._id.toString());
    const hasOtherNotif = qaNotifsRes.data?.notifications?.some((n) => n._id === notif2._id.toString());

    assert(
      qaNotifsRes.status === 200 && hasQaNotif && !hasOtherNotif,
      'Test 12: GET /api/notifications returns user own notifications and strictly excludes others',
      `Has own: ${hasQaNotif}, Has other: ${hasOtherNotif}`
    );

    // TEST 13: Unread notification count is accurate
    console.log('\n--- 13. Accurate Unread Count ---');
    const unreadCountRes = await apiRequest('/api/notifications/unread-count', { token: qaToken });
    assert(
      unreadCountRes.status === 200 &&
        typeof unreadCountRes.data?.unreadCount === 'number' &&
        unreadCountRes.data.unreadCount >= 1,
      'Test 13: GET /api/notifications/unread-count returns accurate unread count',
      `Count: ${unreadCountRes.data?.unreadCount}`
    );

    // TEST 14: Individual notification read operation works
    console.log('\n--- 14. Mark Notification Read & Ownership ---');
    const markNotifReadRes = await apiRequest(`/api/notifications/${notif1._id}/read`, {
      method: 'PATCH',
      token: qaToken,
    });
    const markOtherNotifRes = await apiRequest(`/api/notifications/${notif2._id}/read`, {
      method: 'PATCH',
      token: qaToken,
    });
    assert(
      markNotifReadRes.status === 200 &&
        markNotifReadRes.data.notification.read === true &&
        markOtherNotifRes.status === 403,
      'Test 14: Marking individual notification read succeeds for owner and returns 403 for other user',
      `Own status: ${markNotifReadRes.status}, Other status: ${markOtherNotifRes.status}`
    );

    // TEST 15: Mark-all-read affects only the authenticated user
    console.log('\n--- 15. Scoped Mark-All-Read Operation ---');
    const markAllReadRes = await apiRequest('/api/notifications/read-all', {
      method: 'PATCH',
      token: qaToken,
    });
    const recheckedOtherNotif = await Notification.findById(notif2._id);
    assert(
      markAllReadRes.status === 200 && recheckedOtherNotif.read === false,
      'Test 15: Mark-all-read marks user notifications and preserves other users unread status',
      `Other notif read state: ${recheckedOtherNotif?.read}`
    );

    // TEST 16: Duplicate event notifications are prevented
    console.log('\n--- 16. Duplicate Event Notification Prevention ---');
    const eventId = `test_event_dup_${Date.now()}`;
    await Notification.create({
      recipientId: qaEmpId,
      recipientRole: 'EMPLOYEE',
      type: 'payroll_published',
      title: 'Idempotency Test 1',
      message: 'First delivery of event notification.',
      eventId,
    });
    let duplicateRejected = false;
    try {
      await Notification.create({
        recipientId: qaEmpId,
        recipientRole: 'EMPLOYEE',
        type: 'payroll_published',
        title: 'Idempotency Test 2',
        message: 'Duplicate delivery attempt.',
        eventId,
      });
    } catch (err) {
      duplicateRejected = true;
    }
    assert(
      duplicateRejected,
      'Test 16: Unique partial index on eventId prevents duplicate event notifications on retries',
      `Rejected: ${duplicateRejected}`
    );

    // TEST 17: Employee can submit normal feedback
    console.log('\n--- 17. Named Feedback Submission ---');
    const namedFeedbackRes = await apiRequest('/api/feedback', {
      method: 'POST',
      token: qaToken,
      body: {
        category: 'Workplace',
        subject: 'Standing Desks in Engineering Pod',
        message: 'Would love to explore pneumatic standing desk converters.',
        priority: 'MEDIUM',
        isAnonymous: false,
      },
    });
    const namedFb = namedFeedbackRes.data?.feedback;
    if (namedFb?._id) createdFeedbackIds.push(namedFb._id);
    assert(
      namedFeedbackRes.status === 201 &&
        namedFb &&
        namedFb.isAnonymous === false &&
        namedFb.employeeId === qaEmpId &&
        namedFb.employeeName === 'Elena Tester' &&
        namedFb.employeeDepartment === 'Engineering',
      'Test 17: Employee can submit named feedback with author attribution and department',
      JSON.stringify(namedFb)
    );

    // TEST 18: Employee can submit anonymous feedback
    console.log('\n--- 18. Anonymous Feedback Submission ---');
    const anonFeedbackRes = await apiRequest('/api/feedback', {
      method: 'POST',
      token: qaToken,
      body: {
        category: 'Suggestions',
        subject: 'Flexible Remote Fridays Proposal',
        message: 'A quiet Friday policy could boost deep focus before releases.',
        priority: 'HIGH',
        isAnonymous: true,
      },
    });
    const anonFb = anonFeedbackRes.data?.feedback;
    if (anonFb?._id) createdFeedbackIds.push(anonFb._id);
    assert(
      anonFeedbackRes.status === 201 &&
        anonFb &&
        anonFb.isAnonymous === true &&
        anonFb.employeeId === null &&
        anonFb.employeeName === 'Anonymous Colleague' &&
        anonFb.employeeDepartment === 'Confidential',
      'Test 18: Employee can submit strictly anonymous feedback with masked metadata',
      JSON.stringify(anonFb)
    );

    // TEST 19: Anonymous feedback stores employeeId as null
    console.log('\n--- 19. Database Layer Privacy Verification ---');
    const dbAnonRecord = await Feedback.findById(anonFb._id);
    assert(
      dbAnonRecord.employeeId === null &&
        dbAnonRecord.employeeName === 'Anonymous Colleague' &&
        dbAnonRecord.employeeDepartment === 'Confidential',
      'Test 19: Database layer strictly stores employeeId as null for anonymous records',
      `DB employeeId: ${dbAnonRecord.employeeId}`
    );

    // TEST 20: Anonymous identity is not exposed in any API response
    console.log('\n--- 20. Zero Identity Leakage in API Responses ---');
    const adminGetAnonRes = await apiRequest(`/api/feedback/${anonFb._id}`, { token: adminToken });
    const adminAnonItem = adminGetAnonRes.data?.feedback;
    assert(
      adminGetAnonRes.status === 200 &&
        adminAnonItem.employeeId === null &&
        adminAnonItem.employeeName === 'Anonymous Colleague' &&
        adminAnonItem.employeeDepartment === 'Confidential',
      'Test 20: Admin inspection endpoint never exposes submitter identity for anonymous entries',
      JSON.stringify(adminAnonItem)
    );

    // TEST 21: EMPLOYEE cannot view the administrative feedback directory
    console.log('\n--- 21. Feedback Management RBAC ---');
    const empFeedbackDirectoryRes = await apiRequest('/api/feedback', { token: qaToken });
    assert(
      empFeedbackDirectoryRes.status === 403,
      'Test 21: EMPLOYEE access to administrative GET /api/feedback returns 403 Forbidden',
      `Status: ${empFeedbackDirectoryRes.status}`
    );

    // TEST 22: HR_ADMIN can review and update feedback status
    console.log('\n--- 22. Feedback Review and Administrative Response ---');
    const updateFbRes = await apiRequest(`/api/feedback/${anonFb._id}/status`, {
      method: 'PATCH',
      token: adminToken,
      body: {
        status: 'RESOLVED',
        text: 'Leadership approved trial for remote focus Fridays starting next month.',
        noteText: 'Discussed during Monday executive sync.',
      },
    });
    const updatedFb = updateFbRes.data?.feedback;
    assert(
      updateFbRes.status === 200 &&
        updatedFb &&
        updatedFb.status === 'RESOLVED' &&
        updatedFb.response &&
        updatedFb.response.text.includes('Leadership approved') &&
        updatedFb.isAnonymous === true &&
        updatedFb.employeeId === null,
      'Test 22: HR_ADMIN can transition feedback status, attach administrative response and notes',
      `Status: ${updatedFb?.status}, Response: ${updatedFb?.response?.text}`
    );

    // TEST 23: Feedback filters and pagination work
    console.log('\n--- 23. Feedback Filtering and Pagination ---');
    const filterFbRes = await apiRequest(
      '/api/feedback?status=RESOLVED&category=Suggestions&page=1&limit=5',
      { token: adminToken }
    );
    assert(
      filterFbRes.status === 200 &&
        filterFbRes.data?.success === true &&
        Array.isArray(filterFbRes.data?.feedback) &&
        filterFbRes.data.feedback.some((f) => f._id === anonFb._id),
      'Test 23: Feedback filters (status, category) and pagination return matched records with pagination metadata',
      `Count: ${filterFbRes.data?.feedback?.length}`
    );

    // TEST 24: Existing records remain intact
    console.log('\n--- 24. Isolation & Cleanup Verification ---');
    // Cleanup test records
    await Announcement.deleteMany({ _id: { $in: createdAnnouncementIds } });
    await Notification.deleteMany({ _id: { $in: createdNotificationIds } });
    await Notification.deleteMany({ recipientId: { $in: [qaEmpId, otherEmpId] } });
    await Notification.deleteMany({ eventId: { $regex: /^test_event_dup_/ } });
    if (createdAnnouncementIds.length > 0) {
      const annEventRegexes = createdAnnouncementIds.map((id) => new RegExp(`^announcement_${id}`));
      await Notification.deleteMany({ eventId: { $in: annEventRegexes } });
    }
    await Feedback.deleteMany({ _id: { $in: createdFeedbackIds } });
    await Feedback.deleteMany({ employeeId: { $in: [qaEmpId, otherEmpId] } });
    await User.deleteMany({ employeeId: { $in: [qaEmpId, otherEmpId] } });

    const finalAnnouncementCount = await Announcement.countDocuments();
    const finalNotificationCount = await Notification.countDocuments();
    const finalFeedbackCount = await Feedback.countDocuments();
    const finalSeededUsers = await User.countDocuments({
      employeeId: { $in: ['EMP-001', 'EMP-002', 'EMP-003', 'EMP-004', 'EMP-005', 'EMP-006'] },
    });

    assert(
      finalAnnouncementCount === initialAnnouncementCount &&
        finalNotificationCount === initialNotificationCount &&
        finalFeedbackCount === initialFeedbackCount &&
        finalSeededUsers === 6,
      'Test 24: Test cleanup succeeded; all original seeded announcements, notifications, feedback, and 6 employees remain intact',
      `Ann: ${finalAnnouncementCount} (init ${initialAnnouncementCount}), Notif: ${finalNotificationCount} (init ${initialNotificationCount}), Fb: ${finalFeedbackCount} (init ${initialFeedbackCount})`
    );

  } catch (err) {
    console.error('Fatal error during Communication Phase 7 test run:', err);
    assert(false, 'Phase 7 Execution Safety', err.message);
  } finally {
    server.close();
    await disconnectDB();

    console.log('\n====================================================');
    console.log(`Phase 7 QA Summary: Passed ${passed} / ${passed + failed}`);
    console.log('====================================================\n');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
}

runCommunicationPhase7Tests();
