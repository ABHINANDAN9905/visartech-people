import express from 'express';
import {
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  resendEmployeeInvitation,
} from '../controllers/employeeController.js';
import { protect, authorize } from '../middleware/auth.js';
import { employeeManagementLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.use(protect); // All employee routes require authentication

router.get('/', authorize('HR_ADMIN'), getEmployees);
router.get('/:id', getEmployeeById);
router.post('/', authorize('HR_ADMIN'), employeeManagementLimiter, createEmployee);
router.post('/:id/resend-invitation', authorize('HR_ADMIN'), employeeManagementLimiter, resendEmployeeInvitation);
router.put('/:id', updateEmployee);
router.delete('/:id', authorize('HR_ADMIN'), deleteEmployee);

export default router;
