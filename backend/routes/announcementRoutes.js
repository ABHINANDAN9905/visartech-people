import express from 'express';
import {
  getAnnouncements,
  getAnnouncementById,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  markAnnouncementRead,
} from '../controllers/announcementController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(protect); // All announcement routes require authentication

router.get('/', getAnnouncements);
router.post('/', authorize('HR_ADMIN'), createAnnouncement);
router.get('/:id', getAnnouncementById);
router.put('/:id', authorize('HR_ADMIN'), updateAnnouncement);
router.delete('/:id', authorize('HR_ADMIN'), deleteAnnouncement);
router.post('/:id/read', markAnnouncementRead);

export default router;
