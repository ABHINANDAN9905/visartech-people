/**
 * Centralized Payroll & Compensation Service for VISARTECH People
 * Single Source of Truth for Salary Structures, Monthly Payroll Generation,
 * Payslips, and Compensation Reports.
 * 
 * Architecture:
 * - Persistent demo storage via localStorage (visartech_salary_structures, visartech_payroll_records)
 * - Strict Separation of Concerns: API-ready for immediate migration to MongoDB / Express backend.
 * - Business Rules:
 *    * Gross Salary = Basic Salary + Housing Allowance + Other Allowances + Bonus
 *    * Net Salary = Gross Salary - Total Deductions (Tax + Other)
 *    * Non-negative validation on all monetary inputs (>= 0)
 *    * Duplicate prevention for same employee & month
 *    * Strict privacy: Employees can only view their own records
 * - Dispatches 'payroll-updated' window event for real-time reactivity.
 */

import { getEmployees, getEmployeeById } from './employeeService.js';
import { formatChicagoDate, getChicagoNow } from '../utils/timezone.js';
import { createNotification } from './notificationService.js';
import api from './apiClient.js';

const STORAGE_KEY_STRUCTURES = 'visartech_salary_structures';
const STORAGE_KEY_RECORDS = 'visartech_payroll_records';

// Standard demo currency formatting
export function formatCurrency(amount) {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

// -------------------------------------------------------------
// Initial Salary Structures for all 6 Canonical Employees
// -------------------------------------------------------------
export const INITIAL_SALARY_STRUCTURES = {
  'EMP-001': {
    employeeId: 'EMP-001',
    employeeName: 'Marcus Vance',
    department: 'Engineering',
    designation: 'Lead Full Stack Architect',
    basicSalary: 9200,
    housingAllowance: 1500,
    otherAllowances: 600,
    bonus: 700,
    taxDeduction: 1900,
    otherDeductions: 500, // 401(k) + Health
    bankName: 'Chase Bank Chicago',
    accountNumberMasked: '••••3819',
    updatedAt: '2026-10-01T09:00:00Z',
  },
  'EMP-002': {
    employeeId: 'EMP-002',
    employeeName: 'Elena Rostova',
    department: 'Product & Design',
    designation: 'Senior Product Designer',
    basicSalary: 7000,
    housingAllowance: 1200,
    otherAllowances: 400,
    bonus: 400,
    taxDeduction: 1400,
    otherDeductions: 400,
    bankName: 'Bank of America Illinois',
    accountNumberMasked: '••••7420',
    updatedAt: '2026-10-01T09:00:00Z',
  },
  'EMP-003': {
    employeeId: 'EMP-003',
    employeeName: 'David Chen',
    department: 'Infrastructure',
    designation: 'DevOps & Cloud Engineer',
    basicSalary: 7500,
    housingAllowance: 1200,
    otherAllowances: 500,
    bonus: 300,
    taxDeduction: 1500,
    otherDeductions: 400,
    bankName: 'Citibank Chicago Branch',
    accountNumberMasked: '••••9124',
    updatedAt: '2026-10-01T09:00:00Z',
  },
  'EMP-004': {
    employeeId: 'EMP-004',
    employeeName: 'Maya Patel',
    department: 'Engineering',
    designation: 'Frontend Software Engineer',
    basicSalary: 6500,
    housingAllowance: 1000,
    otherAllowances: 400,
    bonus: 300,
    taxDeduction: 1250,
    otherDeductions: 350,
    bankName: 'Wintrust Bank Chicago',
    accountNumberMasked: '••••5631',
    updatedAt: '2026-10-01T09:00:00Z',
  },
  'EMP-005': {
    employeeId: 'EMP-005',
    employeeName: 'Liam Novak',
    department: 'QA',
    designation: 'QA Automation Specialist',
    basicSalary: 5800,
    housingAllowance: 900,
    otherAllowances: 400,
    bonus: 200,
    taxDeduction: 1100,
    otherDeductions: 300,
    bankName: 'Fifth Third Bank Chicago',
    accountNumberMasked: '••••8029',
    updatedAt: '2026-10-01T09:00:00Z',
  },
  'EMP-006': {
    employeeId: 'EMP-006',
    employeeName: 'Jordan Lee',
    department: 'Engineering',
    designation: 'Full Stack Software Engineer',
    basicSalary: 6800,
    housingAllowance: 1100,
    otherAllowances: 500,
    bonus: 400,
    taxDeduction: 1350,
    otherDeductions: 450,
    bankName: 'PNC Bank Chicago Loop',
    accountNumberMasked: '••••4821',
    updatedAt: '2026-10-01T09:00:00Z',
  },
};

// Calculation Helper
export function calculateSalaryComponents(structure) {
  const basicSalary = Math.max(0, Number(structure.basicSalary) || 0);
  const housingAllowance = Math.max(0, Number(structure.housingAllowance) || 0);
  const otherAllowances = Math.max(0, Number(structure.otherAllowances) || 0);
  const bonus = Math.max(0, Number(structure.bonus) || 0);
  const taxDeduction = Math.max(0, Number(structure.taxDeduction) || 0);
  const otherDeductions = Math.max(0, Number(structure.otherDeductions) || 0);

  const totalAllowances = housingAllowance + otherAllowances;
  const grossSalary = basicSalary + totalAllowances + bonus;
  const totalDeductions = taxDeduction + otherDeductions;
  const netSalary = Math.max(0, grossSalary - totalDeductions);

  return {
    basicSalary,
    housingAllowance,
    otherAllowances,
    totalAllowances,
    bonus,
    grossSalary,
    taxDeduction,
    otherDeductions,
    totalDeductions,
    netSalary,
  };
}

// -------------------------------------------------------------
// Seed Initial Historical Payroll Records (Sep, Oct, Nov 2026)
// -------------------------------------------------------------
function buildSeedPayrollRecord(empId, month, status = 'PAID', payDate = '2026-10-31') {
  const struct = INITIAL_SALARY_STRUCTURES[empId];
  const calc = calculateSalaryComponents(struct);
  const monthLabels = {
    '2026-09': 'September 2026',
    '2026-10': 'October 2026',
    '2026-11': 'November 2026',
  };

  return {
    id: `PAY-${month.replace('-', '')}-${empId.replace('EMP-', '')}`,
    payrollMonth: month,
    payrollMonthLabel: monthLabels[month] || month,
    employeeId: empId,
    employeeName: struct.employeeName,
    employeeRole: struct.designation,
    department: struct.department,
    bankName: struct.bankName,
    accountNumberMasked: struct.accountNumberMasked,
    ...calc,
    paymentStatus: status, // 'PAID' | 'PENDING' | 'PROCESSING'
    paymentMethod: 'Direct Deposit (ACH)',
    disbursementDate: payDate,
    generatedAt: `${month}-25T08:00:00Z`,
    generatedBy: 'Alex Morgan (HR Administrator)',
    paidAt: status === 'PAID' ? `${payDate}T10:00:00Z` : null,
  };
}

export const INITIAL_PAYROLL_RECORDS = [
  // November 2026 (Current Cycle)
  buildSeedPayrollRecord('EMP-001', '2026-11', 'PAID', '2026-11-30'),
  buildSeedPayrollRecord('EMP-002', '2026-11', 'PENDING', '2026-11-30'), // Elena Rostova Pending
  buildSeedPayrollRecord('EMP-003', '2026-11', 'PENDING', '2026-11-30'), // David Chen Pending
  buildSeedPayrollRecord('EMP-004', '2026-11', 'PAID', '2026-11-30'),
  buildSeedPayrollRecord('EMP-005', '2026-11', 'PAID', '2026-11-30'),
  buildSeedPayrollRecord('EMP-006', '2026-11', 'PAID', '2026-11-30'), // Jordan Lee Paid

  // October 2026 (Previous Cycle - All Paid)
  buildSeedPayrollRecord('EMP-001', '2026-10', 'PAID', '2026-10-31'),
  buildSeedPayrollRecord('EMP-002', '2026-10', 'PAID', '2026-10-31'),
  buildSeedPayrollRecord('EMP-003', '2026-10', 'PAID', '2026-10-31'),
  buildSeedPayrollRecord('EMP-004', '2026-10', 'PAID', '2026-10-31'),
  buildSeedPayrollRecord('EMP-005', '2026-10', 'PAID', '2026-10-31'),
  buildSeedPayrollRecord('EMP-006', '2026-10', 'PAID', '2026-10-31'),

  // September 2026 (Quarterly Baseline - All Paid)
  buildSeedPayrollRecord('EMP-001', '2026-09', 'PAID', '2026-09-30'),
  buildSeedPayrollRecord('EMP-002', '2026-09', 'PAID', '2026-09-30'),
  buildSeedPayrollRecord('EMP-003', '2026-09', 'PAID', '2026-09-30'),
  buildSeedPayrollRecord('EMP-004', '2026-09', 'PAID', '2026-09-30'),
  buildSeedPayrollRecord('EMP-005', '2026-09', 'PAID', '2026-09-30'),
  buildSeedPayrollRecord('EMP-006', '2026-09', 'PAID', '2026-09-30'),
];

// -------------------------------------------------------------
// Storage Accessors (Simulated API Layer)
// -------------------------------------------------------------

export function getStoredSalaryStructures() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_STRUCTURES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_STRUCTURES, JSON.stringify(INITIAL_SALARY_STRUCTURES));
      return INITIAL_SALARY_STRUCTURES;
    }
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : INITIAL_SALARY_STRUCTURES;
  } catch {
    return INITIAL_SALARY_STRUCTURES;
  }
}

export function saveStoredSalaryStructures(structures) {
  try {
    localStorage.setItem(STORAGE_KEY_STRUCTURES, JSON.stringify(structures));
    window.dispatchEvent(new Event('payroll-updated'));
  } catch (err) {
    console.error('Error persisting salary structures:', err);
  }
}

export function getStoredPayrollRecords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RECORDS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(INITIAL_PAYROLL_RECORDS));
      return INITIAL_PAYROLL_RECORDS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : INITIAL_PAYROLL_RECORDS;
  } catch {
    return INITIAL_PAYROLL_RECORDS;
  }
}

export function saveStoredPayrollRecords(records) {
  try {
    localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(records));
    window.dispatchEvent(new Event('payroll-updated'));
  } catch (err) {
    console.error('Error persisting payroll records:', err);
  }
}

// -------------------------------------------------------------
// Core Business Operations
// -------------------------------------------------------------

/**
 * Get salary structure for a specific employee
 */
export function getEmployeeSalaryStructure(employeeId) {
  const all = getStoredSalaryStructures();
  if (all[employeeId]) return all[employeeId];

  // Default structure if not configured
  const emp = getEmployeeById(employeeId);
  return {
    employeeId,
    employeeName: emp?.name || 'Employee',
    department: emp?.department || 'Engineering',
    designation: emp?.jobTitle || 'Team Member',
    basicSalary: 6000,
    housingAllowance: 1000,
    otherAllowances: 400,
    bonus: 0,
    taxDeduction: 1200,
    otherDeductions: 300,
    bankName: 'Chase Bank Chicago',
    accountNumberMasked: '••••0000',
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Configure or update an employee's salary structure (HR_ADMIN only)
 */
export function configureSalaryStructure(employeeId, newStructure) {
  const fields = ['basicSalary', 'housingAllowance', 'otherAllowances', 'bonus', 'taxDeduction', 'otherDeductions'];
  for (const field of fields) {
    const val = Number(newStructure[field]);
    if (isNaN(val) || val < 0) {
      return {
        success: false,
        error: `Monetary field '${field}' must be a non-negative number ($ >= 0).`,
      };
    }
  }

  const all = getStoredSalaryStructures();
  const existing = all[employeeId] || {};
  const emp = getEmployeeById(employeeId);

  const updated = {
    ...existing,
    ...newStructure,
    employeeId,
    employeeName: emp?.name || existing.employeeName || 'Employee',
    department: emp?.department || existing.department || 'Engineering',
    designation: emp?.jobTitle || existing.designation || 'Team Member',
    basicSalary: Number(newStructure.basicSalary),
    housingAllowance: Number(newStructure.housingAllowance),
    otherAllowances: Number(newStructure.otherAllowances),
    bonus: Number(newStructure.bonus),
    taxDeduction: Number(newStructure.taxDeduction),
    otherDeductions: Number(newStructure.otherDeductions),
    bankName: newStructure.bankName || existing.bankName || 'Chase Bank Chicago',
    accountNumberMasked: newStructure.accountNumberMasked || existing.accountNumberMasked || '••••4821',
    updatedAt: new Date().toISOString(),
  };

  all[employeeId] = updated;
  saveStoredSalaryStructures(all);

  return {
    success: true,
    structure: updated,
    message: `Salary structure configured successfully for ${updated.employeeName}.`,
  };
}

/**
 * Generate monthly payroll for all (or selected) employees (HR_ADMIN only)
 * Strictly prevents duplicate payroll generation for the same employee & month!
 */
export function generateMonthlyPayroll(month, employeeIds = null, generatedBy = 'Alex Morgan (HR Administrator)') {
  if (!month || !month.match(/^\d{4}-\d{2}$/)) {
    return { success: false, error: 'Invalid payroll month format. Expected YYYY-MM (e.g. 2026-11).' };
  }

  const structures = getStoredSalaryStructures();
  const existingRecords = getStoredPayrollRecords();
  const employees = getEmployees();

  const targetIds = employeeIds && employeeIds.length > 0
    ? employeeIds
    : employees.map((e) => e.id);

  const monthLabels = {
    '2026-09': 'September 2026',
    '2026-10': 'October 2026',
    '2026-11': 'November 2026',
    '2026-12': 'December 2026',
  };
  const [yearStr, mStr] = month.split('-');
  const monthLabel = monthLabels[month] || `${new Date(Number(yearStr), Number(mStr) - 1, 1).toLocaleString('en-US', { month: 'long' })} ${yearStr}`;

  // Last day of target month for disbursement date
  const lastDay = new Date(Number(yearStr), Number(mStr), 0).getDate();
  const disbursementDate = `${month}-${String(lastDay).padStart(2, '0')}`;

  const createdRecords = [];
  const skippedDuplicates = [];

  for (const empId of targetIds) {
    // Check duplicate
    const alreadyExists = existingRecords.some(
      (r) => r.employeeId === empId && r.payrollMonth === month
    );

    if (alreadyExists) {
      skippedDuplicates.push(empId);
      continue;
    }

    const struct = structures[empId] || getEmployeeSalaryStructure(empId);
    const calc = calculateSalaryComponents(struct);

    const newRecord = {
      id: `PAY-${month.replace('-', '')}-${empId.replace('EMP-', '')}`,
      payrollMonth: month,
      payrollMonthLabel: monthLabel,
      employeeId: empId,
      employeeName: struct.employeeName,
      employeeRole: struct.designation,
      department: struct.department,
      bankName: struct.bankName,
      accountNumberMasked: struct.accountNumberMasked,
      ...calc,
      paymentStatus: 'PENDING',
      paymentMethod: 'Direct Deposit (ACH)',
      disbursementDate,
      generatedAt: new Date().toISOString(),
      generatedBy,
      paidAt: null,
    };

    createdRecords.push(newRecord);
  }

  if (createdRecords.length === 0) {
    return {
      success: false,
      error: `All ${targetIds.length} employee(s) already have generated payroll records for ${monthLabel}. Duplicate generation prevented.`,
      skippedDuplicates,
    };
  }

  const updatedRecords = [...createdRecords, ...existingRecords];
  saveStoredPayrollRecords(updatedRecords);

  // Dispatch notifications for generated payroll records
  createdRecords.forEach((rec) => {
    createNotification({
      recipientId: rec.employeeId,
      recipientRole: 'EMPLOYEE',
      type: 'payroll_published',
      title: `Payroll Record Generated: ${monthLabel}`,
      message: `Your compensation breakdown for ${monthLabel} has been processed.`,
      link: '/payroll',
      eventId: `payroll_gen_${month}_${rec.employeeId}`
    });
  });

  return {
    success: true,
    createdCount: createdRecords.length,
    skippedCount: skippedDuplicates.length,
    message: `Successfully generated ${createdRecords.length} payroll record(s) for ${monthLabel}.${
      skippedDuplicates.length > 0 ? ` (${skippedDuplicates.length} duplicate record(s) skipped).` : ''
    }`,
  };
}

/**
 * Update payment status for a payroll record (PAID <-> PENDING)
 */
export function updatePaymentStatus(payrollId, newStatus, userRole = 'HR_ADMIN') {
  if (userRole !== 'HR_ADMIN') {
    return { success: false, error: 'Unauthorized. Only HR Administrators can modify disbursement status.' };
  }

  const records = getStoredPayrollRecords();
  const index = records.findIndex((r) => r.id === payrollId);

  if (index === -1) {
    return { success: false, error: 'Payroll record not found.' };
  }

  const target = records[index];
  const paidAt = newStatus === 'PAID' ? new Date().toISOString() : null;

  records[index] = {
    ...target,
    paymentStatus: newStatus,
    paidAt,
  };

  saveStoredPayrollRecords(records);

  // If marked as PAID, notify employee
  if (newStatus === 'PAID') {
    createNotification({
      recipientId: target.employeeId,
      recipientRole: 'EMPLOYEE',
      type: 'payroll_published',
      title: `Salary Disbursed: ${target.payrollMonthLabel || target.payrollMonth}`,
      message: `Your Net Salary of ${formatCurrency(target.netSalary)} has been disbursed via Direct Deposit.`,
      link: '/payroll',
      eventId: `payroll_paid_${target.id}`
    });
  }

  return {
    success: true,
    record: records[index],
    message: `Payment status for ${target.employeeName} (${target.id}) updated to ${newStatus}.`,
  };
}

/**
 * Aggregated KPI metrics for HR Admin Dashboard
 */
export function getPayrollKPIs(month = '2026-11') {
  const records = getStoredPayrollRecords();
  const filtered = month
    ? records.filter((r) => r.payrollMonth === month)
    : records;

  const totalEmployees = new Set(filtered.map((r) => r.employeeId)).size;
  const totalGross = filtered.reduce((acc, r) => acc + (r.grossSalary || 0), 0);
  const totalDeductions = filtered.reduce((acc, r) => acc + (r.totalDeductions || 0), 0);
  const totalNet = filtered.reduce((acc, r) => acc + (r.netSalary || 0), 0);

  const paidPayroll = filtered
    .filter((r) => r.paymentStatus === 'PAID')
    .reduce((acc, r) => acc + (r.netSalary || 0), 0);

  const pendingPayroll = filtered
    .filter((r) => r.paymentStatus === 'PENDING' || r.paymentStatus === 'PROCESSING')
    .reduce((acc, r) => acc + (r.netSalary || 0), 0);

  const paidCount = filtered.filter((r) => r.paymentStatus === 'PAID').length;
  const pendingCount = filtered.filter((r) => r.paymentStatus === 'PENDING').length;

  return {
    totalEmployees,
    totalGross,
    totalDeductions,
    totalNet,
    paidPayroll,
    pendingPayroll,
    paidCount,
    pendingCount,
    recordCount: filtered.length,
  };
}

/**
 * Report Data for Recharts Visualizations
 */
export function getPayrollReportData() {
  const records = getStoredPayrollRecords();
  const months = ['2026-09', '2026-10', '2026-11'];

  // Monthly Trend
  const monthlyTrend = months.map((m) => {
    const mRecords = records.filter((r) => r.payrollMonth === m);
    const gross = mRecords.reduce((acc, r) => acc + (r.grossSalary || 0), 0);
    const net = mRecords.reduce((acc, r) => acc + (r.netSalary || 0), 0);
    const deductions = mRecords.reduce((acc, r) => acc + (r.totalDeductions || 0), 0);
    const label = m === '2026-09' ? 'Sep 26' : m === '2026-10' ? 'Oct 26' : 'Nov 26';
    return { month: label, gross, net, deductions };
  });

  // Department-wise distribution for current month (Nov 2026)
  const novRecords = records.filter((r) => r.payrollMonth === '2026-11');
  const depts = ['Engineering', 'Product & Design', 'Infrastructure', 'QA'];
  const departmentDistribution = depts.map((dept) => {
    const deptRecords = novRecords.filter((r) => r.department === dept);
    const net = deptRecords.reduce((acc, r) => acc + (r.netSalary || 0), 0);
    const gross = deptRecords.reduce((acc, r) => acc + (r.grossSalary || 0), 0);
    return { department: dept, net, gross, count: deptRecords.length };
  });

  // Paid vs Pending Donut for Nov 2026
  const paidNet = novRecords.filter((r) => r.paymentStatus === 'PAID').reduce((acc, r) => acc + (r.netSalary || 0), 0);
  const pendingNet = novRecords.filter((r) => r.paymentStatus !== 'PAID').reduce((acc, r) => acc + (r.netSalary || 0), 0);
  const statusAllocation = [
    { name: 'Disbursed (Paid)', value: paidNet, color: '#16A36A' },
    { name: 'Pending Disbursement', value: pendingNet, color: '#E9A23B' },
  ];

  // Component Breakdown for Nov 2026
  const totalBasic = novRecords.reduce((acc, r) => acc + (r.basicSalary || 0), 0);
  const totalHousing = novRecords.reduce((acc, r) => acc + (r.housingAllowance || 0), 0);
  const totalOtherAllowances = novRecords.reduce((acc, r) => acc + (r.otherAllowances || 0), 0);
  const totalBonus = novRecords.reduce((acc, r) => acc + (r.bonus || 0), 0);
  const totalTax = novRecords.reduce((acc, r) => acc + (r.taxDeduction || 0), 0);
  const totalOtherDed = novRecords.reduce((acc, r) => acc + (r.otherDeductions || 0), 0);

  const componentBreakdown = [
    { component: 'Basic Pay', amount: totalBasic, color: '#356AE6' },
    { component: 'Housing', amount: totalHousing, color: '#60A5FA' },
    { component: 'Other Allowances', amount: totalOtherAllowances, color: '#93C5FD' },
    { component: 'Bonus', amount: totalBonus, color: '#101B35' },
    { component: 'Tax Withholding', amount: totalTax, color: '#DC5353' },
    { component: 'Other Deductions', amount: totalOtherDed, color: '#F87171' },
  ];

  return {
    monthlyTrend,
    departmentDistribution,
    statusAllocation,
    componentBreakdown,
  };
}

/**
 * Filter payroll records for a specific employee (EMPLOYEE portal query)
 */
export function getEmployeePayrollHistory(employeeId) {
  const records = getStoredPayrollRecords();
  return records
    .filter((r) => r.employeeId === employeeId)
    .sort((a, b) => b.payrollMonth.localeCompare(a.payrollMonth));
}

/**
 * Fetch payroll records from live MongoDB Atlas backend API
 */
export async function fetchPayrollFromBackend(month = null) {
  try {
    const endpoint = month ? `/payroll?month=${month}` : '/payroll';
    const res = await api.get(endpoint);

    if (res.success && Array.isArray(res.records)) {
      const employees = getEmployees();
      const mapped = res.records.map((r) => {
        const emp = employees.find((e) => e.id === r.employeeId) || {};
        return {
          id: r.payrollId || r._id,
          payrollId: r.payrollId,
          payrollMonth: r.payrollMonth,
          employeeId: r.employeeId,
          employeeName: emp.name || r.employeeId,
          department: emp.department || 'Engineering',
          jobTitle: emp.jobTitle || 'Team Member',
          basicSalary: r.basicSalary,
          housingAllowance: Math.round(r.allowances * 0.6) || 0,
          otherAllowances: Math.round(r.allowances * 0.2) || 0,
          bonus: Math.round(r.allowances * 0.2) || 0,
          taxDeduction: Math.round(r.deductions * 0.8) || 0,
          otherDeductions: Math.round(r.deductions * 0.2) || 0,
          grossSalary: r.grossSalary,
          totalDeductions: r.deductions,
          netSalary: r.netSalary,
          paymentStatus: r.paymentStatus,
          paymentDate: r.disbursementDate || `${r.payrollMonth}-30`,
          paidAt: r.paidAt,
          bankName: 'JPMorgan Chase (Demo)',
          accountNumber: '•••• •••• 6192',
        };
      });

      if (mapped.length > 0) {
        saveStoredPayrollRecords(mapped);
        window.dispatchEvent(new Event('payroll-updated'));
        return mapped;
      }
    }
  } catch (err) {
    console.warn('Backend payroll fetch error, using local fallback:', err);
  }
  return getStoredPayrollRecords();
}

/**
 * Process payroll payment on live backend API with fallback
 */
export async function processPayrollPaymentBackend(id) {
  try {
    const res = await api.patch(`/payroll/${id}/mark-paid`, {});
    if (res.success && res.record) {
      await fetchPayrollFromBackend();
      return { success: true, record: res.record, message: res.message || `Disbursement completed.` };
    }
  } catch (err) {
    console.warn('Backend payroll process error, falling back locally:', err);
  }
  return markPayrollPaid(id);
}

/**
 * Fetch employee salary structures from live backend (HR_ADMIN only)
 */
export async function fetchSalaryStructuresFromBackend(params = {}) {
  try {
    const query = new URLSearchParams(params).toString();
    const endpoint = query ? `/payroll/salary-structures?${query}` : '/payroll/salary-structures';
    const res = await api.get(endpoint);
    if (res.success && Array.isArray(res.structures)) {
      const structMap = {};
      res.structures.forEach((s) => {
        structMap[s.employeeId] = s;
      });
      saveStoredSalaryStructures(structMap);
      window.dispatchEvent(new Event('payroll-updated'));
      return res.structures;
    }
  } catch (err) {
    console.warn('Backend salary structures fetch error, falling back locally:', err);
  }
  return Object.values(getStoredSalaryStructures());
}

/**
 * Fetch individual salary structure from live backend
 */
export async function fetchEmployeeSalaryStructureFromBackend(employeeId) {
  try {
    const res = await api.get(`/payroll/salary-structures/${employeeId}`);
    if (res.success && res.structure) {
      return res.structure;
    }
  } catch (err) {
    console.warn('Backend employee salary structure fetch error, falling back locally:', err);
  }
  return getEmployeeSalaryStructure(employeeId);
}

/**
 * Configure / Create or Update Salary Structure on backend
 */
export async function configureSalaryStructureBackend(data) {
  try {
    const empId = data.employeeId;
    let res;
    // Check if structure exists locally or attempt PUT then POST
    try {
      res = await api.put(`/payroll/salary-structures/${empId}`, data);
    } catch (putErr) {
      res = await api.post('/payroll/salary-structures', data);
    }
    if (res.success && res.structure) {
      await fetchSalaryStructuresFromBackend();
      return { success: true, structure: res.structure, message: res.message };
    }
  } catch (err) {
    console.warn('Backend configure structure error, falling back locally:', err);
  }
  return configureSalaryStructure(data);
}

/**
 * Generate monthly payroll on backend (HR_ADMIN only)
 */
export async function generateMonthlyPayrollBackend(month) {
  try {
    const res = await api.post('/payroll/generate', { month });
    if (res.success) {
      await fetchPayrollFromBackend(month);
      return {
        success: true,
        generatedCount: res.generatedCount,
        skippedCount: res.skippedCount,
        message: res.message,
        records: res.generated,
      };
    }
  } catch (err) {
    console.warn('Backend payroll generation error, falling back locally:', err);
  }
  return generateMonthlyPayroll(month);
}

/**
 * Fetch personal payroll records for logged-in employee
 */
export async function fetchMyPayrollFromBackend(month = null) {
  try {
    const endpoint = month ? `/payroll/my?month=${month}` : '/payroll/my';
    const res = await api.get(endpoint);
    if (res.success && Array.isArray(res.records)) {
      return res.records;
    }
  } catch (err) {
    console.warn('Backend personal payroll fetch error:', err);
  }
  return [];
}

/**
 * Fetch organizational payroll statistics from backend
 */
export async function fetchPayrollStatsFromBackend(month = null) {
  try {
    const endpoint = month ? `/payroll/stats?month=${month}` : '/payroll/stats';
    const res = await api.get(endpoint);
    if (res.success && res.metrics) {
      return res.metrics;
    }
  } catch (err) {
    console.warn('Backend payroll stats fetch error:', err);
  }
  return getPayrollKPIs(month);
}

/**
 * Fetch official digital payslip voucher from backend
 */
export async function fetchPayslipFromBackend(id) {
  try {
    const res = await api.get(`/payroll/${id}/payslip`);
    if (res.success && res.payslip) {
      return res.payslip;
    }
  } catch (err) {
    console.warn('Backend payslip fetch error:', err);
  }
  return null;
}

