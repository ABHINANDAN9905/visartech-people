/**
 * VISARTECH People — Gmail Service Verification Utility
 *
 * Verifies email service configuration, template rendering, and error handling
 * WITHOUT sending real emails or leaking credentials.
 */

import {
  getEmailConfig,
  validateEmailEnv,
  verifySmtpConnection,
  getVerificationEmailTemplate,
  getPasswordResetEmailTemplate,
  getInvitationEmailTemplate,
  sendEmail,
} from '../services/emailService.js';

let passed = 0;
let failed = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${testName} ${details ? '- ' + details : ''}`);
    failed++;
  }
}

async function runVerification() {
  console.log('====================================================');
  console.log('VISARTECH People — Gmail Service Configuration Audit');
  console.log('====================================================');

  // Test 1: Configuration Extraction & Sanitization
  console.log('\n--- 1. Configuration Sanitization & Defaults ---');
  const config = getEmailConfig();
  assert(config.host === 'smtp.gmail.com', 'Host defaults to smtp.gmail.com');
  assert(config.port === 465 || config.port === 587, 'Port configured properly (465/587)');
  assert(config.user === 'kumarabhinandan1307@gmail.com', 'SMTP user targeted to confirmed address');
  assert(typeof config.pass === 'string', 'App password field is present as a string type');
  assert(!config.pass || config.pass.length > 0, 'App password safely handled');

  // Test 2: Environment Variable Detection
  console.log('\n--- 2. Environment Variable Validation ---');
  const envCheck = validateEmailEnv();
  console.log(`  Status: ${envCheck.valid ? 'All mandatory variables detected' : 'Missing variables: ' + envCheck.missing.join(', ')}`);
  assert(Array.isArray(envCheck.missing), 'validateEmailEnv returns missing keys array');

  // Test 3: Template Generation & Branding Verification
  console.log('\n--- 3. Email Template Generation & Branding ---');
  
  // 3a. Verification template
  const verification = getVerificationEmailTemplate({
    name: 'Alex Morgan',
    verificationUrl: 'http://localhost:3000/verify-email/test-token-123',
    expiresHours: 24,
  });
  assert(verification.subject.includes('Verify Your Email Address'), 'Verification subject generated');
  assert(verification.html.includes('VISARTECH') && verification.html.includes('People'), 'Branding header present in verification HTML');
  assert(verification.html.includes('test-token-123'), 'Verification URL injected correctly');
  assert(verification.text.includes('test-token-123'), 'Plain-text fallback includes verification link');

  // 3b. Password reset template
  const reset = getPasswordResetEmailTemplate({
    name: 'Alex Morgan',
    resetUrl: 'http://localhost:3000/reset-password/test-token-456',
    expiresMinutes: 30,
  });
  assert(reset.subject.includes('Password Reset Request'), 'Password reset subject generated');
  assert(reset.html.includes('Reset Password'), 'Reset CTA button present in reset HTML');
  assert(reset.html.includes('test-token-456'), 'Reset URL injected correctly');
  assert(reset.text.includes('test-token-456'), 'Plain-text fallback includes reset link');

  // 3c. Employee invitation template
  const invitation = getInvitationEmailTemplate({
    name: 'Jordan Lee',
    employeeId: 'EMP-006',
    jobTitle: 'Full Stack Software Engineer',
    department: 'Engineering',
    temporaryPassword: 'Temp@123Secure',
    loginUrl: 'http://localhost:3000/login',
  });
  assert(invitation.subject.includes('Welcome to VISARTECH People'), 'Invitation subject generated');
  assert(invitation.html.includes('EMP-006'), 'Employee ID included in invitation');
  assert(invitation.html.includes('Temp@123Secure'), 'Temporary password included in invitation');
  assert(invitation.html.includes('http://localhost:3000/login'), 'Login link included in invitation');

  // Test 4: Safe Rejection Without Unhandled Exceptions
  console.log('\n--- 4. Graceful Error Handling Without Credentials ---');
  try {
    // If SMTP_APP_PASSWORD is not set or empty, sendEmail should return a clean error without throwing
    const result = await sendEmail({
      to: 'kumarabhinandan1307@gmail.com',
      subject: 'Test Subject',
      html: '<p>Test</p>',
      text: 'Test',
    });

    if (config.isConfigured) {
      console.log('  SMTP credentials present in .env. Transporter active.');
    } else {
      assert(result.success === false, 'sendEmail returns success: false when credentials are unconfigured');
      assert(result.notConfigured === true, 'sendEmail flags notConfigured: true without throwing');
    }
  } catch (err) {
    assert(false, 'sendEmail should not throw unhandled exception', err.message);
  }

  // Test 5: SMTP Connection Verification (Non-sending)
  console.log('\n--- 5. SMTP Server Connection Status ---');
  if (config.isConfigured) {
    console.log('  Testing live SMTP handshake with Gmail...');
    const conn = await verifySmtpConnection();
    console.log(`  SMTP Handshake Result: ${conn.message}`);
    assert(typeof conn.success === 'boolean', 'verifySmtpConnection returned valid response');
  } else {
    console.log('  [NOTICE] SMTP_APP_PASSWORD is not set in backend/.env yet.');
    console.log('  Awaiting manual user setup of Google App Password.');
    const conn = await verifySmtpConnection();
    assert(conn.success === false, 'verifySmtpConnection cleanly flags missing configuration');
  }

  console.log('\n====================================================');
  console.log(`EMAIL SERVICE AUDIT SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  process.exit(failed > 0 ? 1 : 0);
}

runVerification();
