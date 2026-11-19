import express from 'express';
import {
  createTask,
  getTasks,
  getMyTasks,
  getTaskById,
  updateTask,
  deleteTask,
  addTaskComment,
  getTaskStats,
} from '../controllers/taskController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect); // All task routes require authentication

// 1. Employee Self-Service Endpoints
router.get('/my', getMyTasks);

// 2. HR Admin Endpoints (RBAC Enforced)
router.get('/stats', authorize('HR_ADMIN'), getTaskStats);
router.post('/', authorize('HR_ADMIN'), createTask);
router.get('/', authorize('HR_ADMIN'), getTasks);

// 3. Specific task operations (authenticated & scoped)
router.get('/:id', getTaskById);
router.put('/:id', updateTask);
router.delete('/:id', authorize('HR_ADMIN'), deleteTask);
router.post('/:id/comments', addTaskComment);

export default router;
