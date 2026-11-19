/**
 * Read-only canonical user inventory query for Phase 8 audit.
 * Does NOT modify any records.
 */
import { connectDB, disconnectDB } from '../config/db.js';
import { User } from '../models/index.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

await connectDB();

const users = await User.find(
  {},
  'employeeId firstName lastName email role jobTitle department employmentStatus joiningDate'
).sort({ employeeId: 1 }).lean();

console.log('\n========================================');
console.log('CANONICAL USER INVENTORY — MONGODB ATLAS');
console.log('========================================');
console.log(`Total records: ${users.length}`);
console.log('');

for (const u of users) {
  console.log(`  employeeId:       ${u.employeeId}`);
  console.log(`  name:             ${u.firstName} ${u.lastName}`);
  console.log(`  email:            ${u.email}`);
  console.log(`  role:             ${u.role}`);
  console.log(`  jobTitle:         ${u.jobTitle}`);
  console.log(`  department:       ${u.department}`);
  console.log(`  employmentStatus: ${u.employmentStatus}`);
  console.log('  ---');
}

await disconnectDB();
process.exit(0);
