import { verifyToken } from '../config/jwt.js';
import User from '../models/User.js';

/**
 * Protect routes: verify JWT from HTTP-only cookie or Authorization header and attach user
 */
export async function protect(req, res, next) {
  let token = null;

  // 1. Check Authorization header: Bearer <token>
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
  // 2. Check HTTP-only cookie: token=<token>
  else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  // 3. Check custom header fallback
  else if (req.headers['x-auth-token']) {
    token = req.headers['x-auth-token'];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No authentication token provided.',
    });
  }

  try {
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id).select('-passwordHash');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication failed. User account does not exist or has been removed.',
      });
    }

    req.user = user;
    next();
  } catch (err) {
    const isExpired = err.message && err.message.toLowerCase().includes('expired');
    return res.status(401).json({
      success: false,
      message: isExpired ? 'Authentication failed. Token has expired. Please log in again.' : 'Authentication failed. Token is invalid or corrupted.',
      error: err.message,
    });
  }
}

/**
 * Role-Based Access Control (RBAC) middleware
 * e.g. requireRole('HR_ADMIN') or authorize('HR_ADMIN', 'MANAGER')
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required prior to authorization.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Role '${req.user.role}' is not authorized to access this resource. Required: ${roles.join(', ')}`,
      });
    }

    next();
  };
}

// Alias for backwards compatibility
export const authorize = requireRole;

export default {
  protect,
  requireRole,
  authorize,
};
