import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import crypto from 'crypto';
import User from '../models/User.js';
import { connectDB } from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const API_BASE = 'http://localhost:5000/api';

async function runTestSuite() {
  console.log('================================================================');
  console.log('VISARTECH People — Employee Login & Invitation Workflow Test Suite');
  console.log('================================================================\n');

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

  const baseHeaders = {
    'Content-Type': 'application/json',
    'x-test-suite': 'true',
  };

  let hrToken = null;
  let employeeToken = null;
  let newEmployeeRawToken = null;

  // Connect to DB directly for audit checks
  await connectDB();

  // ----------------------------------------------------------------
  // Test 1: HR Admin login using registered email
  // ----------------------------------------------------------------
  console.log('--- Test 1: HR Admin Login via Registered Email ---');
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: baseHeaders,
      body: JSON.stringify({
        email: 'kumarabhinandan1307@gmail.com',
        password: 'Admin@123',
      }),
    });
    const setCookie = res.headers.get('set-cookie');
    const data = await res.json();

    assert(res.status === 200, 'HR Admin email login returns HTTP 200');
    assert(data.token && typeof data.token === 'string', 'JWT token returned in JSON body');
    assert(data.user && data.user.role === 'HR_ADMIN', 'User role is HR_ADMIN');
    assert(data.user && data.user.employeeId === 'ADM-001', 'User employeeId is ADM-001');
    assert(setCookie && setCookie.includes('token='), 'HttpOnly cookie set in response header');
    hrToken = data.token;
  } catch (err) {
    assert(false, 'HR Admin email login', err.message);
  }

  // ----------------------------------------------------------------
  // Test 2: Employee login using registered email
  // ----------------------------------------------------------------
  console.log('\n--- Test 2: Employee Login via Registered Email ---');
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: baseHeaders,
      body: JSON.stringify({
        email: 'employee1@visartech.demo',
        password: 'Employee@123',
      }),
    });
    const data = await res.json();

    assert(res.status === 200, 'Employee email login returns HTTP 200');
    assert(data.token && typeof data.token === 'string', 'JWT token returned for employee');
    assert(data.user && data.user.role === 'EMPLOYEE', 'User role is EMPLOYEE');
    assert(data.user && data.user.employeeId === 'EMP-006', 'User employeeId is EMP-006');
    employeeToken = data.token;
  } catch (err) {
    assert(false, 'Employee email login', err.message);
  }

  // ----------------------------------------------------------------
  // Test 3: Employee login using Employee ID (Case-Insensitive)
  // ----------------------------------------------------------------
  console.log('\n--- Test 3: Employee Login via Employee ID (Case-Insensitive) ---');
  try {
    // 3a. Uppercase EMP-006
    const resUpper = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: baseHeaders,
      body: JSON.stringify({
        identifier: 'EMP-006',
        password: 'Employee@123',
      }),
    });
    const dataUpper = await resUpper.json();
    assert(resUpper.status === 200, 'Login with uppercase Employee ID (EMP-006) returns HTTP 200');
    assert(dataUpper.user && dataUpper.user.email === 'employee1@visartech.demo', 'Authenticates correct account');

    // 3b. Lowercase emp-006
    const resLower = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: baseHeaders,
      body: JSON.stringify({
        identifier: 'emp-006',
        password: 'Employee@123',
      }),
    });
    const dataLower = await resLower.json();
    assert(resLower.status === 200, 'Login with lowercase Employee ID (emp-006) returns HTTP 200');
    assert(dataLower.user && dataLower.user.employeeId === 'EMP-006', 'Matches case-insensitively');

    // 3c. HR Admin login via Employee ID ADM-001
    const resHrId = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: baseHeaders,
      body: JSON.stringify({
        identifier: 'adm-001',
        password: 'Admin@123',
      }),
    });
    const dataHrId = await resHrId.json();
    assert(resHrId.status === 200, 'HR Admin login with Employee ID (adm-001) returns HTTP 200');
    assert(dataHrId.user && dataHrId.user.role === 'HR_ADMIN', 'HR Admin authenticated via ID');
  } catch (err) {
    assert(false, 'Employee ID login', err.message);
  }

  // ----------------------------------------------------------------
  // Test 4: Incorrect password rejection with generic message
  // ----------------------------------------------------------------
  console.log('\n--- Test 4: Incorrect Password Rejection (Generic Error) ---');
  const GENERIC_MSG = 'Invalid credentials. Please check your login details and password.';
  try {
    // 4a. Existing email + bad password
    const res1 = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: baseHeaders,
      body: JSON.stringify({ email: 'employee1@visartech.demo', password: 'BadPassword99!' }),
    });
    const data1 = await res1.json();
    assert(res1.status === 401, 'Wrong password returns HTTP 401');
    assert(data1.message === GENERIC_MSG, 'Returns generic credentials error message');

    // 4b. Existing ID + bad password
    const res2 = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: baseHeaders,
      body: JSON.stringify({ identifier: 'EMP-006', password: 'BadPassword99!' }),
    });
    const data2 = await res2.json();
    assert(res2.status === 401, 'Wrong password on Employee ID returns HTTP 401');
    assert(data2.message === GENERIC_MSG, 'Returns identical generic error message');

    // 4c. Non-existent email
    const res3 = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: baseHeaders,
      body: JSON.stringify({ email: 'ghost.user@visartech.demo', password: 'SomePassword123' }),
    });
    const data3 = await res3.json();
    assert(res3.status === 401, 'Non-existent email returns HTTP 401');
    assert(data3.message === GENERIC_MSG, 'Returns identical generic error message (anti-enumeration)');

    // 4d. Non-existent Employee ID
    const res4 = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: baseHeaders,
      body: JSON.stringify({ identifier: 'EMP-999', password: 'SomePassword123' }),
    });
    const data4 = await res4.json();
    assert(res4.status === 401, 'Non-existent ID returns HTTP 401');
    assert(data4.message === GENERIC_MSG, 'Returns identical generic error message (anti-enumeration)');
  } catch (err) {
    assert(false, 'Incorrect password rejection', err.message);
  }

  // ----------------------------------------------------------------
  // Test 5: Employee Creation without default password & uninvited login rejection
  // ----------------------------------------------------------------
  console.log('\n--- Test 5: Employee Creation & Uninvited Login Rejection ---');
  try {
    // 5a. Create employee EMP-TEST-001 via HR Admin
    const resCreate = await fetch(`${API_BASE}/employees`, {
      method: 'POST',
      headers: {
        ...baseHeaders,
        Authorization: `Bearer ${hrToken}`,
      },
      body: JSON.stringify({
        employeeId: 'EMP-TEST-001',
        firstName: 'Sam',
        lastName: 'Fisher',
        email: 'sam.fisher.test@visartech.demo',
        phone: '+1 (312) 555-0199',
        jobTitle: 'Security Specialist',
        department: 'Engineering',
        employmentType: 'Full-Time',
        joiningDate: '2026-11-19',
      }),
    });
    const dataCreate = await resCreate.json();
    assert(resCreate.status === 201, 'HR Admin creates EMP-TEST-001 returning HTTP 201');
    assert(dataCreate.employee && dataCreate.employee.employeeId === 'EMP-TEST-001', 'Created employeeId is EMP-TEST-001');

    // Verify in MongoDB: passwordHash is undefined/null and invitationStatus is PENDING
    const dbEmp = await User.findOne({ employeeId: 'EMP-TEST-001' }).select('+passwordHash +invitationToken +invitationExpires +invitationStatus');
    assert(dbEmp !== null, 'EMP-TEST-001 saved in MongoDB Atlas');
    assert(!dbEmp.passwordHash, 'No shared default password assigned');
    assert(dbEmp.invitationStatus === 'PENDING', 'invitationStatus is PENDING');
    assert(typeof dbEmp.invitationToken === 'string' && dbEmp.invitationToken.length === 64, 'Stored token is SHA-256 hash');

    // 5b. Uninvited employee cannot log in
    const resLoginPendingEmail = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: baseHeaders,
      body: JSON.stringify({
        email: 'sam.fisher.test@visartech.demo',
        password: 'Employee@123',
      }),
    });
    assert(resLoginPendingEmail.status === 401, 'Pending employee cannot log in via email (returns HTTP 401)');

    const resLoginPendingId = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: baseHeaders,
      body: JSON.stringify({
        identifier: 'EMP-TEST-001',
        password: 'Employee@123',
      }),
    });
    assert(resLoginPendingId.status === 401, 'Pending employee cannot log in via ID (returns HTTP 401)');
  } catch (err) {
    assert(false, 'Employee creation and uninvited login test', err.message);
  }

  // ----------------------------------------------------------------
  // Test 6: Expired invitation rejection
  // ----------------------------------------------------------------
  console.log('\n--- Test 6: Expired Invitation Rejection ---');
  try {
    // Generate a test token and simulate expired date in DB
    const rawExpiredToken = crypto.randomBytes(32).toString('hex');
    const hashedExpiredToken = crypto.createHash('sha256').update(rawExpiredToken).digest('hex');

    await User.updateOne(
      { employeeId: 'EMP-TEST-001' },
      {
        invitationToken: hashedExpiredToken,
        invitationExpires: new Date(Date.now() - 3600000), // 1 hour in the past
      }
    );

    // Validate expired token
    const resCheck = await fetch(`${API_BASE}/auth/invitation/${rawExpiredToken}`, { headers: baseHeaders });
    assert(resCheck.status === 400, 'GET /invitation/:token with expired token returns HTTP 400');

    // Attempt accept with expired token
    const resAccept = await fetch(`${API_BASE}/auth/accept-invitation`, {
      method: 'POST',
      headers: baseHeaders,
      body: JSON.stringify({
        token: rawExpiredToken,
        password: 'NewStrongPassword@123',
      }),
    });
    const dataAccept = await resAccept.json();
    assert(resAccept.status === 400, 'POST /accept-invitation with expired token returns HTTP 400');
    assert(dataAccept.message.includes('expired'), 'Error message indicates token expiration/invalidity');
  } catch (err) {
    assert(false, 'Expired invitation rejection', err.message);
  }

  // ----------------------------------------------------------------
  // Test 7: Resend invitation & Single-use invitation enforcement
  // ----------------------------------------------------------------
  console.log('\n--- Test 7: Resend Invitation & Single-Use Enforcement ---');
  try {
    // 7a. Resend invitation via HR Admin endpoint
    const resResend = await fetch(`${API_BASE}/employees/EMP-TEST-001/resend-invitation`, {
      method: 'POST',
      headers: {
        ...baseHeaders,
        Authorization: `Bearer ${hrToken}`,
      },
    });
    const dataResend = await resResend.json();
    assert(resResend.status === 200, 'HR Admin resend invitation returns HTTP 200');

    // Obtain the fresh raw token by generating on doc
    const empDoc = await User.findOne({ employeeId: 'EMP-TEST-001' });
    newEmployeeRawToken = empDoc.generateInvitationToken();
    await empDoc.save();

    // 7b. Validate fresh token
    const resVal = await fetch(`${API_BASE}/auth/invitation/${newEmployeeRawToken}`, { headers: baseHeaders });
    const dataVal = await resVal.json();
    assert(resVal.status === 200, 'Fresh invitation token validation returns HTTP 200');
    assert(dataVal.invitation && dataVal.invitation.employeeId === 'EMP-TEST-001', 'Validates correct employee');

    // 7c. Accept invitation and set new password
    const resSetPw = await fetch(`${API_BASE}/auth/accept-invitation`, {
      method: 'POST',
      headers: baseHeaders,
      body: JSON.stringify({
        token: newEmployeeRawToken,
        password: 'SamFisherSecure@2026',
      }),
    });
    const dataSetPw = await resSetPw.json();
    assert(resSetPw.status === 200, 'Accept invitation returns HTTP 200');
    assert(dataSetPw.token && typeof dataSetPw.token === 'string', 'JWT token issued upon invitation acceptance');

    // 7d. Now EMP-TEST-001 can log in with new password via email
    const resLoginNewEmail = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: baseHeaders,
      body: JSON.stringify({
        email: 'sam.fisher.test@visartech.demo',
        password: 'SamFisherSecure@2026',
      }),
    });
    assert(resLoginNewEmail.status === 200, 'EMP-TEST-001 logs in successfully with new password via email');

    // 7e. Now EMP-TEST-001 can log in with new password via Employee ID
    const resLoginNewId = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: baseHeaders,
      body: JSON.stringify({
        identifier: 'EMP-TEST-001',
        password: 'SamFisherSecure@2026',
      }),
    });
    assert(resLoginNewId.status === 200, 'EMP-TEST-001 logs in successfully with new password via Employee ID');

    // 7f. Re-attempt to use the same invitation token (Single-use enforcement)
    const resReused = await fetch(`${API_BASE}/auth/accept-invitation`, {
      method: 'POST',
      headers: baseHeaders,
      body: JSON.stringify({
        token: newEmployeeRawToken,
        password: 'AnotherPassword@123',
      }),
    });
    assert(resReused.status === 400, 'Reusing single-use invitation token returns HTTP 400 rejection');
  } catch (err) {
    assert(false, 'Resend invitation and single-use enforcement', err.message);
  }

  // ----------------------------------------------------------------
  // Test 8: Employee cannot access HR Admin APIs
  // ----------------------------------------------------------------
  console.log('\n--- Test 8: Server-Side RBAC Enforcement on Protected HR APIs ---');
  try {
    // 8a. Employee attempting GET /employees (Directory admin view)
    const resEmpList = await fetch(`${API_BASE}/employees`, {
      headers: { ...baseHeaders, Authorization: `Bearer ${employeeToken}` },
    });
    assert(resEmpList.status === 403, 'Employee GET /employees returns HTTP 403 Forbidden');

    // 8b. Employee attempting POST /employees (Employee creation)
    const resEmpCreate = await fetch(`${API_BASE}/employees`, {
      method: 'POST',
      headers: {
        ...baseHeaders,
        Authorization: `Bearer ${employeeToken}`,
      },
      body: JSON.stringify({ employeeId: 'EMP-099', firstName: 'Hacker', lastName: 'X', email: 'hacker@visartech.demo' }),
    });
    assert(resEmpCreate.status === 403, 'Employee POST /employees returns HTTP 403 Forbidden');

    // 8c. Employee attempting payroll generation
    const resPayroll = await fetch(`${API_BASE}/payroll/generate`, {
      method: 'POST',
      headers: {
        ...baseHeaders,
        Authorization: `Bearer ${employeeToken}`,
      },
      body: JSON.stringify({ month: 11, year: 2026 }),
    });
    assert(resPayroll.status === 403, 'Employee POST /payroll/generate returns HTTP 403 Forbidden');

    // 8d. Employee attempting to resend invitation
    const resResendByEmp = await fetch(`${API_BASE}/employees/EMP-TEST-001/resend-invitation`, {
      method: 'POST',
      headers: { ...baseHeaders, Authorization: `Bearer ${employeeToken}` },
    });
    assert(resResendByEmp.status === 403, 'Employee POST /resend-invitation returns HTTP 403 Forbidden');
  } catch (err) {
    assert(false, 'RBAC enforcement test', err.message);
  }

  // ----------------------------------------------------------------
  // Test 9: Employee cannot access another employee's private profile
  // ----------------------------------------------------------------
  console.log("\n--- Test 9: Horizontal Access Prevention (Private Records) ---");
  try {
    // EMP-006 accessing EMP-001 profile
    const resOtherEmp = await fetch(`${API_BASE}/employees/EMP-001`, {
      headers: { ...baseHeaders, Authorization: `Bearer ${employeeToken}` },
    });
    assert(resOtherEmp.status === 403, 'EMP-006 accessing EMP-001 returns HTTP 403 Forbidden');

    // EMP-006 accessing ADM-001 profile
    const resAdminProf = await fetch(`${API_BASE}/employees/ADM-001`, {
      headers: { ...baseHeaders, Authorization: `Bearer ${employeeToken}` },
    });
    assert(resAdminProf.status === 403, 'EMP-006 accessing ADM-001 returns HTTP 403 Forbidden');

    // EMP-006 accessing own profile
    const resSelf = await fetch(`${API_BASE}/employees/EMP-006`, {
      headers: { ...baseHeaders, Authorization: `Bearer ${employeeToken}` },
    });
    const dataSelf = await resSelf.json();
    assert(resSelf.status === 200, 'EMP-006 accessing own profile returns HTTP 200 OK');
    assert(dataSelf.employee && dataSelf.employee.employeeId === 'EMP-006', 'Profile matches self');
  } catch (err) {
    assert(false, 'Horizontal access prevention', err.message);
  }

  // ----------------------------------------------------------------
  // Test 10: Canonical State Verification & Test Cleanup
  // ----------------------------------------------------------------
  console.log('\n--- Test 10: Canonical State Verification & Test Employee Cleanup ---');
  try {
    // Delete temporary test employee EMP-TEST-001
    const delRes = await User.deleteOne({ employeeId: 'EMP-TEST-001' });
    assert(delRes.deletedCount === 1, 'Temporary test employee EMP-TEST-001 deleted cleanly');

    // Verify HR Admin ADM-001 integrity
    const hrDoc = await User.findOne({ employeeId: 'ADM-001' });
    assert(hrDoc !== null, 'ADM-001 exists');
    assert(hrDoc.email === 'kumarabhinandan1307@gmail.com', 'HR Admin email preserved as kumarabhinandan1307@gmail.com');
    assert(hrDoc.role === 'HR_ADMIN', 'HR Admin role is HR_ADMIN');
    assert(hrDoc.isEmailVerified === false, 'HR Admin email verification status preserved');

    // Verify canonical EMP-001 through EMP-006 exist
    const allEmpIds = (await User.find({ role: 'EMPLOYEE' })).map(u => u.employeeId);
    const hasCanonical = ['EMP-001', 'EMP-002', 'EMP-003', 'EMP-004', 'EMP-005', 'EMP-006'].every(id => allEmpIds.includes(id));
    assert(hasCanonical, 'All 6 canonical employees EMP-001 through EMP-006 are intact');
  } catch (err) {
    assert(false, 'Canonical state verification', err.message);
  } finally {
    await mongoose.connection.close();
  }

  console.log('\n================================================================');
  console.log(`SUMMARY: ${passed} passed, ${failed} failed`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
