import express from 'express';
import {
  getFeedback,
  getFeedbackById,
  submitFeedback,
  updateFeedbackStatus,
} from '../controllers/feedbackController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect); // All feedback routes require authentication

// 1. Employee Feedback Submission
router.post('/', submitFeedback);

// 2. HR Admin Feedback Management (RBAC)
router.get('/', authorize('HR_ADMIN'), getFeedback);
router.get('/:id', authorize('HR_ADMIN'), getFeedbackById);
router.patch('/:id/status', authorize('HR_ADMIN'), updateFeedbackStatus);
router.post('/:id/response', authorize('HR_ADMIN'), updateFeedbackStatus);

export default router;
