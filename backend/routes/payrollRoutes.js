import express from 'express';
import {
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
} from '../controllers/payrollController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect); // All payroll routes require authentication

// 1. Salary Structure Management
router.get('/salary-structures', authorize('HR_ADMIN'), getSalaryStructures);
router.get('/salary-structures/:employeeId', getSalaryStructureByEmployeeId);
router.post('/salary-structures', authorize('HR_ADMIN'), createSalaryStructure);
router.put('/salary-structures/:employeeId', authorize('HR_ADMIN'), updateSalaryStructure);

// 2. Payroll Generation
router.post('/generate', authorize('HR_ADMIN'), generatePayroll);

// 3. Employee Self-Service Records
router.get('/my', getMyPayroll);

// 4. Organizational Payroll Records & Statistics
router.get('/stats', authorize('HR_ADMIN'), getPayrollStats);
router.get('/', authorize('HR_ADMIN'), getPayroll);

// 5. Detailed Payslip & PDF Export
router.get('/:id/payslip', getPayslip);
router.get('/:id/pdf', exportPayslipPdf);

// 6. Payment Disbursement Transitions
router.patch('/:id/mark-paid', authorize('HR_ADMIN'), markPayrollPaid);
router.put('/:id/pay', authorize('HR_ADMIN'), markPayrollPaid);

// 7. Specific Payroll Record Details
router.get('/:id', getPayrollById);

export default router;
