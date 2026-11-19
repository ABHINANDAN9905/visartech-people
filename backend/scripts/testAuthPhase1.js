import http from 'http';
import { PassThrough } from 'stream';
import app from '../server.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { signToken } from '../config/jwt.js';

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
        // string
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

async function runAuthPhase1Tests() {
  console.log('====================================================');
  console.log('VISARTECH People — Step 18 Phase 1 Auth QA Suite');
  console.log('====================================================');

  await connectDB();

  try {
    // -----------------------------------------------------------------
    // 1. Validation & Missing Credentials
    // -----------------------------------------------------------------
    console.log('\n--- 1. Missing & Invalid Credentials Validation ---');
    const emptyLogin = await request({
      url: '/api/auth/login',
      method: 'POST',
      body: {},
    });
    assert(emptyLogin.status === 400, 'POST /api/auth/login with empty body returns 400 Bad Request');
    assert(emptyLogin.body.success === false, 'Empty login response indicates success: false');

    const missingPass = await request({
      url: '/api/auth/login',
      method: 'POST',
      body: { email: 'hr@visartech.demo' },
    });
    assert(missingPass.status === 400, 'POST /api/auth/login missing password returns 400 Bad Request');

    const missingEmail = await request({
      url: '/api/auth/login',
      method: 'POST',
      body: { password: 'Admin@123' },
    });
    assert(missingEmail.status === 400, 'POST /api/auth/login missing email returns 400 Bad Request');

    // -----------------------------------------------------------------
    // 2. Non-existent Account & Incorrect Password
    // -----------------------------------------------------------------
    console.log('\n--- 2. Non-existent Account & Bcrypt Comparison ---');
    const nonExistent = await request({
      url: '/api/auth/login',
      method: 'POST',
      body: { email: 'nobody@visartech.demo', password: 'Password123' },
    });
    assert(nonExistent.status === 401, 'POST /api/auth/login non-existent user returns 401');

    const wrongPass = await request({
      url: '/api/auth/login',
      method: 'POST',
      body: { email: 'hr@visartech.demo', password: 'WrongPassword999' },
    });
    assert(wrongPass.status === 401, 'POST /api/auth/login wrong password fails bcrypt verification (401)');
    assert(wrongPass.body.message.includes('incorrect'), 'Wrong password error message confirms incorrect password');

    // -----------------------------------------------------------------
    // 3. Successful Login (HR_ADMIN & EMPLOYEE)
    // -----------------------------------------------------------------
    console.log('\n--- 3. Successful Authentication & Token Issuance ---');
    const adminLogin = await request({
      url: '/api/auth/login',
      method: 'POST',
      body: { email: 'hr@visartech.demo', password: 'Admin@123' },
    });
    assert(adminLogin.status === 200, 'POST /api/auth/login succeeds for seeded HR_ADMIN');
    assert(Boolean(adminLogin.body.token), 'Admin login returns a valid JWT token');
    assert(adminLogin.body.user.role === 'HR_ADMIN', 'Admin user role is HR_ADMIN');
    assert(adminLogin.body.user.email === 'hr@visartech.demo', 'Admin email matches seeded account');
    assert(adminLogin.body.user.passwordHash === undefined, 'Admin response strictly excludes passwordHash');

    // Check Set-Cookie header
    const setCookieHeader = adminLogin.headers['set-cookie'];
    assert(Boolean(setCookieHeader), 'Login response sets Set-Cookie header');
    const cookieStr = Array.isArray(setCookieHeader) ? setCookieHeader.join('; ') : String(setCookieHeader);
    assert(cookieStr.includes('token='), 'Cookie contains token=<jwt>');
    assert(cookieStr.toLowerCase().includes('httponly'), 'Cookie has HttpOnly attribute set');

    const adminToken = adminLogin.body.token;

    const empLogin = await request({
      url: '/api/auth/login',
      method: 'POST',
      body: { email: 'employee1@visartech.demo', password: 'Employee@123' },
    });
    assert(empLogin.status === 200, 'POST /api/auth/login succeeds for seeded EMPLOYEE (Jordan Lee)');
    assert(empLogin.body.user.role === 'EMPLOYEE', 'Employee user role is EMPLOYEE');
    assert(empLogin.body.user.employeeId === 'EMP-006', 'Employee ID is EMP-006');
    assert(empLogin.body.user.passwordHash === undefined, 'Employee response strictly excludes passwordHash');

    const empToken = empLogin.body.token;

    // -----------------------------------------------------------------
    // 4. Token Transport Verification (Bearer Header vs HTTP-Only Cookie)
    // -----------------------------------------------------------------
    console.log('\n--- 4. Token Transport: Bearer Header vs Cookie ---');
    const meBearer = await request({
      url: '/api/auth/me',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    assert(meBearer.status === 200, 'GET /api/auth/me succeeds with Bearer token header');
    assert(meBearer.body.user.role === 'HR_ADMIN', 'Profile returned matches HR_ADMIN');

    const meCookie = await request({
      url: '/api/auth/me',
      headers: { cookie: `token=${empToken}` },
    });
    assert(meCookie.status === 200, 'GET /api/auth/me succeeds with HTTP-only cookie');
    assert(meCookie.body.user.employeeId === 'EMP-006', 'Profile returned matches EMP-006');

    const meNoToken = await request({ url: '/api/auth/me' });
    assert(meNoToken.status === 401, 'GET /api/auth/me without token returns 401 Unauthorized');

    // -----------------------------------------------------------------
    // 5. Invalid, Tampered & Expired JWT Handling
    // -----------------------------------------------------------------
    console.log('\n--- 5. Invalid, Tampered & Expired JWT Handling ---');
    const invalidFormat = await request({
      url: '/api/auth/me',
      headers: { authorization: 'Bearer completely_garbage_token' },
    });
    assert(invalidFormat.status === 401, 'Malformed JWT rejected with 401');

    const tamperedToken = adminToken.slice(0, -6) + 'xxxxxx';
    const tamperedReq = await request({
      url: '/api/auth/me',
      headers: { authorization: `Bearer ${tamperedToken}` },
    });
    assert(tamperedReq.status === 401, 'Tampered JWT signature rejected with 401');

    // Expired Token Test: generate a token that expired 10 seconds ago
    const expiredToken = signToken(
      {
        id: adminLogin.body.user.id || adminLogin.body.user._id,
        employeeId: 'ADM-001',
        role: 'HR_ADMIN',
        email: 'hr@visartech.demo',
      },
      -10 // Expired 10 seconds ago
    );

    const expiredReq = await request({
      url: '/api/auth/me',
      headers: { authorization: `Bearer ${expiredToken}` },
    });
    assert(expiredReq.status === 401, 'Expired JWT rejected with 401 Unauthorized');
    assert(expiredReq.body.message.toLowerCase().includes('expired'), 'Expired error message clearly communicates expiration');

    // -----------------------------------------------------------------
    // 6. Role-Based Authorization Enforcement (HR_ADMIN vs EMPLOYEE)
    // -----------------------------------------------------------------
    console.log('\n--- 6. Role-Based Authorization (RBAC) ---');
    // Admin access to HR-only endpoints
    const adminStats = await request({
      url: '/api/payroll/stats',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    assert(adminStats.status === 200, 'HR_ADMIN access to /api/payroll/stats allowed (200 OK)');

    const adminAnnouncement = await request({
      url: '/api/announcements',
      method: 'POST',
      headers: { authorization: `Bearer ${adminToken}` },
      body: {
        title: 'Security Milestone Sprint Passed',
        description: 'Authentication architecture and RBAC successfully enforced.',
        category: 'Policy Updates',
      },
    });
    assert(adminAnnouncement.status === 201, 'HR_ADMIN can publish announcements (201 Created)');

    // Employee access to HR-only endpoints
    const empStats = await request({
      url: '/api/payroll/stats',
      headers: { authorization: `Bearer ${empToken}` },
    });
    assert(empStats.status === 403, 'EMPLOYEE access to /api/payroll/stats rejected with 403 Forbidden');
    assert(empStats.body.message.includes('Forbidden'), '403 response contains clear Forbidden reason');

    const empAnnouncement = await request({
      url: '/api/announcements',
      method: 'POST',
      headers: { authorization: `Bearer ${empToken}` },
      body: { title: 'Employee Announcement Attempt', description: 'Should fail' },
    });
    assert(empAnnouncement.status === 403, 'EMPLOYEE publishing announcement rejected with 403 Forbidden');

    const empEmployeeCreate = await request({
      url: '/api/employees',
      method: 'POST',
      headers: { authorization: `Bearer ${empToken}` },
      body: { employeeId: 'EMP-999', firstName: 'Fake', lastName: 'User', email: 'fake@visartech.demo' },
    });
    assert(empEmployeeCreate.status === 403, 'EMPLOYEE creating employee rejected with 403 Forbidden');

    // -----------------------------------------------------------------
    // 7. Logout & Cookie Clearing
    // -----------------------------------------------------------------
    console.log('\n--- 7. Logout & Session Termination ---');
    const logoutRes = await request({
      url: '/api/auth/logout',
      method: 'POST',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    assert(logoutRes.status === 200, 'POST /api/auth/logout succeeds with 200 OK');
    const logoutCookieHeader = logoutRes.headers['set-cookie'];
    assert(Boolean(logoutCookieHeader), 'Logout response sends Set-Cookie to clear session');
    const logoutCookieStr = Array.isArray(logoutCookieHeader) ? logoutCookieHeader.join('; ') : String(logoutCookieHeader);
    assert(logoutCookieStr.includes('Expires=Thu, 01 Jan 1970') || logoutCookieStr.includes('Max-Age=0') || logoutCookieStr.includes('token=;'), 'Session cookie is cleared/expired on logout');

    console.log('\n====================================================');
    console.log(`STEP 18 PHASE 1 QA SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error('Test Suite Failed:', err);
    process.exit(1);
  } finally {
    await disconnectDB();
  }
}

runAuthPhase1Tests();
