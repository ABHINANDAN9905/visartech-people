import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { connectDB, maskUri, getDatabaseUri } from './config/db.js';
import './models/index.js'; // Ensure all 10 models are loaded and registered

// Import API Route Modules
import authRoutes from './routes/authRoutes.js';
import employeeRoutes from './routes/employeeRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import leaveRoutes from './routes/leaveRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import payrollRoutes from './routes/payrollRoutes.js';
import announcementRoutes from './routes/announcementRoutes.js';
import feedbackRoutes from './routes/feedbackRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import { apiLimiter } from './middleware/rateLimiter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();

// Trust reverse proxy (e.g. Render, Vercel, AWS ELB) for correct HTTPS detection, secure cookies, and rate limiting
app.set('trust proxy', 1);

const PORT = process.env.PORT || 5000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:3000';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

function cleanUrl(u) {
  return typeof u === 'string' ? u.trim().replace(/\/+$/, '') : '';
}

const configuredOrigins = [process.env.CLIENT_ORIGIN, process.env.FRONTEND_URL]
  .filter(Boolean)
  .flatMap((entry) => entry.split(',').map(cleanUrl))
  .filter(Boolean);

const ALLOWED_ORIGINS = Array.from(
  new Set([
    ...configuredOrigins,
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://172.22.107.61:3000',
    'http://172.22.107.61:5000',
  ])
);

// Helper to validate whether origin is allowed (configured, local, LAN, or Vercel preview)
function isOriginAllowed(origin) {
  if (!origin) return true;
  const clean = cleanUrl(origin);
  if (ALLOWED_ORIGINS.includes(clean)) return true;
  const lanRegex = /^https?:\/\/(localhost|127\.0\.0\.1|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:(3000|5000|5173))?$/;
  if (lanRegex.test(clean)) return true;
  // Allow Vercel preview and deployment origins (*.vercel.app)
  if (/^https:\/\/[a-z0-9-_.]+\.vercel\.app$/i.test(clean)) return true;
  return false;
}

// Global Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token', 'x-test-suite'],
    exposedHeaders: ['set-cookie'],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Built-in Cookie Parser Middleware (Zero external dependency)
app.use((req, res, next) => {
  req.cookies = {};
  if (req.headers.cookie) {
    req.headers.cookie.split(';').forEach((cookie) => {
      const parts = cookie.trim().split('=');
      const name = parts[0];
      const val = parts.slice(1).join('=');
      if (name) {
        req.cookies[name] = decodeURIComponent(val);
      }
    });
  }
  next();
});

// -------------------------------------------------------------
// Health Check Endpoints
// -------------------------------------------------------------

// 1. General Service Health
app.get(['/api/health', '/health'], (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'VISARTECH People Backend API',
    version: '1.0.0',
    uptimeSeconds: Math.floor(process.uptime()),
    timezone: 'America/Chicago',
  });
});

// 2. Database Connectivity Health (Safely masked, NO credentials exposed)
app.get(['/api/health/db', '/health/db'], async (req, res) => {
  const stateMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  const readyState = mongoose.connection.readyState;
  const connectionState = stateMap[readyState] || 'unknown';

  let pingMs = null;
  let isAtlas = false;
  let pingError = null;

  if (readyState === 1 && mongoose.connection.db) {
    try {
      const startTime = Date.now();
      await mongoose.connection.db.admin().ping();
      pingMs = Date.now() - startTime;
      isAtlas = Boolean(mongoose.connection.host && mongoose.connection.host.includes('mongodb.net'));
    } catch (err) {
      pingError = 'Ping failed';
    }
  }

  const isHealthy = readyState === 1 && pingMs !== null;

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    database: {
      connection: connectionState,
      readyState,
      isAtlas,
      host: mongoose.connection.host || null,
      name: mongoose.connection.name || null,
      pingMs,
      error: pingError,
      modelsRegistered: Object.keys(mongoose.models),
    },
    timestamp: new Date().toISOString(),
    timezone: 'America/Chicago',
  });
});

// -------------------------------------------------------------
// Core Business API Routes
// -------------------------------------------------------------
// Global API rate limiter — 200 req/15 min per IP (skipped in test mode)
app.use('/api', apiLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/notifications', notificationRoutes);

// Root Welcome Endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Welcome to VISARTECH People HRMS API',
    tagline: 'One Platform. Every People Operation.',
    endpoints: {
      health: '/api/health',
      databaseHealth: '/api/health/db',
      auth: '/api/auth/login',
      employees: '/api/employees',
      attendance: '/api/attendance',
      leaves: '/api/leaves',
      tasks: '/api/tasks',
      payroll: '/api/payroll',
      announcements: '/api/announcements',
      feedback: '/api/feedback',
      notifications: '/api/notifications',
    },
  });
});

// 404 Handler for undefined API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`,
  });
});

// Global Error Handler Middleware
app.use((err, req, res, next) => {
  console.error('[Unhandled API Error]:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// Start Server & Connect Database if not in test mode
if (process.env.NODE_ENV !== 'test') {
  connectDB()
    .then(() => {
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`[Server] VISARTECH People Backend running on http://localhost:${PORT} and http://0.0.0.0:${PORT}`);
        console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(`[Server] Health check: http://localhost:${PORT}/api/health`);
        console.log(`[Server] Database health: http://localhost:${PORT}/api/health/db`);
      });
    })
    .catch((err) => {
      console.warn(`[Server] Running in offline mode (database connection pending): ${err.message}`);
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`[Server] HTTP server running on http://localhost:${PORT} (awaiting database connection)`);
      });
    });
}

export default app;
