/**
 * Dedicated Gmail SMTP Handshake Diagnostic Script — VISARTECH People
 * 
 * Verifies live TLS handshake and authentication against Gmail SMTP.
 * Strictly read-only: DOES NOT send emails, DOES NOT touch MongoDB.
 */

import { getEmailConfig, getTransporter, verifySmtpConnection } from '../services/emailService.js';

async function runTest() {
  console.log('====================================================');
  console.log('VISARTECH People — Live Gmail SMTP Handshake Test');
  console.log('====================================================');

  const config = getEmailConfig();

  // Print sanitized configuration
  console.log('\n[SMTP Configuration Loaded]');
  console.log(`  SMTP Host:       ${config.host}`);
  console.log(`  SMTP Port:       ${config.port}`);
  console.log(`  Secure (SSL):    ${config.secure}`);
  console.log(`  Authenticated:   ${config.user}`);
  console.log(`  Sender Header:   ${config.from}`);
  console.log(`  App Password:    [CONFIGURED & MASKED — ${config.pass.length} chars]`);

  console.log('\n[Initiating Handshake]');
  console.log('  Connecting to Gmail SMTP server...');

  const startTime = Date.now();
  const result = await verifySmtpConnection();
  const duration = Date.now() - startTime;

  if (result.success) {
    console.log(`\n[SUCCESS] Gmail SMTP Handshake Accepted (${duration}ms)`);
    console.log(`  Server Status:   ${result.message}`);
    console.log('  Auth Protocol:   LOGIN / PLAIN via TLS');
    console.log('  Mail Dispatch:   READY');
    process.exit(0);
  } else {
    console.error(`\n[FAILED] Handshake rejected (${duration}ms)`);
    console.error(`  Error Code:      ${result.code || 'N/A'}`);
    console.error(`  Error Message:   ${result.message}`);
    process.exit(1);
  }
}

runTest();
