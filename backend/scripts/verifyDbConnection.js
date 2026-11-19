import mongoose from 'mongoose';
import { connectDB, disconnectDB, getDatabaseUri, maskUri } from '../config/db.js';

console.log('====================================================');
console.log('VISARTECH People — MongoDB Atlas Connectivity Verification');
console.log('====================================================');

async function testConnection() {
  const uri = getDatabaseUri();
  console.log(`[Config] Resolved URI: ${maskUri(uri)}`);
  console.log(`[Config] Is Atlas URI: ${uri.includes('mongodb.net')}`);

  try {
    const conn = await connectDB();
    console.log('[Test] Ping Atlas database...');
    const start = Date.now();
    await conn.connection.db.admin().ping();
    const duration = Date.now() - start;
    console.log(`[Test] Ping successful! Response time: ${duration}ms`);
    console.log(`[Test] Connected Host: ${conn.connection.host}`);
    console.log(`[Test] Database Name: ${conn.connection.name}`);
    console.log(`[Test] Mongoose ReadyState: ${conn.connection.readyState} (1 = connected)`);
    console.log('\nSUCCESS: MongoDB Atlas connection established and verified!');
    await disconnectDB();
    process.exit(0);
  } catch (err) {
    console.error('\nFAILED: Could not connect to MongoDB Atlas.');
    console.error(`Error details: ${err.message}`);
    process.exit(1);
  }
}

testConnection();
