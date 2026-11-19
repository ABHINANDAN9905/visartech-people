import express from 'express';
import {
  login,
  getMe,
  logout,
  verifyEmail,
  resendVerification,
  validateInvitation,
  acceptInvitation,
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import { authLimiter, strictLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Apply strict rate limit to login endpoint (10 attempts per 15 min per IP)
router.post('/login', authLimiter, login);
router.post('/logout', logout);
router.get('/me', protect, getMe);

// Email verification endpoints (supports both direct API and browser GET requests)
router.get('/verify-email/:token', verifyEmail);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', strictLimiter, resendVerification);

// Employee onboarding invitation endpoints
router.get('/invitation/:token', validateInvitation);
router.post('/accept-invitation', strictLimiter, acceptInvitation);

export default router;
