import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { connectDB } from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const API_BASE = 'http://localhost:5000/api';

async function runAuthVerification() {
  console.log('====================================================');
  console.log('VISARTECH People — Employee Creation Authentication Test');
  console.log('====================================================\n');

  let hrToken = null;
  let employeeToken = null;
  let passed = 0;
  let failed = 0;

  function assert(condition, testName, details = '') {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}: ${details}`);
      failed++;
    }
  }

  // 1. Health check
  console.log('--- Step 1: Backend Health Check ---');
  try {
    const res = await fetch(`${API_BASE}/health`);
    const data = await res.json();
    assert(res.status === 200 && data.status === 'healthy', 'Backend /health returns 200 and healthy status');
  } catch (err) {
    assert(false, 'Backend /health returns 200', err.message);
  }

  // 2. CORS check for both localhost:3000 and 127.0.0.1:3000
  console.log('\n--- Step 2: CORS Preflight & Credentials Header Check ---');
  try {
    for (const origin of ['http://localhost:3000', 'http://127.0.0.1:3000']) {
      const res = await fetch(`${API_BASE}/health`, {
        headers: { Origin: origin }
      });
      const acao = res.headers.get('access-control-allow-origin');
      const acac = res.headers.get('access-control-allow-credentials');
      assert(acao === origin && acac === 'true', `CORS allows ${origin} with credentials: true`);
    }
  } catch (err) {
    assert(false, 'CORS preflight check', err.message);
  }

  // 3. Test unauthenticated POST /api/employees rejection
  console.log('\n--- Step 3: Unauthenticated Access Rejection ---');
  try {
    const res = await fetch(`${API_BASE}/employees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        employeeId: 'EMP-007',
        firstName: 'Unauthorized',
        lastName: 'Attempt',
        email: 'unauth@visartech.demo',
        jobTitle: 'Intruder',
        department: 'Engineering'
      })
    });
    const data = await res.json();
    assert(res.status === 401, 'Unauthenticated POST /employees returns HTTP 401');
    assert(data.message.includes('No authentication token provided'), 'Rejection message: "No authentication token provided"');
  } catch (err) {
    assert(false, 'Unauthenticated POST /employees returns 401', err.message);
  }

  // 4. Test HR Admin Login with migrated email kumarabhinandan1307@gmail.com
  console.log('\n--- Step 4: HR Admin Login (kumarabhinandan1307@gmail.com) ---');
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'kumarabhinandan1307@gmail.com',
        password: 'Admin@123'
      })
    });
    const setCookie = res.headers.get('set-cookie');
    const data = await res.json();
    assert(res.status === 200, 'HR Admin login returns HTTP 200');
    assert(typeof data.token === 'string' && data.token.length > 20, 'JWT token returned in JSON body');
    assert(data.user && data.user.role === 'HR_ADMIN', 'Returned user role is HR_ADMIN');
    assert(data.user && data.user.employeeId === 'ADM-001', 'Returned user employeeId is ADM-001');
    assert(setCookie && setCookie.includes('token='), 'HttpOnly cookie set in response header');
    hrToken = data.token;
  } catch (err) {
    assert(false, 'HR Admin login succeeds', err.message);
  }

  // 5. Test Profile Verification (GET /api/auth/me) with token
  console.log('\n--- Step 5: Session Verification (GET /api/auth/me) ---');
  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: {
        Authorization: `Bearer ${hrToken}`
      }
    });
    const data = await res.json();
    assert(res.status === 200, 'GET /auth/me with Bearer token returns HTTP 200');
    assert(data.user && data.user.email === 'kumarabhinandan1307@gmail.com', 'Authenticated user email matches target');
  } catch (err) {
    assert(false, 'GET /auth/me returns valid profile', err.message);
  }

  // 6. Test Employee Role Login & RBAC Rejection (employee1@visartech.demo)
  console.log('\n--- Step 6: Non-Admin Role RBAC Rejection (EMPLOYEE) ---');
  try {
    const resLogin = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'employee1@visartech.demo',
        password: 'Employee@123'
      })
    });
    const dataLogin = await resLogin.json();
    employeeToken = dataLogin.token;

    const resForbidden = await fetch(`${API_BASE}/employees`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${employeeToken}`
      },
      body: JSON.stringify({
        employeeId: 'EMP-007',
        firstName: 'Test',
        lastName: 'Auditor',
        email: 'test.auditor@visartech.demo',
        jobTitle: 'Security QA',
        department: 'Engineering'
      })
    });
    assert(resForbidden.status === 403, 'EMPLOYEE role POST /employees returns HTTP 403 Forbidden');
  } catch (err) {
    assert(false, 'EMPLOYEE role forbidden test', err.message);
  }

  // 7. Test Fictional Employee Creation via HR Admin (POST /api/employees)
  console.log('\n--- Step 7: Authorized Employee Creation as HR Admin ---');
  const testEmployeePayload = {
    employeeId: 'EMP-007',
    firstName: 'Test',
    lastName: 'Auditor',
    email: 'test.auditor@visartech.demo',
    phone: '+1 (312) 555-0199',
    jobTitle: 'Security QA Engineer',
    department: 'Engineering',
    employmentType: 'Full-Time',
    joiningDate: '2026-11-19',
    reportingManager: 'Marcus Vance (Lead Architect)',
    employmentStatus: 'Active',
    address: '100 N Riverside Plaza',
    city: 'Chicago',
    state: 'IL'
  };

  try {
    const res = await fetch(`${API_BASE}/employees`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hrToken}`
      },
      body: JSON.stringify(testEmployeePayload)
    });
    const data = await res.json();
    assert(res.status === 201, 'POST /employees as HR Admin returns HTTP 201 Created');
    assert(data.success === true, 'Response success is true');
    assert(data.employee && data.employee.employeeId === 'EMP-007', 'Created employeeId is EMP-007');
    assert(data.employee && data.employee.email === 'test.auditor@visartech.demo', 'Created employee email matches');
  } catch (err) {
    assert(false, 'Authorized employee creation succeeds', err.message);
  }

  // 8. Verify Employee in Backend Query (GET /api/employees)
  console.log('\n--- Step 8: Query Employee List (GET /api/employees) ---');
  try {
    const res = await fetch(`${API_BASE}/employees?search=EMP-007`, {
      headers: {
        Authorization: `Bearer ${hrToken}`
      }
    });
    const data = await res.json();
    assert(res.status === 200, 'GET /employees returns HTTP 200');
    const found = data.employees && data.employees.some((e) => e.employeeId === 'EMP-007');
    assert(found, 'Created employee EMP-007 is returned in employee query');
  } catch (err) {
    assert(false, 'Query employees succeeds', err.message);
  }

  // 9. Verify in MongoDB Atlas Directly & Verify Security Invariants
  console.log('\n--- Step 9: Direct Database Verification in MongoDB Atlas ---');
  await connectDB();
  try {
    const dbUser = await User.findOne({ employeeId: 'EMP-007' });
    assert(dbUser !== null, 'EMP-007 exists in MongoDB Atlas');
    assert(dbUser && dbUser.role === 'EMPLOYEE', 'EMP-007 role is EMPLOYEE');
    assert(dbUser && dbUser.email === 'test.auditor@visartech.demo', 'EMP-007 email matches in DB');

    // Verify ADM-001 integrity
    const hrAdmin = await User.findOne({ employeeId: 'ADM-001' });
    assert(hrAdmin && hrAdmin.email === 'kumarabhinandan1307@gmail.com', 'ADM-001 email preserved as kumarabhinandan1307@gmail.com');
    assert(hrAdmin && hrAdmin.role === 'HR_ADMIN', 'ADM-001 role preserved as HR_ADMIN');
  } catch (err) {
    assert(false, 'Direct MongoDB verification', err.message);
  }

  // 10. Clean up Test Record EMP-007 to restore canonical state
  console.log('\n--- Step 10: Clean up EMP-007 & Restore Canonical 7-User State ---');
  try {
    const deleteResult = await User.deleteOne({ employeeId: 'EMP-007' });
    assert(deleteResult.deletedCount === 1, 'Test record EMP-007 cleaned up successfully');

    const totalUsers = await User.countDocuments();
    assert(totalUsers === 7, `Total user count restored to canonical 7 (Current: ${totalUsers})`);

    const finalHr = await User.findOne({ employeeId: 'ADM-001' });
    assert(finalHr && !finalHr.isEmailVerified, 'ADM-001 pending email verification preserved');
  } catch (err) {
    assert(false, 'Cleanup EMP-007 succeeds', err.message);
  } finally {
    await mongoose.connection.close();
  }

  console.log('\n====================================================');
  console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runAuthVerification().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
