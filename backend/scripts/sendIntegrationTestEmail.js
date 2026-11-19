/**
 * VISARTECH People — Live Single Email Delivery Test Script
 *
 * Sends a single test email to confirm real SMTP acceptance.
 * 
 * Safety Rules:
 *  - Dispatches exactly ONE email (no duplicates).
 *  - Logs ONLY message acceptance status and messageId.
 *  - Zero credential or secret exposure.
 *  - Does NOT touch MongoDB or migrate ADM-001.
 */

import { sendEmail, getIntegrationTestEmailTemplate, getEmailConfig } from '../services/emailService.js';

const TARGET_RECIPIENT = 'kumarabhinandan1307@gmail.com';
const EXPECTED_SUBJECT = 'VISARTECH People - Email Integration Test';

async function dispatchTestEmail() {
  console.log('====================================================');
  console.log('VISARTECH People — Single Email Delivery Test');
  console.log('====================================================');

  const config = getEmailConfig();
  console.log('\n[Delivery Parameters]');
  console.log(`  Recipient:       ${TARGET_RECIPIENT}`);
  console.log(`  Sender Identity: ${config.from}`);
  console.log(`  Subject:         ${EXPECTED_SUBJECT}`);
  console.log('  Credentials:     [PROTECTED]');

  const template = getIntegrationTestEmailTemplate({ recipientEmail: TARGET_RECIPIENT });

  console.log('\n[Dispatching Email via Gmail SMTP]');
  const startTime = Date.now();

  const result = await sendEmail({
    to: TARGET_RECIPIENT,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });

  const duration = Date.now() - startTime;

  if (result.success && result.messageId) {
    console.log(`\n[SUCCESS] Gmail SMTP Accepted Email (${duration}ms)`);
    console.log(`  Acceptance:      ACCEPTED`);
    console.log(`  Message ID:      ${result.messageId}`);
    console.log(`  Recipient:       ${TARGET_RECIPIENT}`);
    console.log('  Status:          DISPATCHED TO INBOX');
    process.exit(0);
  } else {
    console.error(`\n[FAILED] SMTP Delivery Rejected (${duration}ms)`);
    console.error(`  Error Message:   ${result.message || 'Unknown error'}`);
    console.error(`  Error Code:      ${result.code || 'N/A'}`);
    process.exit(1);
  }
}

dispatchTestEmail();
