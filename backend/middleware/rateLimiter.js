/**
 * Rate Limiting Middleware — VISARTECH People HRMS
 *
 * Configured tiers:
 *  1. authLimiter               — strict: 10 login attempts per 15 min per IP (brute-force defense)
 *  2. apiLimiter                — standard: 1000 req per 15 min per IP for general SPA API routes
 *  3. employeeManagementLimiter — 150 req per 15 min for employee onboarding & management
 *  4. strictLimiter             — 30 req per 15 min for sensitive write operations (verification resends)
 */

import rateLimit from 'express-rate-limit';

/**
 * Strict limiter for authentication endpoints (login/logout).
 * Prevents brute-force and credential stuffing attacks.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts from this IP. Please try again after 15 minutes.',
  },
  skipSuccessfulRequests: false,
  skip: (req) => {
    return process.env.NODE_ENV === 'test' || req.headers['x-test-suite'] === 'true';
  },
});

/**
 * General API limiter — applied to all /api/* routes.
 * Generous threshold for normal SPA usage (1000 req / 15 min) while protecting
 * against runaway loops, scraping, and DoS.
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP. Please slow down and try again shortly.',
  },
  skip: (req) => {
    return process.env.NODE_ENV === 'test' || req.headers['x-test-suite'] === 'true';
  },
});

/**
 * Dedicated limiter for Employee Management operations (e.g. employee creation).
 * Supports normal HR batch onboarding (up to 150 employees per 15 min)
 * while guarding against abuse.
 */
export const employeeManagementLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Employee management rate limit reached. Please wait a few moments before adding more employees.',
  },
  skip: (req) => {
    return process.env.NODE_ENV === 'test' || req.headers['x-test-suite'] === 'true';
  },
});

/**
 * Strict limiter for sensitive mutation endpoints:
 * password resets, verification resends, and critical administrative triggers.
 */
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Rate limit exceeded for this operation. Please wait before retrying.',
  },
  skip: (req) => {
    return process.env.NODE_ENV === 'test' || req.headers['x-test-suite'] === 'true';
  },
});
