import express from 'express';
import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from '../controllers/notificationController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect); // All notification routes require authentication

router.get('/unread-count', getUnreadCount);
router.patch('/read-all', markAllNotificationsRead);
router.put('/read-all', markAllNotificationsRead);

router.get('/', getNotifications);
router.patch('/:id/read', markNotificationRead);
router.put('/:id/read', markNotificationRead);

export default router;
