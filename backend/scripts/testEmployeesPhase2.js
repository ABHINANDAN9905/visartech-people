import http from 'http';
import app from '../server.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { signToken } from '../config/jwt.js';
import User from '../models/User.js';

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

async function runEmployeePhase2Tests() {
  console.log('====================================================');
  console.log('VISARTECH People — Step 18 Phase 2 Employee API QA');
  console.log('====================================================');

  await connectDB();

  // Start HTTP server on dynamic port
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. Fetch test users from MongoDB
    const adminUser = await User.findOne({ role: 'HR_ADMIN' });
    const empUser1 = await User.findOne({ employeeId: 'EMP-001' });
    const empUser6 = await User.findOne({ employeeId: 'EMP-006' });

    if (!adminUser || !empUser1 || !empUser6) {
      throw new Error('Database is missing required seeded users (HR Admin, EMP-001, EMP-006).');
    }

    // 2. Generate auth tokens
    const adminToken = signToken({
      _id: adminUser._id.toString(),
      id: adminUser._id.toString(),
      employeeId: adminUser.employeeId,
      email: adminUser.email,
      role: 'HR_ADMIN',
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
      const fetchOpts = {
        method,
        headers,
      };
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
    // Test Group 1: Employee Directory Listing (HR_ADMIN only)
    // -------------------------------------------------------------
    console.log('\n--- 1. Employee Directory Listing & RBAC ---');

    // 1.1 Unauthenticated listing
    const unauthList = await apiRequest('/api/employees');
    assert(unauthList.status === 401, 'Unauthenticated GET /api/employees returns 401 Unauthorized');

    // 1.2 EMPLOYEE listing (Forbidden)
    const empList = await apiRequest('/api/employees', { token: emp6Token });
    assert(empList.status === 403, 'EMPLOYEE access to GET /api/employees returns 403 Forbidden');
    assert(empList.data?.success === false, 'EMPLOYEE access returns success: false');

    // 1.3 HR_ADMIN listing (Success)
    const adminList = await apiRequest('/api/employees', { token: adminToken });
    assert(adminList.status === 200, 'HR_ADMIN access to GET /api/employees returns 200 OK');
    assert(adminList.data?.success === true, 'HR_ADMIN listing returns success: true');
    assert(adminList.data?.totalCount >= 7, `HR_ADMIN listing contains at least 7 seeded users (actual: ${adminList.data?.totalCount})`);
    assert(Array.isArray(adminList.data?.employees), 'HR_ADMIN listing returns employees array');

    // -------------------------------------------------------------
    // Test Group 2: Search, Filters, and Pagination
    // -------------------------------------------------------------
    console.log('\n--- 2. Search, Filters, and Pagination ---');

    // 2.1 Search by first name
    const searchName = await apiRequest('/api/employees?search=Marcus', { token: adminToken });
    assert(searchName.status === 200, 'Search by name "Marcus" returns 200 OK');
    assert(searchName.data?.employees?.some(e => e.firstName === 'Marcus'), 'Search results contain Marcus Vance');

    // 2.2 Search by employee ID
    const searchId = await apiRequest('/api/employees?search=EMP-003', { token: adminToken });
    assert(searchId.status === 200, 'Search by ID "EMP-003" returns 200 OK');
    assert(searchId.data?.employees?.length === 1 && searchId.data?.employees[0]?.employeeId === 'EMP-003', 'Search returns exactly EMP-003');

    // 2.3 Search by email
    const searchEmail = await apiRequest('/api/employees?search=elena.rostova', { token: adminToken });
    assert(searchEmail.status === 200, 'Search by email returns 200 OK');
    assert(searchEmail.data?.employees?.some(e => e.email === 'elena.rostova@visartech.demo'), 'Search results contain Elena Rostova');

    // 2.4 Department filter
    const engFilter = await apiRequest('/api/employees?department=Engineering', { token: adminToken });
    assert(engFilter.status === 200, 'Filter by department=Engineering returns 200 OK');
    assert(engFilter.data?.employees?.every(e => e.department === 'Engineering'), 'All filtered employees belong to Engineering department');

    // 2.5 Status filter
    const activeFilter = await apiRequest('/api/employees?status=Active', { token: adminToken });
    assert(activeFilter.status === 200, 'Filter by status=Active returns 200 OK');
    assert(activeFilter.data?.employees?.every(e => e.employmentStatus === 'Active'), 'All filtered employees have Active status');

    // 2.6 Pagination
    const pageLimit = await apiRequest('/api/employees?page=1&limit=3', { token: adminToken });
    assert(pageLimit.status === 200, 'Pagination query (page=1, limit=3) returns 200 OK');
    assert(pageLimit.data?.employees?.length === 3, 'Pagination respects limit=3');
    assert(pageLimit.data?.page === 1, 'Pagination response reports page: 1');
    assert(pageLimit.data?.totalPages >= 3, `Pagination reports totalPages >= 3 (actual: ${pageLimit.data?.totalPages})`);

    // -------------------------------------------------------------
    // Test Group 3: View Individual Employee Profiles
    // -------------------------------------------------------------
    console.log('\n--- 3. Employee Profile Access Control ---');

    // 3.1 HR_ADMIN viewing any employee
    const adminViewEmp1 = await apiRequest('/api/employees/EMP-001', { token: adminToken });
    assert(adminViewEmp1.status === 200, 'HR_ADMIN can view any employee (EMP-001) returns 200 OK');
    assert(adminViewEmp1.data?.employee?.employeeId === 'EMP-001', 'Retrieved employee has employeeId EMP-001');

    // 3.2 EMPLOYEE viewing own profile
    const empViewSelf = await apiRequest('/api/employees/EMP-006', { token: emp6Token });
    assert(empViewSelf.status === 200, 'EMPLOYEE can view their own profile (EMP-006) returns 200 OK');
    assert(empViewSelf.data?.employee?.employeeId === 'EMP-006', 'Retrieved self profile has employeeId EMP-006');

    // 3.3 EMPLOYEE viewing another employee profile (Forbidden)
    const empViewOther = await apiRequest('/api/employees/EMP-001', { token: emp6Token });
    assert(empViewOther.status === 403, 'EMPLOYEE viewing another employee (EMP-001) returns 403 Forbidden');
    assert(empViewOther.data?.success === false, 'Unauthorized view returns success: false');

    // 3.4 Non-existent employee ID
    const notFoundEmp = await apiRequest('/api/employees/EMP-999', { token: adminToken });
    assert(notFoundEmp.status === 404, 'Querying non-existent employee EMP-999 returns 404 Not Found');

    // -------------------------------------------------------------
    // Test Group 4: Employee Creation (POST /api/employees)
    // -------------------------------------------------------------
    console.log('\n--- 4. Employee Creation & Validation ---');

    const testEmpPayload = {
      employeeId: 'EMP-999',
      firstName: 'Samantha',
      lastName: 'Sterling',
      email: 'samantha.sterling@visartech.demo',
      jobTitle: 'QA Automation Lead',
      department: 'Engineering',
      employmentType: 'Full-Time',
      phone: '+1 (312) 555-0195',
      address: '300 N LaSalle Dr',
      city: 'Chicago',
      state: 'IL',
      password: 'Password@123',
    };

    // 4.1 EMPLOYEE cannot create employee (Forbidden)
    const empCreate = await apiRequest('/api/employees', {
      method: 'POST',
      token: emp6Token,
      body: testEmpPayload,
    });
    assert(empCreate.status === 403, 'EMPLOYEE attempting POST /api/employees returns 403 Forbidden');

    // 4.2 Missing mandatory fields
    const missingFields = await apiRequest('/api/employees', {
      method: 'POST',
      token: adminToken,
      body: { firstName: 'Incomplete' },
    });
    assert(missingFields.status === 400, 'POST /api/employees missing mandatory fields returns 400 Bad Request');

    // 4.3 Invalid email format
    const invalidEmail = await apiRequest('/api/employees', {
      method: 'POST',
      token: adminToken,
      body: { ...testEmpPayload, email: 'not-an-email' },
    });
    assert(invalidEmail.status === 400, 'POST /api/employees with invalid email returns 400 Bad Request');

    // 4.4 Successful creation by HR_ADMIN
    const createSuccess = await apiRequest('/api/employees', {
      method: 'POST',
      token: adminToken,
      body: testEmpPayload,
    });
    assert(createSuccess.status === 201, 'HR_ADMIN successful POST /api/employees returns 201 Created');
    assert(createSuccess.data?.employee?.employeeId === 'EMP-999', 'Created employee has employeeId EMP-999');
    assert(!createSuccess.data?.employee?.passwordHash, 'Created employee response excludes passwordHash');

    // 4.5 Duplicate employeeId rejection
    const dupId = await apiRequest('/api/employees', {
      method: 'POST',
      token: adminToken,
      body: { ...testEmpPayload, email: 'unique.email@visartech.demo' },
    });
    assert(dupId.status === 409, 'Duplicate employeeId returns 409 Conflict');

    // 4.6 Duplicate email rejection
    const dupEmail = await apiRequest('/api/employees', {
      method: 'POST',
      token: adminToken,
      body: { ...testEmpPayload, employeeId: 'EMP-998' },
    });
    assert(dupEmail.status === 409, 'Duplicate email returns 409 Conflict');

    // -------------------------------------------------------------
    // Test Group 5: Employee Updates (PUT /api/employees/:id)
    // -------------------------------------------------------------
    console.log('\n--- 5. Employee Updates & Privilege Escalation Checks ---');

    // 5.1 HR_ADMIN updates any field
    const adminUpdate = await apiRequest('/api/employees/EMP-999', {
      method: 'PUT',
      token: adminToken,
      body: { jobTitle: 'Principal QA Architect', city: 'Naperville' },
    });
    assert(adminUpdate.status === 200, 'HR_ADMIN PUT /api/employees/EMP-999 returns 200 OK');
    assert(adminUpdate.data?.employee?.jobTitle === 'Principal QA Architect', 'Job title updated to Principal QA Architect');

    // 5.2 EMPLOYEE self-update of permitted fields (phone, address, city)
    const originalEmp6Phone = empUser6.phone;
    const empSelfUpdate = await apiRequest('/api/employees/EMP-006', {
      method: 'PUT',
      token: emp6Token,
      body: { phone: '+1 (312) 555-9999', city: 'Evanston' },
    });
    assert(empSelfUpdate.status === 200, 'EMPLOYEE self-update of phone/city returns 200 OK');
    assert(empSelfUpdate.data?.employee?.city === 'Evanston', 'Employee city updated successfully to Evanston');

    // Restore empUser6 data
    await User.updateOne({ employeeId: 'EMP-006' }, { phone: originalEmp6Phone, city: empUser6.city });

    // 5.3 EMPLOYEE privilege escalation attempt: changing role (Forbidden)
    const empEscalateRole = await apiRequest('/api/employees/EMP-006', {
      method: 'PUT',
      token: emp6Token,
      body: { role: 'HR_ADMIN' },
    });
    assert(empEscalateRole.status === 403, 'EMPLOYEE attempting role escalation to HR_ADMIN returns 403 Forbidden');

    // 5.4 EMPLOYEE privilege escalation attempt: changing employmentStatus (Forbidden)
    const empEscalateStatus = await apiRequest('/api/employees/EMP-006', {
      method: 'PUT',
      token: emp6Token,
      body: { employmentStatus: 'Terminated' },
    });
    assert(empEscalateStatus.status === 403, 'EMPLOYEE attempting employmentStatus change returns 403 Forbidden');

    // 5.5 EMPLOYEE attempting to update another colleague (Forbidden)
    const empUpdateOther = await apiRequest('/api/employees/EMP-001', {
      method: 'PUT',
      token: emp6Token,
      body: { phone: '+1 (312) 555-0000' },
    });
    assert(empUpdateOther.status === 403, 'EMPLOYEE attempting to update another colleague returns 403 Forbidden');

    // -------------------------------------------------------------
    // Test Group 6: Deactivation & Final Admin Protection
    // -------------------------------------------------------------
    console.log('\n--- 6. Deactivation & Safety Constraints ---');

    // 6.1 EMPLOYEE attempting to delete/deactivate (Forbidden)
    const empDelete = await apiRequest('/api/employees/EMP-999', {
      method: 'DELETE',
      token: emp6Token,
    });
    assert(empDelete.status === 403, 'EMPLOYEE attempting DELETE /api/employees returns 403 Forbidden');

    // 6.2 HR_ADMIN deactivating test employee (Safe deactivation -> Terminated)
    const adminDeactivate = await apiRequest('/api/employees/EMP-999', {
      method: 'DELETE',
      token: adminToken,
    });
    assert(adminDeactivate.status === 200, 'HR_ADMIN safe deactivation returns 200 OK');
    assert(adminDeactivate.data?.employee?.employmentStatus === 'Terminated', 'Deactivated employee status is set to Terminated');

    // 6.3 Final Active HR_ADMIN Protection
    const deactivateAdmin = await apiRequest(`/api/employees/${adminUser.employeeId}`, {
      method: 'DELETE',
      token: adminToken,
    });
    assert(deactivateAdmin.status === 400, 'Attempting to deactivate the final active HR_ADMIN returns 400 Bad Request');
    assert(deactivateAdmin.data?.success === false, 'Deactivation response indicates success: false');

    // 6.4 Demoting final active HR_ADMIN
    const demoteAdmin = await apiRequest(`/api/employees/${adminUser.employeeId}`, {
      method: 'PUT',
      token: adminToken,
      body: { role: 'EMPLOYEE' },
    });
    assert(demoteAdmin.status === 400, 'Attempting to demote the final active HR_ADMIN returns 400 Bad Request');

    // -------------------------------------------------------------
    // Test Group 7: Security & Credential Hygiene
    // -------------------------------------------------------------
    console.log('\n--- 7. Password & Credential Hygiene ---');

    const singleEmpRes = await apiRequest('/api/employees/EMP-001', { token: adminToken });
    assert(singleEmpRes.data?.employee?.passwordHash === undefined, 'GET /api/employees/:id never returns passwordHash');

    const allEmpsRes = await apiRequest('/api/employees', { token: adminToken });
    const anyHasPassword = allEmpsRes.data?.employees?.some(e => e.passwordHash !== undefined);
    assert(anyHasPassword === false, 'GET /api/employees list never returns passwordHash in any item');

    // -------------------------------------------------------------
    // Cleanup: Delete the test employee EMP-999
    // -------------------------------------------------------------
    await User.deleteOne({ employeeId: 'EMP-999' });
    console.log('\nCleaned up ephemeral test record (EMP-999).');

  } catch (err) {
    console.error('Fatal test execution error:', err);
    failed++;
  } finally {
    server.close();
    await disconnectDB();
  }

  console.log('\n====================================================');
  console.log(`Phase 2 Test Summary: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runEmployeePhase2Tests();
