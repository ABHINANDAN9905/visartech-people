import crypto from 'crypto';
import User from '../models/User.js';
import { signToken, COOKIE_OPTIONS } from '../config/jwt.js';
import { sendVerificationEmail } from '../services/emailService.js';

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user with email OR Employee ID + bcrypt password verification
 * @access  Public
 */
export async function login(req, res) {
  try {
    const rawIdentifier = (req.body?.loginId || req.body?.identifier || req.body?.email || '').trim();
    const { password } = req.body || {};

    // 1. Validation: check for missing credentials
    if (!rawIdentifier || !password || !password.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email/Employee ID and password.',
      });
    }

    const normalizedEmail = rawIdentifier.toLowerCase();
    const cleanEmployeeId = rawIdentifier.toUpperCase();

    // Query matches either email or employeeId case-insensitively
    const user = await User.findOne({
      $or: [
        { email: normalizedEmail },
        { employeeId: { $regex: new RegExp(`^${cleanEmployeeId.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, 'i') } },
      ],
    }).select('+passwordHash +invitationStatus');

    // Return the same generic invalid-credentials error for unknown email, unknown Employee ID and incorrect password
    const GENERIC_AUTH_ERROR = 'Invalid credentials. Please check your login details and password.';

    if (!user) {
      return res.status(401).json({
        success: false,
        message: GENERIC_AUTH_ERROR,
      });
    }

    // Uninvited / pending employees cannot log in until they accept the invitation and set a password
    if (user.invitationStatus === 'PENDING' || !user.passwordHash) {
      return res.status(401).json({
        success: false,
        message: GENERIC_AUTH_ERROR,
      });
    }

    // 2. Bcrypt password comparison
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: GENERIC_AUTH_ERROR,
      });
    }

    // 3. Sign RFC 7519 JWT token
    const token = signToken({
      id: user._id.toString(),
      employeeId: user.employeeId,
      role: user.role,
      email: user.email,
    });

    // 4. Set secure HTTP-only cookie
    res.cookie('token', token, COOKIE_OPTIONS);

    // 5. Exclude passwordHash in output (handled by toJSON transform)
    const safeUser = user.toJSON();

    return res.status(200).json({
      success: true,
      message: 'Authentication successful',
      token,
      user: safeUser,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Server error during authentication',
      error: err.message,
    });
  }
}

/**
 * @route   GET /api/auth/invitation/:token
 * @desc    Validate invitation token without consuming it
 * @access  Public
 */
export async function validateInvitation(req, res) {
  try {
    const rawToken = req.params.token || req.query?.token;

    if (!rawToken || typeof rawToken !== 'string' || !rawToken.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Invitation token is required.',
      });
    }

    const hashedToken = crypto
      .createHash('sha256')
      .update(rawToken.trim())
      .digest('hex');

    const user = await User.findOne({
      invitationToken: hashedToken,
      invitationExpires: { $gt: new Date() },
      invitationStatus: 'PENDING',
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invitation link is invalid, expired, or has already been used.',
      });
    }

    return res.status(200).json({
      success: true,
      invitation: {
        name: user.name || `${user.firstName} ${user.lastName}`,
        email: user.email,
        employeeId: user.employeeId,
        jobTitle: user.jobTitle,
        department: user.department,
      },
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Error validating invitation token',
      error: err.message,
    });
  }
}

/**
 * @route   POST /api/auth/accept-invitation
 * @desc    Accept invitation and set employee password
 * @access  Public
 */
export async function acceptInvitation(req, res) {
  try {
    const { token, password } = req.body || {};

    if (!token || typeof token !== 'string' || !token.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Invitation token is required.',
      });
    }

    if (!password || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long.',
      });
    }

    const hashedToken = crypto
      .createHash('sha256')
      .update(token.trim())
      .digest('hex');

    const user = await User.findOne({
      invitationToken: hashedToken,
      invitationExpires: { $gt: new Date() },
      invitationStatus: 'PENDING',
    }).select('+invitationToken +invitationExpires +passwordHash');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invitation link is invalid, expired, or has already been used.',
      });
    }

    // Set new password
    user.passwordHash = await User.hashPassword(password);
    user.invitationToken = undefined;
    user.invitationExpires = undefined;
    user.invitationStatus = 'ACCEPTED';
    user.isEmailVerified = true;
    await user.save();

    // Issue JWT token and set cookie
    const jwtToken = signToken({
      id: user._id.toString(),
      employeeId: user.employeeId,
      role: user.role,
      email: user.email,
    });

    res.cookie('token', jwtToken, COOKIE_OPTIONS);

    return res.status(200).json({
      success: true,
      message: 'Account activated successfully. Your password has been set.',
      token: jwtToken,
      user: user.toJSON(),
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to complete invitation acceptance.',
      error: err.message,
    });
  }
}

/**
 * @route   GET /api/auth/me
 * @desc    Get currently authenticated user profile
 * @access  Private
 */
export async function getMe(req, res) {
  try {
    return res.status(200).json({
      success: true,
      user: req.user.toJSON(),
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve profile',
      error: err.message,
    });
  }
}

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user and clear authentication cookie
 * @access  Public
 */
export async function logout(req, res) {
  // Clear the HTTP-only cookie securely
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });

  return res.status(200).json({
    success: true,
    message: 'Logged out successfully. Session cookie cleared.',
  });
}

/**
 * @route   GET /api/auth/verify-email/:token
 * @route   POST /api/auth/verify-email
 * @desc    Validate verification token and activate user's email verification status
 * @access  Public
 */
export async function verifyEmail(req, res) {
  try {
    const rawToken = req.params.token || req.body?.token;

    if (!rawToken || typeof rawToken !== 'string' || !rawToken.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required.',
      });
    }

    // Compute SHA-256 hash of incoming token to match database record
    const hashedToken = crypto
      .createHash('sha256')
      .update(rawToken.trim())
      .digest('hex');

    // Find user with matching unexpired verification token
    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: new Date() },
    }).select('+emailVerificationToken +emailVerificationExpires');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Verification link is invalid, expired, or has already been used.',
      });
    }

    // Mark email as verified and invalidate token (single-use)
    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Email address verified successfully. Your account is fully active.',
      user: user.toJSON(),
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred during email verification.',
      error: err.message,
    });
  }
}

/**
 * @route   POST /api/auth/resend-verification
 * @desc    Regenerate and email a fresh verification link
 * @access  Public (Rate limited)
 */
export async function resendVerification(req, res) {
  try {
    const { email } = req.body || {};
    const targetEmail = email ? email.trim().toLowerCase() : (req.user?.email || '');

    if (!targetEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required to resend verification.',
      });
    }

    const user = await User.findOne({ email: targetEmail });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No registered account found with this email address.',
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'This email address is already verified.',
      });
    }

    // Generate fresh cryptographic token
    const rawToken = user.generateEmailVerificationToken();
    await user.save();

    const frontendUrl = process.env.FRONTEND_URL || process.env.CLIENT_ORIGIN || 'http://localhost:3000';
    const verificationUrl = `${frontendUrl}/verify-email/${rawToken}`;

    const dispatch = await sendVerificationEmail({
      to: user.email,
      name: user.name || `${user.firstName} ${user.lastName}`,
      verificationUrl,
    });

    if (!dispatch.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email. Please try again shortly.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'A fresh verification link has been sent to your email address.',
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Failed to resend verification link.',
      error: err.message,
    });
  }
}
