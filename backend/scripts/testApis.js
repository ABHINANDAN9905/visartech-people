import http from 'http';
import { PassThrough } from 'stream';
import app from '../server.js';
import { connectDB, disconnectDB } from '../config/db.js';

let passed = 0;
let failed = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passed++;
  } else {
    console.error(`[FAIL] ${testName} ${details ? '- ' + details : ''}`);
    failed++;
  }
}

function request(options) {
  return new Promise((resolve) => {
    const { url, method = 'GET', headers = {}, body = null } = options;
    const socket = new PassThrough();
    const req = new http.IncomingMessage(socket);
    req.url = url;
    req.method = method;
    req.headers = { host: 'localhost:5000', ...headers };

    if (body) {
      const jsonStr = typeof body === 'string' ? body : JSON.stringify(body);
      req.headers['content-type'] = 'application/json';
      req.headers['content-length'] = Buffer.byteLength(jsonStr);
    }

    const resSocket = new PassThrough();
    const res = new http.ServerResponse(req);
    res.assignSocket(resSocket);

    let resBody = '';
    resSocket.on('data', (chunk) => {
      resBody += chunk.toString();
    });

    res.on('finish', () => {
      const parts = resBody.split('\r\n\r\n');
      const bodyPart = parts.slice(1).join('\r\n\r\n');
      let parsed = bodyPart;
      try {
        parsed = JSON.parse(bodyPart);
      } catch (e) {
        // keep string
      }
      resolve({
        status: res.statusCode,
        headers: res.getHeaders(),
        body: parsed,
      });
    });

    if (body) {
      app.handle(req, res);
      req.emit('data', typeof body === 'string' ? body : JSON.stringify(body));
      req.emit('end');
    } else {
      app.handle(req, res);
    }
  });
}

async function runApiTestSuite() {
  console.log('====================================================');
  console.log('VISARTECH People — Comprehensive Backend API Test Suite');
  console.log('====================================================');

  await connectDB();

  try {
    // 1. Health Endpoints
    console.log('\n--- 1. Health Endpoints ---');
    const health = await request({ url: '/api/health' });
    assert(health.status === 200, 'GET /api/health returns 200 OK');
    assert(health.body.status === 'healthy', 'GET /api/health indicates healthy status');

    const dbHealth = await request({ url: '/api/health/db' });
    assert(dbHealth.status === 200, 'GET /api/health/db returns 200 OK');
    assert(dbHealth.body.database.connection === 'connected', 'GET /api/health/db confirms Atlas is connected');
    assert(dbHealth.body.database.readyState === 1, 'GET /api/health/db readyState is 1');

    // 2. Authentication & Bcrypt Comparison
    console.log('\n--- 2. Authentication & JWT ---');
    const badLogin = await request({
      url: '/api/auth/login',
      method: 'POST',
      body: { email: 'hr@visartech.demo', password: 'WrongPassword' },
    });
    assert(badLogin.status === 401, 'POST /api/auth/login rejects incorrect password (401)');

    const adminLogin = await request({
      url: '/api/auth/login',
      method: 'POST',
      body: { email: 'hr@visartech.demo', password: 'Admin@123' },
    });
    assert(adminLogin.status === 200, 'POST /api/auth/login succeeds for HR Admin');
    assert(Boolean(adminLogin.body.token), 'Admin login returns signed JWT token');
    assert(adminLogin.body.user.role === 'HR_ADMIN', 'Admin user role is HR_ADMIN');
    assert(adminLogin.body.user.passwordHash === undefined, 'Admin login response excludes passwordHash');

    const adminToken = adminLogin.body.token;

    const empLogin = await request({
      url: '/api/auth/login',
      method: 'POST',
      body: { email: 'employee1@visartech.demo', password: 'Employee@123' },
    });
    assert(empLogin.status === 200, 'POST /api/auth/login succeeds for Employee');
    assert(empLogin.body.user.role === 'EMPLOYEE', 'Employee user role is EMPLOYEE');
    assert(empLogin.body.user.passwordHash === undefined, 'Employee login response excludes passwordHash');

    const empToken = empLogin.body.token;

    const meCheck = await request({
      url: '/api/auth/me',
      headers: { authorization: `Bearer ${empToken}` },
    });
    assert(meCheck.status === 200, 'GET /api/auth/me returns authenticated employee profile');
    assert(meCheck.body.user.employeeId === 'EMP-006', 'Profile employeeId is EMP-006');

    // 3. Server-Side RBAC Enforcement
    console.log('\n--- 3. Server-Side RBAC Authorization ---');
    const unauthReq = await request({ url: '/api/employees' });
    assert(unauthReq.status === 401, 'GET /api/employees without token rejected (401 Unauthorized)');

    const empForbiddenPost = await request({
      url: '/api/announcements',
      method: 'POST',
      headers: { authorization: `Bearer ${empToken}` },
      body: { title: 'Unauthorized Post', description: 'Should fail' },
    });
    assert(empForbiddenPost.status === 403, 'POST /api/announcements by EMPLOYEE rejected (403 Forbidden)');

    const empForbiddenStats = await request({
      url: '/api/payroll/stats',
      headers: { authorization: `Bearer ${empToken}` },
    });
    assert(empForbiddenStats.status === 403, 'GET /api/payroll/stats by EMPLOYEE rejected (403 Forbidden)');

    const adminAllowedStats = await request({
      url: '/api/payroll/stats',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    assert(adminAllowedStats.status === 200, 'GET /api/payroll/stats by HR_ADMIN allowed (200 OK)');
    assert(adminAllowedStats.body.metrics.totalEmployees >= 6, 'Payroll stats metrics calculated from MongoDB records');

    // 4. Employee Directory API
    console.log('\n--- 4. Employee Directory (MongoDB Atlas) ---');
    const empList = await request({
      url: '/api/employees',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    assert(empList.status === 200, 'GET /api/employees returns 200 OK');
    assert(empList.body.count === 7, `GET /api/employees retrieved exactly 7 records from Atlas (count: ${empList.body.count})`);

    const singleEmp = await request({
      url: '/api/employees/EMP-001',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    assert(singleEmp.status === 200, 'GET /api/employees/EMP-001 returns 200 OK');
    assert(singleEmp.body.employee.firstName === 'Marcus', 'EMP-001 is Marcus Vance from Atlas');

    // 5. Attendance Management API
    console.log('\n--- 5. Attendance API ---');
    const attList = await request({
      url: '/api/attendance',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    assert(attList.status === 200, 'GET /api/attendance returns 200 OK');
    assert(attList.body.attendance.length > 0, 'Attendance records retrieved from MongoDB Atlas');

    const todayAtt = await request({
      url: '/api/attendance/today',
      headers: { authorization: `Bearer ${empToken}` },
    });
    assert(todayAtt.status === 200, "GET /api/attendance/today returns today's status");

    // 6. Leave Management & Balances API
    console.log('\n--- 6. Leave Management & Balances ---');
    const leaveList = await request({
      url: '/api/leaves',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    assert(leaveList.status === 200, 'GET /api/leaves returns 200 OK');
    assert(leaveList.body.leaves.length >= 4, 'Leave records retrieved from MongoDB Atlas');

    const balances = await request({
      url: '/api/leaves/balances',
      headers: { authorization: `Bearer ${empToken}` },
    });
    assert(balances.status === 200, 'GET /api/leaves/balances returns 200 OK');
    assert(balances.body.balance.casual !== undefined, 'Leave balance returns casual category');
    assert(balances.body.balance.sick !== undefined, 'Leave balance returns sick category');
    assert(balances.body.balance.paid !== undefined, 'Leave balance returns paid category');

    // 7. Tasks & Performance API
    console.log('\n--- 7. Tasks API ---');
    const taskList = await request({
      url: '/api/tasks',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    assert(taskList.status === 200, 'GET /api/tasks returns 200 OK');
    assert(taskList.body.tasks.length >= 4, 'Tasks retrieved from MongoDB Atlas');

    // 8. Payroll Management API
    console.log('\n--- 8. Payroll API ---');
    const payList = await request({
      url: '/api/payroll',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    assert(payList.status === 200, 'GET /api/payroll returns 200 OK');
    assert(payList.body.records.length >= 18, 'Payroll records retrieved from MongoDB Atlas (18 records)');

    // 9. Announcements API
    console.log('\n--- 9. Announcements API ---');
    const annList = await request({
      url: '/api/announcements',
      headers: { authorization: `Bearer ${empToken}` },
    });
    assert(annList.status === 200, 'GET /api/announcements returns 200 OK');
    assert(annList.body.announcements.length > 0, 'Announcements retrieved from MongoDB Atlas');

    // 10. Feedback & Strict Anonymity Verification
    console.log('\n--- 10. Feedback & Privacy Guarantees ---');
    const feedbackList = await request({
      url: '/api/feedback',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    assert(feedbackList.status === 200, 'GET /api/feedback returns 200 OK');
    const anonItem = feedbackList.body.feedback.find((f) => f.isAnonymous);
    assert(Boolean(anonItem), 'Found anonymous feedback record in feedback list');
    if (anonItem) {
      assert(anonItem.employeeId === null, 'Anonymous feedback employeeId is null');
      assert(anonItem.employeeName === 'Anonymous Colleague', 'Anonymous feedback employeeName is masked');
      assert(anonItem.employeeDepartment === 'Confidential', 'Anonymous feedback employeeDepartment is Confidential');
    }

    // 11. Notifications API
    console.log('\n--- 11. Notifications API ---');
    const notifList = await request({
      url: '/api/notifications',
      headers: { authorization: `Bearer ${empToken}` },
    });
    assert(notifList.status === 200, 'GET /api/notifications returns 200 OK');
    assert(Array.isArray(notifList.body.notifications), 'Notifications returns an array of alerts');

    console.log('\n====================================================');
    console.log(`TEST SUITE FINISHED: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Test Suite Exception:', err);
    process.exit(1);
  } finally {
    await disconnectDB();
  }
}

runApiTestSuite();
