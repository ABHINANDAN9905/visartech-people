import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly ensure dotenv loads from backend/.env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

/**
 * Cleanly resolve and sanitize the MongoDB URI from environment variables
 * Supports both MONGODB_URI and MONGO_URI
 */
export function getDatabaseUri() {
  let uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/visartech_people';
  
  // Clean potential accidental prefixes e.g. "MONGO_URI=" or "MONGODB_URI="
  uri = uri.replace(/^MONGO(?:DB)?_URI=\s*/i, '').trim();
  
  // Clean whitespace inside the connection string (e.g. accidental spaces before @host)
  uri = uri.replace(/\s+/g, '');
  
  return uri;
}

/**
 * Mask sensitive credentials from a database URI for safe logging
 */
export function maskUri(uri) {
  if (!uri) return 'undefined';
  try {
    // Masks username:password in mongodb:// or mongodb+srv://
    return uri.replace(/\/\/[^@]+@/, '//****:****@');
  } catch {
    return '****';
  }
}

/**
 * Connect to MongoDB database
 */
export async function connectDB() {
  const uri = getDatabaseUri();
  const masked = maskUri(uri);

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      heartbeatFrequencyMS: 10000,
      maxPoolSize: 10,
      autoIndex: true, // Build defined schema indexes automatically
    });

    console.log(`[MongoDB] Connected successfully to host: ${conn.connection.host}, database: ${conn.connection.name}`);
    console.log(`[MongoDB] Connection endpoint: ${masked}`);
    return conn;
  } catch (err) {
    // Sanitize error message to ensure no credentials leak in logs
    const safeMsg = (err.message || '').replace(/\/\/[^@]+@/g, '//****:****@');
    
    // Categorize error for clear diagnosis
    let category = 'Database Error';
    if (safeMsg.includes('ENOTFOUND') || safeMsg.includes('EAI_AGAIN') || safeMsg.includes('querySrv')) {
      category = 'DNS Resolution Error';
    } else if (safeMsg.includes('ECONNRESET')) {
      category = 'Network Reset (ECONNRESET) - Peer reset connection or firewall/IP rule propagation delay';
    } else if (safeMsg.includes('ETIMEDOUT') || safeMsg.includes('Server selection timed out')) {
      category = 'Network Timeout / IP Whitelist Error';
    } else if (safeMsg.includes('bad auth') || safeMsg.includes('Authentication failed') || safeMsg.includes('code 18')) {
      category = 'Authentication Error (invalid username, password, or authSource)';
    } else if (safeMsg.includes('certificate') || safeMsg.includes('TLS') || safeMsg.includes('SSL')) {
      category = 'TLS / Certificate Verification Error';
    }

    console.error(`[MongoDB] [${category}] Connection error: ${safeMsg}`);
    throw new Error(safeMsg);
  }
}

/**
 * Gracefully disconnect from database
 */
export async function disconnectDB() {
  try {
    await mongoose.disconnect();
    console.log('[MongoDB] Disconnected cleanly.');
  } catch (err) {
    console.error(`[MongoDB] Disconnect error: ${err.message}`);
  }
}
