import PayrollRecord from '../models/PayrollRecord.js';
import SalaryStructure from '../models/SalaryStructure.js';
import User from '../models/User.js';

/**
 * Currency rounding helper: avoids floating-point precision issues
 */
function round2(num) {
  return Math.round((Number(num) + Number.EPSILON) * 100) / 100;
}

/**
 * Chicago business date helper
 */
function getTodayChicagoDate() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
}

/**
 * Generates compliant PDF 1.4 binary buffer in pure Node.js
 */
function buildPayslipPdfBuffer(payslip) {
  const lines = [
    'VISARTECH People - Official Compensation Voucher (Demo)',
    '------------------------------------------------------------',
    `Voucher Reference: ${payslip.payrollId}`,
    `Payroll Month:     ${payslip.payrollMonth}`,
    `Disbursement Date: ${payslip.disbursementDate || 'N/A'}`,
    `Payment Status:    ${payslip.paymentStatus}`,
    '',
    `Employee ID:       ${payslip.employeeId}`,
    `Employee Name:     ${payslip.employeeName}`,
    `Department:        ${payslip.department}`,
    `Designation:       ${payslip.designation}`,
    '',
    'COMPENSATION BREAKDOWN:',
    `  Basic Salary:       $${payslip.earnings.basicSalary.toFixed(2)}`,
    `  Housing Allowance:  $${payslip.earnings.housingAllowance.toFixed(2)}`,
    `  Other Allowances:   $${payslip.earnings.otherAllowances.toFixed(2)}`,
    `  Performance Bonus:  $${payslip.earnings.bonus.toFixed(2)}`,
    `Gross Salary:         $${payslip.grossSalary.toFixed(2)}`,
    '',
    'DEDUCTIONS:',
    `  Tax Withholding:    $${payslip.deductions.taxDeduction.toFixed(2)}`,
    `  Other Deductions:   $${payslip.deductions.otherDeductions.toFixed(2)}`,
    `Total Deductions:     $${payslip.totalDeductions.toFixed(2)}`,
    '------------------------------------------------------------',
    `NET SALARY PAYABLE:   $${payslip.netSalary.toFixed(2)}`,
    '------------------------------------------------------------',
    '',
    `Disbursement Bank:    ${payslip.bankName}`,
    `Account Mask:         ${payslip.accountNumberMasked}`,
    '',
    'DISCLAIMER: Non-statutory demo compensation voucher.',
    'Illustrative calculation only. Not an official tax return.',
  ];

  let stream = 'BT /F1 11 Tf 50 720 Td 15 TL\n';
  for (const line of lines) {
    const escaped = line.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    stream += `(${escaped}) '\n`;
  }
  stream += 'ET';
  const streamLen = Buffer.byteLength(stream, 'utf8');

  let pdf = '%PDF-1.4\n';
  const offsets = [];

  function addObj(str) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += str + '\n';
  }

  addObj('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj');
  addObj('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj');
  addObj('3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj');
  addObj('4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj');
  addObj(`5 0 obj\n<< /Length ${streamLen} >>\nstream\n${stream}\nendstream\nendobj`);

  const startXref = Buffer.byteLength(pdf, 'utf8');
  pdf += 'xref\n0 6\n0000000000 65535 f \n';
  for (const off of offsets) {
    pdf += off.toString().padStart(10, '0') + ' 00000 n \n';
  }
  pdf += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`;
  return Buffer.from(pdf, 'utf8');
}

// =========================================================================
// 1. SALARY STRUCTURE CONTROLLERS
// =========================================================================

/**
 * @route   GET /api/payroll/salary-structures
 * @desc    HR_ADMIN lists employee salary structures with filters & pagination
 * @access  Private (HR_ADMIN only)
 */
export async function getSalaryStructures(req, res) {
  try {
    const { employeeId, department, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (employeeId && employeeId.trim()) {
      filter.employeeId = employeeId.trim().toUpperCase();
    }

    if (department && department !== 'ALL' && department.trim()) {
      const deptUsers = await User.find({ department: department.trim() }).select('employeeId');
      const deptEmpIds = deptUsers.map((u) => u.employeeId);
      if (filter.employeeId) {
        if (!deptEmpIds.includes(filter.employeeId)) {
          return res.status(200).json({
            success: true,
            count: 0,
            totalCount: 0,
            page: Number(page),
            totalPages: 0,
            structures: [],
          });
        }
      } else {
        filter.employeeId = { $in: deptEmpIds };
      }
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 20);
    const skip = (pageNum - 1) * limitNum;

    const totalCount = await SalaryStructure.countDocuments(filter);
    const rawStructures = await SalaryStructure.find(filter)
      .sort({ employeeId: 1 })
      .skip(skip)
      .limit(limitNum);

    const empIds = rawStructures.map((s) => s.employeeId);
    const users = await User.find({ employeeId: { $in: empIds } }).select(
      'employeeId firstName lastName department jobTitle email'
    );
    const userMap = new Map(users.map((u) => [u.employeeId, u]));

    const structures = rawStructures.map((s) => {
      const emp = userMap.get(s.employeeId);
      return {
        ...s.toJSON(),
        employeeName: emp ? `${emp.firstName} ${emp.lastName}` : s.employeeId,
        department: emp ? emp.department : 'Engineering',
        designation: emp ? emp.jobTitle : 'Team Member',
      };
    });

    return res.status(200).json({
      success: true,
      count: structures.length,
      totalCount,
      page: pageNum,
      totalPages: Math.ceil(totalCount / limitNum),
      structures,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve salary structures.',
      error: err.message,
    });
  }
}

/**
 * @route   GET /api/payroll/salary-structures/:employeeId
 * @desc    Get an employee's salary structure (HR_ADMIN or own EMPLOYEE)
 * @access  Private
 */
export async function getSalaryStructureByEmployeeId(req, res) {
  try {
    const cleanEmpId = req.params.employeeId.trim().toUpperCase();

    // Authorization check: HR_ADMIN or self
    if (req.user.role !== 'HR_ADMIN' && req.user.employeeId !== cleanEmpId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You can only view your own salary structure.',
      });
    }

    const structure = await SalaryStructure.findOne({ employeeId: cleanEmpId });
    if (!structure) {
      return res.status(404).json({
        success: false,
        message: `Salary structure not found for employee '${cleanEmpId}'.`,
      });
    }

    const emp = await User.findOne({ employeeId: cleanEmpId }).select(
      'employeeId firstName lastName department jobTitle email'
    );

    return res.status(200).json({
      success: true,
      structure: {
        ...structure.toJSON(),
        employeeName: emp ? `${emp.firstName} ${emp.lastName}` : cleanEmpId,
        department: emp ? emp.department : '',
        designation: emp ? emp.jobTitle : '',
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve salary structure.',
      error: err.message,
    });
  }
}

/**
 * @route   POST /api/payroll/salary-structures
 * @desc    Create a new salary structure (HR_ADMIN only)
 * @access  Private (HR_ADMIN only)
 */
export async function createSalaryStructure(req, res) {
  try {
    const {
      employeeId,
      basicSalary,
      housingAllowance = 0,
      otherAllowances = 0,
      bonus = 0,
      taxDeduction = 0,
      otherDeductions = 0,
      bankName = 'JPMorgan Chase (Demo Direct Deposit)',
      accountNumberMasked = '•••• •••• 6192',
    } = req.body || {};

    if (!employeeId || basicSalary === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID and basic salary are required.',
      });
    }

    const cleanEmpId = employeeId.trim().toUpperCase();

    // 1. Validate employee existence and active status
    const emp = await User.findOne({ employeeId: cleanEmpId, employmentStatus: 'Active' });
    if (!emp) {
      return res.status(400).json({
        success: false,
        message: `Employee '${cleanEmpId}' does not exist or is not actively employed.`,
      });
    }

    // 2. Prevent duplicate salary structures
    const existing = await SalaryStructure.findOne({ employeeId: cleanEmpId });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Salary structure already exists for employee '${cleanEmpId}'. Use update instead.`,
      });
    }

    // 3. Monetary non-negative validation
    const components = [
      { name: 'basicSalary', val: basicSalary },
      { name: 'housingAllowance', val: housingAllowance },
      { name: 'otherAllowances', val: otherAllowances },
      { name: 'bonus', val: bonus },
      { name: 'taxDeduction', val: taxDeduction },
      { name: 'otherDeductions', val: otherDeductions },
    ];

    for (const c of components) {
      const num = Number(c.val);
      if (isNaN(num) || num < 0) {
        return res.status(400).json({
          success: false,
          message: `Monetary component '${c.name}' must be a non-negative number. Received: ${c.val}`,
        });
      }
    }

    const basic = round2(basicSalary);
    const housing = round2(housingAllowance);
    const other = round2(otherAllowances);
    const bon = round2(bonus);
    const tax = round2(taxDeduction);
    const otherDed = round2(otherDeductions);

    const gross = round2(basic + housing + other + bon);
    const deductions = round2(tax + otherDed);
    const net = round2(gross - deductions);

    if (net < 0) {
      return res.status(400).json({
        success: false,
        message: `Calculated net salary ($${net.toFixed(2)}) cannot be negative. Deductions exceed gross earnings.`,
      });
    }

    const newStructure = await SalaryStructure.create({
      employeeId: cleanEmpId,
      user: emp._id,
      basicSalary: basic,
      housingAllowance: housing,
      otherAllowances: other,
      bonus: bon,
      taxDeduction: tax,
      otherDeductions: otherDed,
      bankName: bankName.trim(),
      accountNumberMasked: accountNumberMasked.trim(),
    });

    return res.status(201).json({
      success: true,
      message: 'Salary structure created successfully.',
      structure: {
        ...newStructure.toJSON(),
        employeeName: `${emp.firstName} ${emp.lastName}`,
        department: emp.department,
        designation: emp.jobTitle,
      },
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: 'Failed to create salary structure.',
      error: err.message,
    });
  }
}

/**
 * @route   PUT /api/payroll/salary-structures/:employeeId
 * @desc    Update an employee's salary structure (HR_ADMIN only)
 * @access  Private (HR_ADMIN only)
 */
export async function updateSalaryStructure(req, res) {
  try {
    const cleanEmpId = req.params.employeeId.trim().toUpperCase();

    const structure = await SalaryStructure.findOne({ employeeId: cleanEmpId });
    if (!structure) {
      return res.status(404).json({
        success: false,
        message: `Salary structure not found for employee '${cleanEmpId}'.`,
      });
    }

    const fields = [
      'basicSalary',
      'housingAllowance',
      'otherAllowances',
      'bonus',
      'taxDeduction',
      'otherDeductions',
    ];

    for (const f of fields) {
      if (req.body[f] !== undefined) {
        const num = Number(req.body[f]);
        if (isNaN(num) || num < 0) {
          return res.status(400).json({
            success: false,
            message: `Monetary component '${f}' must be a non-negative number. Received: ${req.body[f]}`,
          });
        }
        structure[f] = round2(num);
      }
    }

    if (req.body.bankName) structure.bankName = req.body.bankName.trim();
    if (req.body.accountNumberMasked) structure.accountNumberMasked = req.body.accountNumberMasked.trim();

    // Verify resulting net salary
    const gross = round2(
      (structure.basicSalary || 0) +
        (structure.housingAllowance || 0) +
        (structure.otherAllowances || 0) +
        (structure.bonus || 0)
    );
    const deductions = round2((structure.taxDeduction || 0) + (structure.otherDeductions || 0));
    const net = round2(gross - deductions);

    if (net < 0) {
      return res.status(400).json({
        success: false,
        message: `Calculated net salary ($${net.toFixed(2)}) cannot be negative. Deductions exceed gross earnings.`,
      });
    }

    await structure.save();

    const emp = await User.findOne({ employeeId: cleanEmpId }).select(
      'employeeId firstName lastName department jobTitle'
    );

    return res.status(200).json({
      success: true,
      message: 'Salary structure updated successfully.',
      structure: {
        ...structure.toJSON(),
        employeeName: emp ? `${emp.firstName} ${emp.lastName}` : cleanEmpId,
        department: emp ? emp.department : '',
        designation: emp ? emp.jobTitle : '',
      },
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      message: 'Failed to update salary structure.',
      error: err.message,
    });
  }
}

// =========================================================================
// 2. PAYROLL GENERATION CONTROLLER
// =========================================================================

/**
 * @route   POST /api/payroll/generate
 * @desc    Generate monthly payroll for active employees using salary structures (HR_ADMIN only)
 * @access  Private (HR_ADMIN only)
 */
export async function generatePayroll(req, res) {
  try {
    const { month } = req.body || {};

    if (!month || !/^\d{4}-\d{2}$/.test(month.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Valid payroll month in YYYY-MM format is required (e.g. 2026-12).',
      });
    }

    const cleanMonth = month.trim();

    // 1. Fetch only actively employed staff
    const activeEmployees = await User.find({ employmentStatus: 'Active' }).select(
      'employeeId firstName lastName department jobTitle'
    );
    const activeEmpIds = activeEmployees.map((e) => e.employeeId);

    // 2. Fetch corresponding salary structures
    const structures = await SalaryStructure.find({ employeeId: { $in: activeEmpIds } });
    const structureMap = new Map(structures.map((s) => [s.employeeId, s]));

    const generated = [];
    const skipped = [];

    for (const emp of activeEmployees) {
      const struct = structureMap.get(emp.employeeId);

      if (!struct) {
        skipped.push({
          employeeId: emp.employeeId,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          reason: 'No salary structure configured',
        });
        continue;
      }

      // Check if record already exists for this employee and month
      const existing = await PayrollRecord.findOne({
        employeeId: emp.employeeId,
        payrollMonth: cleanMonth,
      });

      if (existing) {
        if (existing.paymentStatus === 'PAID') {
          skipped.push({
            employeeId: emp.employeeId,
            employeeName: `${emp.firstName} ${emp.lastName}`,
            reason: 'Already paid (overwriting prohibited)',
            payrollId: existing.payrollId,
          });
        } else {
          skipped.push({
            employeeId: emp.employeeId,
            employeeName: `${emp.firstName} ${emp.lastName}`,
            reason: 'Already generated for this cycle (pending disbursement)',
            payrollId: existing.payrollId,
          });
        }
        continue;
      }

      // Calculate components with 2 decimal place precision
      const basicSalary = round2(struct.basicSalary);
      const allowances = round2(
        (struct.housingAllowance || 0) + (struct.otherAllowances || 0) + (struct.bonus || 0)
      );
      const grossSalary = round2(basicSalary + allowances);
      const deductions = round2((struct.taxDeduction || 0) + (struct.otherDeductions || 0));
      const netSalary = round2(grossSalary - deductions);

      if (netSalary < 0) {
        skipped.push({
          employeeId: emp.employeeId,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          reason: 'Calculated net salary below zero',
        });
        continue;
      }

      const payrollId = `PAY-${cleanMonth.replace('-', '')}-${emp.employeeId.replace('EMP-', '')}`;

      const newRecord = await PayrollRecord.create({
        payrollId,
        payrollMonth: cleanMonth,
        employeeId: emp.employeeId,
        user: emp._id,
        basicSalary,
        allowances,
        grossSalary,
        deductions,
        netSalary,
        paymentStatus: 'PENDING',
        disbursementDate: `${cleanMonth}-30`,
        paidAt: null,
      });

      generated.push({
        payrollId: newRecord.payrollId,
        employeeId: emp.employeeId,
        employeeName: `${emp.firstName} ${emp.lastName}`,
        department: emp.department,
        grossSalary,
        deductions,
        netSalary,
        paymentStatus: 'PENDING',
      });
    }

    const totalGross = round2(generated.reduce((acc, r) => acc + r.grossSalary, 0));
    const totalDeductions = round2(generated.reduce((acc, r) => acc + r.deductions, 0));
    const totalNet = round2(generated.reduce((acc, r) => acc + r.netSalary, 0));

    const statusCode = generated.length > 0 ? 201 : 200;

    return res.status(statusCode).json({
      success: true,
      message: `Payroll generation completed for ${cleanMonth}. Generated: ${generated.length}, Skipped: ${skipped.length}.`,
      month: cleanMonth,
      generatedCount: generated.length,
      skippedCount: skipped.length,
      generated,
      skipped,
      summary: {
        totalGross,
        totalDeductions,
        totalNet,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to generate payroll.',
      error: err.message,
    });
  }
}

// =========================================================================
// 3. PAYROLL RECORDS & STATS CONTROLLERS
// =========================================================================

/**
 * @route   GET /api/payroll
 * @desc    HR_ADMIN lists organizational payroll records with filters and pagination
 * @access  Private (HR_ADMIN only)
 */
export async function getPayroll(req, res) {
  try {
    const {
      month,
      employeeId,
      department,
      paymentStatus,
      search,
      page = 1,
      limit = 20,
    } = req.query;

    const filter = {};

    if (month && month.trim()) {
      filter.payrollMonth = month.trim();
    }

    if (employeeId && employeeId.trim()) {
      filter.employeeId = employeeId.trim().toUpperCase();
    }

    if (paymentStatus && ['PENDING', 'PAID'].includes(paymentStatus.trim().toUpperCase())) {
      filter.paymentStatus = paymentStatus.trim().toUpperCase();
    }

    if (department && department !== 'ALL' && department.trim()) {
      const deptUsers = await User.find({ department: department.trim() }).select('employeeId');
      const deptEmpIds = deptUsers.map((u) => u.employeeId);
      if (filter.employeeId) {
        if (!deptEmpIds.includes(filter.employeeId)) {
          return res.status(200).json({
            success: true,
            count: 0,
            totalCount: 0,
            page: Number(page),
            totalPages: 0,
            records: [],
          });
        }
      } else {
        filter.employeeId = { $in: deptEmpIds };
      }
    }

    if (search && search.trim()) {
      const term = search.trim();
      const matchedUsers = await User.find({
        $or: [
          { firstName: { $regex: term, $options: 'i' } },
          { lastName: { $regex: term, $options: 'i' } },
          { employeeId: { $regex: term, $options: 'i' } },
        ],
      }).select('employeeId');
      const matchedIds = matchedUsers.map((u) => u.employeeId);

      filter.$or = [
        { payrollId: { $regex: term, $options: 'i' } },
        { employeeId: { $in: matchedIds } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 20);
    const skip = (pageNum - 1) * limitNum;

    const totalCount = await PayrollRecord.countDocuments(filter);
    const rawRecords = await PayrollRecord.find(filter)
      .sort({ payrollMonth: -1, employeeId: 1 })
      .skip(skip)
      .limit(limitNum);

    const empIds = rawRecords.map((r) => r.employeeId);
    const users = await User.find({ employeeId: { $in: empIds } }).select(
      'employeeId firstName lastName department jobTitle'
    );
    const userMap = new Map(users.map((u) => [u.employeeId, u]));

    const records = rawRecords.map((r) => {
      const emp = userMap.get(r.employeeId);
      return {
        ...r.toJSON(),
        employeeName: emp ? `${emp.firstName} ${emp.lastName}` : r.employeeId,
        department: emp ? emp.department : 'Engineering',
        designation: emp ? emp.jobTitle : 'Team Member',
      };
    });

    return res.status(200).json({
      success: true,
      count: records.length,
      totalCount,
      page: pageNum,
      totalPages: Math.ceil(totalCount / limitNum),
      records,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve payroll records.',
      error: err.message,
    });
  }
}

/**
 * @route   GET /api/payroll/my
 * @desc    Authenticated employee views their own payroll records
 * @access  Private (EMPLOYEE & HR_ADMIN self)
 */
export async function getMyPayroll(req, res) {
  try {
    const { month, page = 1, limit = 20 } = req.query;
    const filter = { employeeId: req.user.employeeId };

    if (month && month.trim()) {
      filter.payrollMonth = month.trim();
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 20);
    const skip = (pageNum - 1) * limitNum;

    const totalCount = await PayrollRecord.countDocuments(filter);
    const rawRecords = await PayrollRecord.find(filter)
      .sort({ payrollMonth: -1 })
      .skip(skip)
      .limit(limitNum);

    const records = rawRecords.map((r) => ({
      ...r.toJSON(),
      employeeName: `${req.user.firstName} ${req.user.lastName}`,
      department: req.user.department,
      designation: req.user.jobTitle,
    }));

    return res.status(200).json({
      success: true,
      count: records.length,
      totalCount,
      page: pageNum,
      totalPages: Math.ceil(totalCount / limitNum),
      records,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve personal payroll records.',
      error: err.message,
    });
  }
}

/**
 * @route   GET /api/payroll/stats
 * @desc    HR_ADMIN views organizational payroll statistics
 * @access  Private (HR_ADMIN only)
 */
export async function getPayrollStats(req, res) {
  try {
    const month = req.query.month ? req.query.month.trim() : '2026-11';
    const records = await PayrollRecord.find({ payrollMonth: month });

    const totalGross = round2(records.reduce((sum, r) => sum + (r.grossSalary || 0), 0));
    const totalDeductions = round2(records.reduce((sum, r) => sum + (r.deductions || 0), 0));
    const totalNet = round2(records.reduce((sum, r) => sum + (r.netSalary || 0), 0));

    const paidRecords = records.filter((r) => r.paymentStatus === 'PAID');
    const pendingRecords = records.filter((r) => r.paymentStatus === 'PENDING');

    const paidAmount = round2(paidRecords.reduce((sum, r) => sum + (r.netSalary || 0), 0));
    const pendingAmount = round2(pendingRecords.reduce((sum, r) => sum + (r.netSalary || 0), 0));

    const metrics = {
      totalEmployees: records.length,
      employeeCount: records.length,
      totalGross,
      grossAmount: totalGross,
      totalDeductions,
      deductions: totalDeductions,
      totalNet,
      netAmount: totalNet,
      totalPayroll: totalNet,
      paidAmount,
      paidPayroll: paidAmount,
      pendingAmount,
      pendingPayroll: pendingAmount,
      paidCount: paidRecords.length,
      pendingCount: pendingRecords.length,
    };

    return res.status(200).json({
      success: true,
      month,
      metrics,
      stats: metrics,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to calculate payroll statistics.',
      error: err.message,
    });
  }
}

/**
 * @route   GET /api/payroll/:id
 * @desc    Get details of a specific payroll record (HR_ADMIN can view all, EMPLOYEE only self)
 * @access  Private
 */
export async function getPayrollById(req, res) {
  try {
    const { id } = req.params;
    const query = id.startsWith('PAY-') ? { payrollId: id.toUpperCase() } : { _id: id };

    const record = await PayrollRecord.findOne(query);
    if (!record) {
      return res.status(404).json({
        success: false,
        message: `Payroll record not found with identifier: ${id}`,
      });
    }

    if (req.user.role !== 'HR_ADMIN' && record.employeeId !== req.user.employeeId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You cannot access compensation records belonging to another colleague.',
      });
    }

    const emp = await User.findOne({ employeeId: record.employeeId }).select(
      'employeeId firstName lastName department jobTitle email'
    );
    const struct = await SalaryStructure.findOne({ employeeId: record.employeeId });

    return res.status(200).json({
      success: true,
      record: {
        ...record.toJSON(),
        employeeName: emp ? `${emp.firstName} ${emp.lastName}` : record.employeeId,
        department: emp ? emp.department : 'Engineering',
        designation: emp ? emp.jobTitle : 'Team Member',
        bankName: struct ? struct.bankName : 'JPMorgan Chase (Demo)',
        accountNumberMasked: struct ? struct.accountNumberMasked : '•••• •••• 6192',
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve payroll record.',
      error: err.message,
    });
  }
}

/**
 * @route   PATCH /api/payroll/:id/mark-paid
 * @route   PUT /api/payroll/:id/pay
 * @desc    Transition payroll record from PENDING to PAID (HR_ADMIN only)
 * @access  Private (HR_ADMIN only)
 */
export async function markPayrollPaid(req, res) {
  try {
    const { id } = req.params;
    const query = id.startsWith('PAY-') ? { payrollId: id.toUpperCase() } : { _id: id };

    const record = await PayrollRecord.findOne(query);
    if (!record) {
      return res.status(404).json({
        success: false,
        message: `Payroll record not found: ${id}`,
      });
    }

    // Prevent repeated payment transitions
    if (record.paymentStatus === 'PAID') {
      return res.status(400).json({
        success: false,
        message: `Payroll record '${record.payrollId}' is already marked as PAID.`,
      });
    }

    record.paymentStatus = 'PAID';
    record.paidAt = new Date();
    if (!record.disbursementDate) {
      record.disbursementDate = getTodayChicagoDate();
    }

    await record.save();

    return res.status(200).json({
      success: true,
      message: `Payroll record '${record.payrollId}' marked as PAID. Note: Demo disbursement completed, no actual bank transaction occurred.`,
      record,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to mark payroll as paid.',
      error: err.message,
    });
  }
}

// =========================================================================
// 4. PAYSLIP & PDF CONTROLLERS
// =========================================================================

/**
 * Helper to construct unified payslip object with breakdown
 */
async function buildPayslipData(record) {
  const emp = await User.findOne({ employeeId: record.employeeId }).select(
    'employeeId firstName lastName department jobTitle email'
  );
  const struct = await SalaryStructure.findOne({ employeeId: record.employeeId });

  const housing = struct ? round2(struct.housingAllowance) : round2(record.allowances * 0.6);
  const otherAllow = struct ? round2(struct.otherAllowances) : round2(record.allowances * 0.2);
  const bonus = struct ? round2(struct.bonus) : round2(record.allowances * 0.2);
  const tax = struct ? round2(struct.taxDeduction) : round2(record.deductions * 0.8);
  const otherDed = struct ? round2(struct.otherDeductions) : round2(record.deductions * 0.2);

  return {
    payrollId: record.payrollId,
    payrollMonth: record.payrollMonth,
    employeeId: record.employeeId,
    employeeName: emp ? `${emp.firstName} ${emp.lastName}` : record.employeeId,
    department: emp ? emp.department : 'Engineering',
    designation: emp ? emp.jobTitle : 'Team Member',
    email: emp ? emp.email : '',
    earnings: {
      basicSalary: round2(record.basicSalary),
      housingAllowance: housing,
      otherAllowances: otherAllow,
      bonus,
    },
    deductions: {
      taxDeduction: tax,
      otherDeductions: otherDed,
    },
    grossSalary: round2(record.grossSalary),
    totalDeductions: round2(record.deductions),
    netSalary: round2(record.netSalary),
    paymentStatus: record.paymentStatus,
    disbursementDate: record.disbursementDate,
    paidAt: record.paidAt,
    bankName: struct ? struct.bankName : 'JPMorgan Chase (Demo Direct Deposit)',
    accountNumberMasked: struct ? struct.accountNumberMasked : '•••• •••• 6192',
    isDemoDisclaimer:
      'DEMO SAMPLE: Fictional compensation document generated for demonstration purposes. Not a legally binding tax voucher.',
  };
}

/**
 * @route   GET /api/payroll/:id/payslip
 * @desc    Get detailed digital payslip voucher (HR_ADMIN or own EMPLOYEE)
 * @access  Private
 */
export async function getPayslip(req, res) {
  try {
    const { id } = req.params;
    const query = id.startsWith('PAY-') ? { payrollId: id.toUpperCase() } : { _id: id };

    const record = await PayrollRecord.findOne(query);
    if (!record) {
      return res.status(404).json({
        success: false,
        message: `Payroll record not found: ${id}`,
      });
    }

    if (req.user.role !== 'HR_ADMIN' && record.employeeId !== req.user.employeeId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You cannot access payslips belonging to another colleague.',
      });
    }

    const payslip = await buildPayslipData(record);

    return res.status(200).json({
      success: true,
      payslip,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve payslip details.',
      error: err.message,
    });
  }
}

/**
 * @route   GET /api/payroll/:id/pdf
 * @desc    Export payslip as PDF (HR_ADMIN or own EMPLOYEE)
 * @access  Private
 */
export async function exportPayslipPdf(req, res) {
  try {
    const { id } = req.params;
    const query = id.startsWith('PAY-') ? { payrollId: id.toUpperCase() } : { _id: id };

    const record = await PayrollRecord.findOne(query);
    if (!record) {
      return res.status(404).json({
        success: false,
        message: `Payroll record not found: ${id}`,
      });
    }

    if (req.user.role !== 'HR_ADMIN' && record.employeeId !== req.user.employeeId) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You cannot export payslips belonging to another colleague.',
      });
    }

    const payslip = await buildPayslipData(record);
    const pdfBuffer = buildPayslipPdfBuffer(payslip);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="payslip-${record.payrollId}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.status(200).send(pdfBuffer);
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to generate PDF payslip.',
      error: err.message,
    });
  }
}

export default {
  getSalaryStructures,
  getSalaryStructureByEmployeeId,
  createSalaryStructure,
  updateSalaryStructure,
  generatePayroll,
  getPayroll,
  getMyPayroll,
  getPayrollStats,
  getPayrollById,
  markPayrollPaid,
  getPayslip,
  exportPayslipPdf,
};
