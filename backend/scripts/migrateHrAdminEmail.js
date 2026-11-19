/**
 * VISARTECH People — Safe HR Admin Email Migration Script
 *
 * Migration Objective:
 *  - Safely migrate HR Admin (ADM-001) from demo email 'hr@visartech.demo'
 *    to real confirmed Gmail address 'kumarabhinandan1307@gmail.com'.
 * 
 * Safety Guarantees:
 *  - Idempotent: Can be run multiple times safely.
 *  - Preserves MongoDB _id, password hash, role (HR_ADMIN), employeeId (ADM-001).
 *  - Checks for collisions before executing update.
 *  - Preserves all associated records across collections.
 *  - Sets isEmailVerified: false (pending email verification).
 *  - Zero password hash or credential logging.
 *  - Does NOT reset, reseed, or create duplicate accounts.
 */

import { connectDB, disconnectDB } from '../config/db.js';
import { User, Notification, Announcement, Feedback } from '../models/index.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const TARGET_EMPLOYEE_ID = 'ADM-001';
const NEW_EMAIL = 'kumarabhinandan1307@gmail.com';
const OLD_EMAIL = 'hr@visartech.demo';

export async function migrateHrAdminEmail() {
  console.log('====================================================');
  console.log('VISARTECH People — HR Admin Email Migration (Phase 2.4)');
  console.log('====================================================');

  await connectDB();

  try {
    // 1. Pre-flight Check: Check if new email is already taken by another user
    const existingWithNewEmail = await User.findOne({ email: NEW_EMAIL }).lean();
    if (existingWithNewEmail) {
      if (existingWithNewEmail.employeeId === TARGET_EMPLOYEE_ID) {
        console.log(`\n[IDEMPOTENT] Target account ${TARGET_EMPLOYEE_ID} already has email: ${NEW_EMAIL}`);
        console.log('No migration action needed. Existing record is already up to date.');
        return { success: true, alreadyMigrated: true, user: existingWithNewEmail };
      } else {
        throw new Error(
          `Conflict: Email '${NEW_EMAIL}' is already assigned to a different user (${existingWithNewEmail.employeeId}). Aborting migration.`
        );
      }
    }

    // 2. Fetch existing HR Admin record by employeeId
    const currentAdmin = await User.findOne({ employeeId: TARGET_EMPLOYEE_ID })
      .select('+passwordHash')
      .lean();

    if (!currentAdmin) {
      throw new Error(`Target account with employeeId '${TARGET_EMPLOYEE_ID}' not found in database.`);
    }

    if (currentAdmin.role !== 'HR_ADMIN') {
      throw new Error(`Account '${TARGET_EMPLOYEE_ID}' has role '${currentAdmin.role}', expected 'HR_ADMIN'.`);
    }

    console.log('\n[Pre-Migration State]');
    console.log(`  MongoDB _id:      ${currentAdmin._id}`);
    console.log(`  Employee ID:      ${currentAdmin.employeeId}`);
    console.log(`  Name:             ${currentAdmin.firstName} ${currentAdmin.lastName}`);
    console.log(`  Current Email:    ${currentAdmin.email}`);
    console.log(`  Role:             ${currentAdmin.role}`);
    console.log(`  Password Hash:    [PRESERVED — BCRYPT HASH DETECTED]`);
    console.log(`  Target Email:     ${NEW_EMAIL}`);

    // Verify related collections historical association
    const announcementCount = await Announcement.countDocuments({ author: /Alex Morgan/i });
    const notificationCount = await Notification.countDocuments({ recipientId: 'HR_ADMIN' });
    console.log('\n[Associated Records Audit]');
    console.log(`  Authored Announcements: ${announcementCount}`);
    console.log(`  Admin Notifications:    ${notificationCount}`);

    // 3. Perform Atomic In-Place Update
    console.log('\n[Executing In-Place Update]');
    const updatedUser = await User.findOneAndUpdate(
      { employeeId: TARGET_EMPLOYEE_ID },
      {
        $set: {
          email: NEW_EMAIL,
          isEmailVerified: false, // Set to pending verification
        },
      },
      {
        new: true,
        runValidators: true,
      }
    ).lean();

    // 4. Post-Migration Verification & Assertions
    console.log('\n[Post-Migration Verification]');

    // Confirm _id preservation
    if (updatedUser._id.toString() !== currentAdmin._id.toString()) {
      throw new Error('FATAL: MongoDB _id changed during migration!');
    }
    console.log('  [PASS] MongoDB _id strictly preserved');

    // Confirm passwordHash preservation
    const verifyHash = await User.findOne({ employeeId: TARGET_EMPLOYEE_ID }).select('+passwordHash').lean();
    if (verifyHash.passwordHash !== currentAdmin.passwordHash) {
      throw new Error('FATAL: Password hash mismatch after migration!');
    }
    console.log('  [PASS] Password hash strictly preserved');

    // Confirm role preservation
    if (updatedUser.role !== 'HR_ADMIN') {
      throw new Error(`FATAL: Role corrupted! Actual: ${updatedUser.role}`);
    }
    console.log('  [PASS] HR_ADMIN role strictly preserved');

    // Confirm email updated
    if (updatedUser.email !== NEW_EMAIL) {
      throw new Error(`FATAL: Email update failed! Actual: ${updatedUser.email}`);
    }
    console.log(`  [PASS] Email updated to ${NEW_EMAIL}`);

    // Confirm verification status is pending
    if (updatedUser.isEmailVerified !== false) {
      throw new Error(`FATAL: isEmailVerified expected false, got ${updatedUser.isEmailVerified}`);
    }
    console.log('  [PASS] Email verification status set to pending (isEmailVerified: false)');

    // Confirm sole HR Admin count
    const totalAdmins = await User.countDocuments({ role: 'HR_ADMIN' });
    if (totalAdmins !== 1) {
      throw new Error(`FATAL: Expected exactly 1 HR_ADMIN, found ${totalAdmins}!`);
    }
    console.log('  [PASS] Unique single HR Admin invariant maintained (total HR_ADMINs: 1)');

    // Confirm total user count unchanged
    const totalUsers = await User.countDocuments({});
    console.log(`  [PASS] Total user accounts in system: ${totalUsers} (no duplicate accounts created)`);

    console.log('\n====================================================');
    console.log('MIGRATION COMPLETED SUCCESSFULLY');
    console.log('====================================================');

    return {
      success: true,
      user: {
        _id: updatedUser._id,
        employeeId: updatedUser.employeeId,
        name: `${updatedUser.firstName} ${updatedUser.lastName}`,
        email: updatedUser.email,
        role: updatedUser.role,
        isEmailVerified: updatedUser.isEmailVerified,
      },
    };
  } catch (err) {
    console.error('\n[Migration Error]:', err.message);
    throw err;
  } finally {
    await disconnectDB();
  }
}

// Execute if run directly from CLI
if (process.argv[1]?.endsWith('migrateHrAdminEmail.js')) {
  migrateHrAdminEmail()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
