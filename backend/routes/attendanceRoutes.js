import express from 'express';
import {
  checkIn,
  checkOut,
  getTodayAttendance,
  getMyAttendance,
  getMyAttendanceSummary,
  getAttendance,
  getAttendanceSummary,
  updateAttendance,
} from '../controllers/attendanceController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect); // All attendance endpoints require authentication

// 1. Employee Self-Service Endpoints
router.post('/check-in', checkIn);
router.post('/check-out', checkOut);
router.get('/today', getTodayAttendance);
router.get('/my', getMyAttendance);
router.get('/my/summary', getMyAttendanceSummary);

// 2. HR Admin Endpoints (RBAC Enforced)
router.get('/summary', authorize('HR_ADMIN'), getAttendanceSummary);
router.get('/', authorize('HR_ADMIN'), getAttendance);
router.put('/:id', authorize('HR_ADMIN'), updateAttendance);

export default router;
