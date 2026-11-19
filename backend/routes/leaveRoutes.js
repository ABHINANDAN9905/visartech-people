import express from 'express';
import {
  applyLeave,
  getMyLeaves,
  getMyLeaveBalance,
  cancelLeave,
  getLeaves,
  approveLeave,
  rejectLeave,
  getLeaveStats,
  getLeaveBalances,
  updateLeaveStatus,
} from '../controllers/leaveController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect); // All leave routes require authentication

// 1. Employee Self-Service Endpoints
router.post('/', applyLeave);
router.get('/my', getMyLeaves);
router.get('/my/balance', getMyLeaveBalance);
router.patch('/:id/cancel', cancelLeave);

// 2. HR Admin Endpoints (RBAC Enforced)
router.get('/stats', authorize('HR_ADMIN'), getLeaveStats);
router.patch('/:id/approve', authorize('HR_ADMIN'), approveLeave);
router.patch('/:id/reject', authorize('HR_ADMIN'), rejectLeave);
router.get('/', authorize('HR_ADMIN'), getLeaves);

// 3. Legacy compatibility aliases
router.get('/balances', getLeaveBalances);
router.put('/:id/status', authorize('HR_ADMIN'), updateLeaveStatus);

export default router;
