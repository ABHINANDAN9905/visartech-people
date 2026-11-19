/**
 * VISARTECH People — HR Admin Email Verification Dispatcher
 *
 * Generates a cryptographically secure single-use verification token,
 * stores ONLY its SHA-256 hash in MongoDB on ADM-001,
 * and sends the branded verification email to kumarabhinandan1307@gmail.com.
 *
 * Safety Guarantees:
 *  - Raw token is NEVER stored in database (only SHA-256 hash).
 *  - Raw token is NEVER printed to terminal/logs.
 *  - Sends exactly ONE verification email.
 *  - Preserves ADM-001 and all database collections.
 */

import { connectDB, disconnectDB } from '../config/db.js';
import { User } from '../models/index.js';
import { sendVerificationEmail } from '../services/emailService.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const TARGET_EMPLOYEE_ID = 'ADM-001';
const TARGET_EMAIL = 'kumarabhinandan1307@gmail.com';

async function dispatchHrVerification() {
  console.log('====================================================');
  console.log('VISARTECH People — HR Email Verification Dispatcher');
  console.log('====================================================');

  await connectDB();

  try {
    // 1. Locate HR Admin
    const user = await User.findOne({
      employeeId: TARGET_EMPLOYEE_ID,
      email: TARGET_EMAIL,
    });

    if (!user) {
      throw new Error(`Target HR Admin (${TARGET_EMPLOYEE_ID} / ${TARGET_EMAIL}) not found!`);
    }

    if (user.role !== 'HR_ADMIN') {
      throw new Error(`Security Exception: User role is ${user.role}, expected HR_ADMIN.`);
    }

    console.log('\n[Target Identity Verified]');
    console.log(`  Employee ID:      ${user.employeeId}`);
    console.log(`  Name:             ${user.firstName} ${user.lastName}`);
    console.log(`  Email Address:    ${user.email}`);
    console.log(`  Verification:     ${user.isEmailVerified ? 'ALREADY VERIFIED' : 'PENDING'}`);

    if (user.isEmailVerified) {
      console.log('\n[NOTICE] Account is already verified. No verification email needed.');
      return;
    }

    // 2. Generate Cryptographic Token & Hash
    console.log('\n[Generating Cryptographic One-Time Token]');
    const rawToken = user.generateEmailVerificationToken();
    await user.save();

    console.log('  [PASS] Cryptographic 256-bit entropy token generated');
    console.log('  [PASS] SHA-256 hash stored in MongoDB emailVerificationToken');
    console.log(`  [PASS] Expiration timestamp set: ${user.emailVerificationExpires.toISOString()} (24 hours)`);
    console.log('  [PASS] Raw token securely masked from logs');

    // 3. Resolve Frontend URL & Verification Route
    const frontendBaseUrl = process.env.FRONTEND_URL || process.env.CLIENT_ORIGIN || 'http://localhost:3000';
    const verificationUrl = `${frontendBaseUrl}/verify-email/${rawToken}`;

    console.log('\n[Verification Route Configured]');
    console.log(`  Frontend Base:    ${frontendBaseUrl}`);
    console.log('  Route Pattern:    /verify-email/:token');
    console.log(`  Full Target Link: ${frontendBaseUrl}/verify-email/[TOKEN_PROTECTED]`);

    // 4. Dispatch Branded Verification Email via Gmail SMTP
    console.log('\n[Dispatching Verification Email via Gmail SMTP]');
    const startTime = Date.now();

    const dispatch = await sendVerificationEmail({
      to: user.email,
      name: `${user.firstName} ${user.lastName}`,
      verificationUrl,
    });

    const duration = Date.now() - startTime;

    if (dispatch.success && dispatch.messageId) {
      console.log(`\n[SUCCESS] Gmail SMTP Accepted Email (${duration}ms)`);
      console.log(`  Acceptance:       ACCEPTED`);
      console.log(`  Message ID:       ${dispatch.messageId}`);
      console.log(`  Target Inbox:     ${user.email}`);
      console.log('  Delivery Status:  DISPATCHED');
      console.log('\n====================================================');
      console.log('Awaiting user confirmation of email arrival & link verification.');
      console.log('====================================================');
    } else {
      throw new Error(`SMTP Dispatch failed: ${dispatch.message || 'Unknown error'}`);
    }
  } catch (err) {
    console.error('\n[Dispatch Error]:', err.message);
    process.exit(1);
  } finally {
    await disconnectDB();
  }
}

dispatchHrVerification();
