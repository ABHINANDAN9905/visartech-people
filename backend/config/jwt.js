import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { signToken, verifyToken } from '../utils/jwt.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const JWT_SECRET = process.env.JWT_SECRET || 'visartech_people_demo_secret_2026_super_secure_key';
export const JWT_EXPIRES_IN = 86400; // 24 hours in seconds

const isProduction = process.env.NODE_ENV === 'production';

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.COOKIE_SECURE !== undefined ? process.env.COOKIE_SECURE === 'true' : isProduction,
  sameSite: process.env.COOKIE_SAME_SITE || (isProduction ? 'none' : 'lax'),
  maxAge: 24 * 60 * 60 * 1000, // 24 hours in ms
};

export { signToken, verifyToken };

export default {
  JWT_SECRET,
  JWT_EXPIRES_IN,
  COOKIE_OPTIONS,
  signToken,
  verifyToken,
};
