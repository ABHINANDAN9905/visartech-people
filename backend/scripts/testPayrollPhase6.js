import http from 'http';
import app from '../server.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { signToken } from '../config/jwt.js';
import User from '../models/User.js';
import SalaryStructure from '../models/SalaryStructure.js';
import PayrollRecord from '../models/PayrollRecord.js';

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

async function runPayrollPhase6Tests() {
  console.log('====================================================');
  console.log('VISARTECH People — Step 18 Phase 6 Payroll QA Suite');
  console.log('====================================================');

  await connectDB();

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  // Isolated QA Identifiers
  const qaEmpId = 'EMP-QAPAY1';
  const otherEmpId = 'EMP-QAPAY2';
  const inactiveEmpId = 'EMP-QAPAY3';
  const decimalEmpId = 'EMP-QAPAY4';
  const testMonths = ['2026-12', '2027-01', '2027-02'];

  try {
    // 0. Initial baseline snapshot
    const initialStructureCount = await SalaryStructure.countDocuments();
    const initialPayrollCount = await PayrollRecord.countDocuments();

    const adminUser = await User.findOne({ role: 'HR_ADMIN' });
    const seededEmp = await User.findOne({ employeeId: 'EMP-001' });

    if (!adminUser || !seededEmp) {
      throw new Error('Database is missing required seeded users.');
    }

    // Cleanup any remnants
    await User.deleteMany({ employeeId: { $in: [qaEmpId, otherEmpId, inactiveEmpId, decimalEmpId] } });
    await SalaryStructure.deleteMany({ employeeId: { $in: [qaEmpId, otherEmpId, inactiveEmpId, decimalEmpId] } });
    await PayrollRecord.deleteMany({
      $or: [
        { employeeId: { $in: [qaEmpId, otherEmpId, inactiveEmpId, decimalEmpId] } },
        { payrollMonth: { $in: testMonths } },
      ],
    });

    // Create test employees
    const qaUser = await User.create({
      employeeId: qaEmpId,
      firstName: 'Elena',
      lastName: 'Tester',
      email: 'elena.payroll@visartech.demo',
      passwordHash: await User.hashPassword('Pass@123'),
      role: 'EMPLOYEE',
      jobTitle: 'QA Engineer',
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
      email: 'marcus.colleague.pay@visartech.demo',
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

    const inactiveUser = await User.create({
      employeeId: inactiveEmpId,
      firstName: 'Former',
      lastName: 'Staff',
      email: 'former.staff@visartech.demo',
      passwordHash: await User.hashPassword('Pass@123'),
      role: 'EMPLOYEE',
      jobTitle: 'Former Analyst',
      department: 'Infrastructure',
      employmentStatus: 'Terminated',
      joiningDate: new Date('2025-01-01'),
      phone: '+1 (312) 555-0166',
      address: '300 N State St',
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
      let buffer = null;
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        try {
          data = await res.json();
        } catch (e) {
          data = null;
        }
      } else {
        const arrayBuf = await res.arrayBuffer();
        buffer = Buffer.from(arrayBuf);
      }
      return { status: res.status, headers: res.headers, data, buffer };
    }

    // TEST 1: Unauthenticated payroll requests return 401
    console.log('\n--- 1. Authentication Enforcement ---');
    const unauthGetPayroll = await apiRequest('/api/payroll');
    const unauthGetStructures = await apiRequest('/api/payroll/salary-structures');
    const unauthGenerate = await apiRequest('/api/payroll/generate', {
      method: 'POST',
      body: { month: '2026-12' },
    });
    assert(
      unauthGetPayroll.status === 401 &&
        unauthGetStructures.status === 401 &&
        unauthGenerate.status === 401,
      'Test 1: Unauthenticated payroll requests return 401 Unauthorized',
      `Statuses: ${unauthGetPayroll.status}, ${unauthGetStructures.status}, ${unauthGenerate.status}`
    );

    // TEST 2: EMPLOYEE cannot access HR Admin payroll endpoints
    console.log('\n--- 2. Role-Based Access Control (RBAC) ---');
    const empGetPayroll = await apiRequest('/api/payroll', { token: qaToken });
    const empGetStructures = await apiRequest('/api/payroll/salary-structures', { token: qaToken });
    const empGenerate = await apiRequest('/api/payroll/generate', {
      method: 'POST',
      token: qaToken,
      body: { month: '2026-12' },
    });
    const empStats = await apiRequest('/api/payroll/stats', { token: qaToken });
    assert(
      empGetPayroll.status === 403 &&
        empGetStructures.status === 403 &&
        empGenerate.status === 403 &&
        empStats.status === 403,
      'Test 2: EMPLOYEE cannot access HR Admin payroll endpoints (returns 403 Forbidden)',
      `Statuses: ${empGetPayroll.status}, ${empGetStructures.status}, ${empGenerate.status}, ${empStats.status}`
    );

    // TEST 3: HR_ADMIN can create salary structures
    console.log('\n--- 3. Salary Structure Creation ---');
    const createStructRes = await apiRequest('/api/payroll/salary-structures', {
      method: 'POST',
      token: adminToken,
      body: {
        employeeId: qaEmpId,
        basicSalary: 6000,
        housingAllowance: 1000,
        otherAllowances: 400,
        bonus: 500,
        taxDeduction: 1200,
        otherDeductions: 300,
        bankName: 'Chase Bank (Demo)',
        accountNumberMasked: '•••• •••• 9812',
      },
    });
    const createdStruct = createStructRes.data?.structure;
    assert(
      createStructRes.status === 201 &&
        createStructRes.data?.success === true &&
        createdStruct &&
        createdStruct.employeeId === qaEmpId &&
        createdStruct.grossSalary === 7900 &&
        createdStruct.totalDeductions === 1500 &&
        createdStruct.netSalary === 6400,
      'Test 3: HR_ADMIN can create salary structures with computed gross, deductions, and net salary',
      JSON.stringify(createStructRes.data)
    );

    // TEST 4: Duplicate salary structures are rejected
    console.log('\n--- 4. Duplicate Structure Prevention ---');
    const dupStructRes = await apiRequest('/api/payroll/salary-structures', {
      method: 'POST',
      token: adminToken,
      body: {
        employeeId: qaEmpId,
        basicSalary: 6200,
      },
    });
    assert(
      dupStructRes.status === 400 && dupStructRes.data?.success === false,
      'Test 4: Duplicate salary structures for same employee are rejected with 400 Bad Request',
      `Status: ${dupStructRes.status}, Message: ${dupStructRes.data?.message}`
    );

    // TEST 5: Invalid and negative salary values are rejected
    console.log('\n--- 5. Monetary Component Validation ---');
    const negBasicRes = await apiRequest('/api/payroll/salary-structures', {
      method: 'POST',
      token: adminToken,
      body: {
        employeeId: otherEmpId,
        basicSalary: -1000,
      },
    });
    const nanBasicRes = await apiRequest('/api/payroll/salary-structures', {
      method: 'POST',
      token: adminToken,
      body: {
        employeeId: otherEmpId,
        basicSalary: 'INVALID',
      },
    });
    const negNetRes = await apiRequest('/api/payroll/salary-structures', {
      method: 'POST',
      token: adminToken,
      body: {
        employeeId: otherEmpId,
        basicSalary: 2000,
        taxDeduction: 2500, // deductions exceed gross
      },
    });
    assert(
      negBasicRes.status === 400 && nanBasicRes.status === 400 && negNetRes.status === 400,
      'Test 5: Negative salary values, non-numeric strings, and net salary < 0 are rejected with 400',
      `Neg: ${negBasicRes.status}, NaN: ${nanBasicRes.status}, NegNet: ${negNetRes.status}`
    );

    // Create valid structure for otherEmpId for subsequent tests
    const otherStructRes = await apiRequest('/api/payroll/salary-structures', {
      method: 'POST',
      token: adminToken,
      body: {
        employeeId: otherEmpId,
        basicSalary: 7000,
        housingAllowance: 1200,
        otherAllowances: 300,
        bonus: 400,
        taxDeduction: 1500,
        otherDeductions: 400,
        bankName: 'Bank of America (Demo)',
        accountNumberMasked: '•••• •••• 5511',
      },
    });
    assert(otherStructRes.status === 201, 'Setup: Created structure for otherEmpId');

    // TEST 6: Employee can view only their own salary structure
    console.log('\n--- 6. Scoped Salary Structure Privacy ---');
    const empOwnStructRes = await apiRequest(`/api/payroll/salary-structures/${qaEmpId}`, {
      token: qaToken,
    });
    const empCrossStructRes = await apiRequest(`/api/payroll/salary-structures/${otherEmpId}`, {
      token: qaToken,
    });
    const adminViewStructRes = await apiRequest(`/api/payroll/salary-structures/${qaEmpId}`, {
      token: adminToken,
    });
    assert(
      empOwnStructRes.status === 200 &&
        empOwnStructRes.data?.structure?.employeeId === qaEmpId &&
        empCrossStructRes.status === 403 &&
        adminViewStructRes.status === 200,
      'Test 6: Employee can view only their own salary structure; viewing another returns 403',
      `Own: ${empOwnStructRes.status}, Cross: ${empCrossStructRes.status}, Admin: ${adminViewStructRes.status}`
    );

    // TEST 7: HR_ADMIN can generate monthly payroll
    console.log('\n--- 7. Batch Monthly Payroll Generation ---');
    const genRes = await apiRequest('/api/payroll/generate', {
      method: 'POST',
      token: adminToken,
      body: { month: '2026-12' },
    });
    assert(
      genRes.status === 201 &&
        genRes.data?.success === true &&
        genRes.data.generatedCount >= 2 &&
        genRes.data.month === '2026-12',
      'Test 7: HR_ADMIN can generate monthly payroll for eligible active employees',
      `Generated count: ${genRes.data?.generatedCount}`
    );

    // TEST 8: Payroll calculations are accurate
    console.log('\n--- 8. Payroll Component Calculation Accuracy ---');
    const qaDecPayroll = await PayrollRecord.findOne({
      employeeId: qaEmpId,
      payrollMonth: '2026-12',
    });
    assert(
      qaDecPayroll !== null &&
        qaDecPayroll.basicSalary === 6000 &&
        qaDecPayroll.allowances === 1900 && // 1000 + 400 + 500
        qaDecPayroll.grossSalary === 7900 &&
        qaDecPayroll.deductions === 1500 && // 1200 + 300
        qaDecPayroll.netSalary === 6400 &&
        qaDecPayroll.paymentStatus === 'PENDING',
      'Test 8: Payroll calculations match formula (gross = basic + allowances, net = gross - deductions)',
      `Actual net: ${qaDecPayroll?.netSalary}, gross: ${qaDecPayroll?.grossSalary}`
    );

    // TEST 9: Duplicate monthly payroll generation is prevented
    console.log('\n--- 9. Duplicate Monthly Generation Prevention ---');
    const dupGenRes = await apiRequest('/api/payroll/generate', {
      method: 'POST',
      token: adminToken,
      body: { month: '2026-12' },
    });
    assert(
      dupGenRes.status === 200 &&
        dupGenRes.data?.generatedCount === 0 &&
        dupGenRes.data?.skippedCount >= 2,
      'Test 9: Re-running payroll generation prevents duplicate records and skips existing employees',
      `Gen: ${dupGenRes.data?.generatedCount}, Skipped: ${dupGenRes.data?.skippedCount}`
    );

    // TEST 10: Inactive employees are excluded
    console.log('\n--- 10. Inactive Employee Exclusion ---');
    const inactivePayroll = await PayrollRecord.findOne({
      employeeId: inactiveEmpId,
      payrollMonth: '2026-12',
    });
    assert(
      inactivePayroll === null,
      'Test 10: Inactive / terminated employees are strictly excluded from payroll generation',
      `Found inactive payroll: ${Boolean(inactivePayroll)}`
    );

    // TEST 11: Existing PAID records cannot be overwritten
    console.log('\n--- 11. Immutability of PAID Payroll Records ---');
    // Mark qaDecPayroll as PAID
    qaDecPayroll.paymentStatus = 'PAID';
    qaDecPayroll.paidAt = new Date();
    await qaDecPayroll.save();

    const regenPaidRes = await apiRequest('/api/payroll/generate', {
      method: 'POST',
      token: adminToken,
      body: { month: '2026-12' },
    });
    const recheckedPaid = await PayrollRecord.findOne({
      employeeId: qaEmpId,
      payrollMonth: '2026-12',
    });
    assert(
      recheckedPaid.paymentStatus === 'PAID' &&
        regenPaidRes.data?.skipped?.some((s) => s.employeeId === qaEmpId && s.reason.includes('paid')),
      'Test 11: Existing PAID payroll records cannot be overwritten by regeneration',
      `Payment status: ${recheckedPaid?.paymentStatus}`
    );

    // TEST 12: HR_ADMIN can list and filter payroll records
    console.log('\n--- 12. Payroll Directory Querying & Filters ---');
    const monthFilterRes = await apiRequest('/api/payroll?month=2026-12', { token: adminToken });
    const statusFilterRes = await apiRequest('/api/payroll?paymentStatus=PAID', {
      token: adminToken,
    });
    const empFilterRes = await apiRequest(`/api/payroll?employeeId=${qaEmpId}`, {
      token: adminToken,
    });
    assert(
      monthFilterRes.status === 200 &&
        monthFilterRes.data.records.every((r) => r.payrollMonth === '2026-12') &&
        statusFilterRes.status === 200 &&
        statusFilterRes.data.records.every((r) => r.paymentStatus === 'PAID') &&
        empFilterRes.status === 200 &&
        empFilterRes.data.records.every((r) => r.employeeId === qaEmpId),
      'Test 12: HR_ADMIN can list and filter payroll records by month, status, and employeeId',
      `Month count: ${monthFilterRes.data?.records?.length}`
    );

    // TEST 13: EMPLOYEE sees only their own payroll history
    console.log('\n--- 13. Scoped Employee Payroll History ---');
    const myPayrollRes = await apiRequest('/api/payroll/my', { token: qaToken });
    assert(
      myPayrollRes.status === 200 &&
        Array.isArray(myPayrollRes.data?.records) &&
        myPayrollRes.data.records.length >= 1 &&
        myPayrollRes.data.records.every((r) => r.employeeId === qaEmpId),
      'Test 13: EMPLOYEE sees only their own payroll records via /api/payroll/my',
      `My records count: ${myPayrollRes.data?.records?.length}`
    );

    // TEST 14: Employee cannot access another employee's payslip
    console.log('\n--- 14. Unauthorized Payslip Access Prevention ---');
    const otherDecPayroll = await PayrollRecord.findOne({
      employeeId: otherEmpId,
      payrollMonth: '2026-12',
    });
    const crossPayslipRes = await apiRequest(`/api/payroll/${otherDecPayroll.payrollId}/payslip`, {
      token: qaToken,
    });
    const crossPdfRes = await apiRequest(`/api/payroll/${otherDecPayroll.payrollId}/pdf`, {
      token: qaToken,
    });
    assert(
      crossPayslipRes.status === 403 && crossPdfRes.status === 403,
      'Test 14: EMPLOYEE cannot access another employee’s payslip details or PDF (returns 403)',
      `Payslip status: ${crossPayslipRes.status}, PDF status: ${crossPdfRes.status}`
    );

    // TEST 15: Payroll statistics match database records
    console.log('\n--- 15. Payroll Aggregates and Statistics ---');
    const statsRes = await apiRequest('/api/payroll/stats?month=2026-12', { token: adminToken });
    const stats = statsRes.data?.stats;
    const dbRecords = await PayrollRecord.find({ payrollMonth: '2026-12' });
    const expectedGross = dbRecords.reduce((acc, r) => acc + r.grossSalary, 0);
    const expectedNet = dbRecords.reduce((acc, r) => acc + r.netSalary, 0);
    assert(
      statsRes.status === 200 &&
        stats &&
        stats.totalEmployees === dbRecords.length &&
        Math.abs(stats.totalGross - expectedGross) < 0.01 &&
        Math.abs(stats.totalNet - expectedNet) < 0.01,
      'Test 15: /api/payroll/stats returns accurate aggregates matching database records',
      `Stats gross: ${stats?.totalGross}, expected: ${expectedGross}`
    );

    // TEST 16: Mark-paid operation succeeds
    console.log('\n--- 16. Mark-Paid Operation ---');
    const markPaidRes = await apiRequest(`/api/payroll/${otherDecPayroll.payrollId}/mark-paid`, {
      method: 'PATCH',
      token: adminToken,
    });
    assert(
      markPaidRes.status === 200 &&
        markPaidRes.data?.success === true &&
        markPaidRes.data.record.paymentStatus === 'PAID',
      'Test 16: HR_ADMIN can transition pending payroll to PAID status',
      `Status: ${markPaidRes.data?.record?.paymentStatus}`
    );

    // TEST 17: Repeated mark-paid operation is rejected
    console.log('\n--- 17. Repeated Mark-Paid Prevention ---');
    const repeatPaidRes = await apiRequest(`/api/payroll/${otherDecPayroll.payrollId}/mark-paid`, {
      method: 'PATCH',
      token: adminToken,
    });
    assert(
      repeatPaidRes.status === 400 && repeatPaidRes.data?.success === false,
      'Test 17: Repeated mark-paid operation on already PAID record is rejected with 400',
      `Status: ${repeatPaidRes.status}, Message: ${repeatPaidRes.data?.message}`
    );

    // TEST 18: Payment metadata is recorded correctly
    console.log('\n--- 18. Payment Metadata Recording ---');
    const updatedOtherRecord = await PayrollRecord.findOne({ payrollId: otherDecPayroll.payrollId });
    assert(
      updatedOtherRecord &&
        updatedOtherRecord.paymentStatus === 'PAID' &&
        updatedOtherRecord.paidAt instanceof Date &&
        typeof updatedOtherRecord.disbursementDate === 'string' &&
        updatedOtherRecord.disbursementDate.length > 0,
      'Test 18: Payment metadata (paidAt timestamp, disbursementDate) is recorded accurately',
      `paidAt: ${updatedOtherRecord?.paidAt}, disbursement: ${updatedOtherRecord?.disbursementDate}`
    );

    // TEST 19: Payslip details match the payroll record
    console.log('\n--- 19. Detailed Payslip Voucher Retrieval ---');
    const ownPayslipRes = await apiRequest(`/api/payroll/${qaDecPayroll.payrollId}/payslip`, {
      token: qaToken,
    });
    const payslip = ownPayslipRes.data?.payslip;
    assert(
      ownPayslipRes.status === 200 &&
        payslip &&
        payslip.payrollId === qaDecPayroll.payrollId &&
        payslip.grossSalary === qaDecPayroll.grossSalary &&
        payslip.netSalary === qaDecPayroll.netSalary &&
        payslip.earnings?.basicSalary === qaDecPayroll.basicSalary &&
        payslip.isDemoDisclaimer.includes('DEMO SAMPLE'),
      'Test 19: Detailed payslip voucher matches payroll record components and contains disclaimer',
      `Net: ${payslip?.netSalary}, Gross: ${payslip?.grossSalary}`
    );

    // TEST 20: PDF export works and contains correct employee/payroll details
    console.log('\n--- 20. Payslip PDF Export ---');
    const pdfRes = await apiRequest(`/api/payroll/${qaDecPayroll.payrollId}/pdf`, {
      token: qaToken,
    });
    const isPdf =
      pdfRes.status === 200 &&
      pdfRes.headers.get('content-type') === 'application/pdf' &&
      pdfRes.buffer &&
      pdfRes.buffer.slice(0, 8).toString().includes('%PDF-1.4') &&
      pdfRes.buffer.toString().includes('VISARTECH');
    assert(
      isPdf,
      'Test 20: PDF export generates valid compliant PDF 1.4 document with employee details',
      `Status: ${pdfRes.status}, Content-Type: ${pdfRes.headers.get('content-type')}, Bytes: ${pdfRes.buffer?.length}`
    );

    // TEST 21: Monetary calculations handle decimal values correctly
    console.log('\n--- 21. Decimal Monetary Calculations ---');
    // Setup decimal employee
    const decimalUser = await User.create({
      employeeId: decimalEmpId,
      firstName: 'Cora',
      lastName: 'Decimals',
      email: 'cora.decimals@visartech.demo',
      passwordHash: await User.hashPassword('Pass@123'),
      role: 'EMPLOYEE',
      jobTitle: 'Financial Analyst',
      department: 'Finance',
      employmentStatus: 'Active',
      joiningDate: new Date(),
      phone: '+1 (312) 555-0155',
      address: '400 N State St',
      city: 'Chicago',
      state: 'IL',
    });

    await SalaryStructure.create({
      employeeId: decimalEmpId,
      basicSalary: 5432.55,
      housingAllowance: 800.25,
      otherAllowances: 150.1,
      bonus: 0,
      taxDeduction: 1111.45,
      otherDeductions: 222.35,
    });

    const decGenRes = await apiRequest('/api/payroll/generate', {
      method: 'POST',
      token: adminToken,
      body: { month: '2027-02' },
    });
    const decRecord = await PayrollRecord.findOne({
      employeeId: decimalEmpId,
      payrollMonth: '2027-02',
    });

    // 5432.55 + 800.25 + 150.10 = 6382.90
    // 1111.45 + 222.35 = 1333.80
    // 6382.90 - 1333.80 = 5049.10
    assert(
      decRecord !== null &&
        decRecord.grossSalary === 6382.9 &&
        decRecord.deductions === 1333.8 &&
        decRecord.netSalary === 5049.1,
      'Test 21: Monetary calculations handle decimal values without floating point errors',
      `Gross: ${decRecord?.grossSalary}, Ded: ${decRecord?.deductions}, Net: ${decRecord?.netSalary}`
    );

    // TEST 22: Clean up test records and verify existing payroll data remains intact
    console.log('\n--- 22. Isolation & Cleanup Verification ---');
    await User.deleteMany({ employeeId: { $in: [qaEmpId, otherEmpId, inactiveEmpId, decimalEmpId] } });
    await SalaryStructure.deleteMany({
      employeeId: { $in: [qaEmpId, otherEmpId, inactiveEmpId, decimalEmpId] },
    });
    await PayrollRecord.deleteMany({
      $or: [
        { employeeId: { $in: [qaEmpId, otherEmpId, inactiveEmpId, decimalEmpId] } },
        { payrollMonth: { $in: testMonths } },
      ],
    });

    const finalStructureCount = await SalaryStructure.countDocuments();
    const finalPayrollCount = await PayrollRecord.countDocuments();
    const finalSeededUsers = await User.countDocuments({
      employeeId: { $in: ['EMP-001', 'EMP-002', 'EMP-003', 'EMP-004', 'EMP-005', 'EMP-006'] },
    });

    assert(
      finalStructureCount === initialStructureCount &&
        finalPayrollCount === initialPayrollCount &&
        finalSeededUsers === 6,
      'Test 22: Test cleanup succeeded; all original seeded payroll records and salary structures remain intact',
      `Structures: ${finalStructureCount} (init ${initialStructureCount}), Payroll: ${finalPayrollCount} (init ${initialPayrollCount}), Seeded employees: ${finalSeededUsers}`
    );

  } catch (err) {
    console.error('Fatal error during Payroll Phase 6 test run:', err);
    assert(false, 'Phase 6 Execution Safety', err.message);
  } finally {
    server.close();
    await disconnectDB();

    console.log('\n====================================================');
    console.log(`Phase 6 QA Summary: Passed ${passed} / ${passed + failed}`);
    console.log('====================================================\n');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }
}

runPayrollPhase6Tests();
