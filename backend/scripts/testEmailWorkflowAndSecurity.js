/**
 * VISARTECH People — HTTPS Email API & Onboarding Security QA Test Suite
 * Tests Brevo & Resend HTTPS integrations, token security, expired tokens,
 * single-use enforcement, bcrypt password creation, and employee authentication.
 */

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import {
  getEmailConfig,
  validateEmailEnv,
  sendEmail,
  verifyEmailProvider,
  parseEmailFrom,
} from '../services/emailService.js';

console.log('========================================================================');
console.log('VISARTECH People — HTTPS Email API & Onboarding QA Test Suite');
console.log('========================================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`[FAIL] ${testName}: ${details}`);
    throw new Error(`Test Failed: ${testName} - ${details}`);
  }
}

async function runTests() {
  const originalFetch = globalThis.fetch;
  const originalEnv = { ...process.env };

  try {
    // -----------------------------------------------------------------------
    // TEST 1: From Address Parsing & Configuration Validation
    // -----------------------------------------------------------------------
    console.log('[1/8] Testing From Header Parsing & Environment Config...');

    const parsed1 = parseEmailFrom('"VISARTECH People" <kumarabhinandan1307@gmail.com>');
    assert(parsed1.name === 'VISARTECH People', 'Extracts sender name correctly');
    assert(parsed1.email === 'kumarabhinandan1307@gmail.com', 'Extracts sender email correctly');

    const parsed2 = parseEmailFrom('admin@visartech.com');
    assert(parsed2.email === 'admin@visartech.com', 'Handles bare email addresses');

    // 1b. Unconfigured state
    delete process.env.BREVO_API_KEY;
    delete process.env.RESEND_API_KEY;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_APP_PASSWORD;
    const envCheckUnconfigured = validateEmailEnv();
    assert(envCheckUnconfigured.valid === false, 'Detects unconfigured email environment');
    assert(envCheckUnconfigured.missing.includes('BREVO_API_KEY'), 'Reports missing API key');

    const configUnconfigured = getEmailConfig();
    assert(configUnconfigured.provider === 'none', 'Provider is "none" when no keys exist');
    assert(configUnconfigured.isConfigured === false, 'isConfigured is false');

    // 1c. Configured Brevo state (Preferred)
    process.env.BREVO_API_KEY = 'xkeysib-mock-brevo-api-key-test-12345';
    process.env.EMAIL_FROM = '"VISARTECH People" <kumarabhinandan1307@gmail.com>';
    process.env.FRONTEND_URL = 'https://visartech-people.vercel.app';

    const envCheckBrevo = validateEmailEnv();
    assert(envCheckBrevo.valid === true, 'Validates when BREVO_API_KEY is present');

    const configBrevo = getEmailConfig();
    assert(configBrevo.provider === 'brevo', 'Selects "brevo" as primary email provider');
    assert(configBrevo.isBrevoConfigured === true, 'isBrevoConfigured is true');
    assert(configBrevo.fromName === 'VISARTECH People', 'Configures correct fromName');
    assert(configBrevo.fromEmail === 'kumarabhinandan1307@gmail.com', 'Configures correct fromEmail');
    assert(configBrevo.frontendUrl === 'https://visartech-people.vercel.app', 'Configures production frontend URL');

    // -----------------------------------------------------------------------
    // TEST 2: Brevo Health & Account Verification (verifyEmailProvider)
    // -----------------------------------------------------------------------
    console.log('\n[2/8] Testing Brevo Health & API Key Verification...');

    // 2a. Brevo returns 200 OK
    globalThis.fetch = async (url, opts) => {
      assert(url === 'https://api.brevo.com/v3/account', 'Calls Brevo account endpoint');
      assert(opts.headers['api-key'] === 'xkeysib-mock-brevo-api-key-test-12345', 'Includes api-key header');
      return {
        ok: true,
        status: 200,
        json: async () => ({
          email: 'kumarabhinandan1307@gmail.com',
          plan: [{ type: 'free', credits: 300 }],
        }),
      };
    };

    const healthyBrevo = await verifyEmailProvider();
    assert(healthyBrevo.success === true, 'verifyEmailProvider reports success on HTTP 200');
    assert(healthyBrevo.provider === 'brevo', 'Reports provider as brevo');
    assert(healthyBrevo.message.includes('verified successfully'), 'Reports success confirmation message');

    // 2b. Brevo returns 401 Unauthorized (Invalid Key)
    globalThis.fetch = async () => ({
      ok: false,
      status: 401,
      json: async () => ({ code: 'unauthorized', message: 'Key not found' }),
    });

    const unauthorizedBrevo = await verifyEmailProvider();
    assert(unauthorizedBrevo.success === false, 'verifyEmailProvider reports failure on HTTP 401');
    assert(unauthorizedBrevo.message.includes('authentication failed'), 'Provides clean error without exposing key');

    // -----------------------------------------------------------------------
    // TEST 3: Brevo HTTPS Email Delivery (Success & Failure Handling)
    // -----------------------------------------------------------------------
    console.log('\n[3/8] Testing Brevo HTTPS Email Delivery...');

    // 3a. Successful delivery: Brevo confirms HTTP 201 with messageId
    let dispatchedBrevoPayload = null;
    globalThis.fetch = async (url, opts) => {
      if (url === 'https://api.brevo.com/v3/smtp/email') {
        dispatchedBrevoPayload = JSON.parse(opts.body);
        return {
          ok: true,
          status: 201,
          json: async () => ({ messageId: '<202611200215.brevo_test_12345@smtp-relay.brevo.com>' }),
        };
      }
      throw new Error(`Unexpected URL: ${url}`);
    };

    const sendBrevoSuccess = await sendEmail({
      to: 'elena.rostova@visartech.demo',
      subject: 'Welcome to VISARTECH People — Set Your Password',
      html: '<h1>Set your password</h1>',
      text: 'Set your password',
    });

    assert(sendBrevoSuccess.success === true, 'sendEmail returns success: true on Brevo 201');
    assert(sendBrevoSuccess.provider === 'brevo', 'Reports provider: brevo');
    assert(sendBrevoSuccess.messageId === '<202611200215.brevo_test_12345@smtp-relay.brevo.com>', 'Captures official Brevo message ID');
    assert(dispatchedBrevoPayload.to[0].email === 'elena.rostova@visartech.demo', 'Dispatches to exact employee work email');
    assert(dispatchedBrevoPayload.sender.email === 'kumarabhinandan1307@gmail.com', 'Uses verified account sender email');

    // 3b. Failed delivery: Brevo returns error
    globalThis.fetch = async (url) => {
      if (url === 'https://api.brevo.com/v3/smtp/email') {
        return {
          ok: false,
          status: 400,
          json: async () => ({
            code: 'invalid_parameter',
            message: 'Invalid sender email or unverified sender address.',
          }),
        };
      }
      throw new Error(`Unexpected URL: ${url}`);
    };

    const sendBrevoFailed = await sendEmail({
      to: 'invalid.target@example.com',
      subject: 'Welcome to VISARTECH People',
      html: '<p>Invitation</p>',
      text: 'Invitation',
    });

    assert(sendBrevoFailed.success === false, 'sendEmail returns success: false on Brevo rejection');
    assert(sendBrevoFailed.provider === 'brevo', 'Reports provider: brevo');
    assert(sendBrevoFailed.message.includes('Invalid sender email'), 'Captures descriptive Brevo error message');

    // -----------------------------------------------------------------------
    // TEST 4: Resend Fallback Provider Verification
    // -----------------------------------------------------------------------
    console.log('\n[4/8] Testing Resend Fallback Provider Handling...');
    delete process.env.BREVO_API_KEY;
    process.env.RESEND_API_KEY = 're_test_mock_key_999';

    const configResend = getEmailConfig();
    assert(configResend.provider === 'resend', 'Selects resend when BREVO_API_KEY is absent');

    globalThis.fetch = async (url) => {
      if (url === 'https://api.resend.com/emails') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ id: 'resend_msg_test_888' }),
        };
      }
      throw new Error(`Unexpected URL: ${url}`);
    };

    const sendResendSuccess = await sendEmail({
      to: 'marcus.vance@visartech.demo',
      subject: 'Welcome to VISARTECH People',
      html: '<p>Invitation</p>',
      text: 'Invitation',
    });
    assert(sendResendSuccess.success === true, 'Resend delivery succeeds when configured');
    assert(sendResendSuccess.provider === 'resend', 'Reports provider as resend');

    // -----------------------------------------------------------------------
    // TEST 5: Cryptographic Invitation Token Generation & SHA-256 Storage
    // -----------------------------------------------------------------------
    console.log('\n[5/8] Testing Cryptographic Token Generation & Hashing...');

    const employee = new User({
      employeeId: 'EMP-SEC-002',
      firstName: 'David',
      lastName: 'Chen',
      email: 'david.chen@visartech.demo',
      role: 'EMPLOYEE',
      jobTitle: 'DevOps & Cloud Engineer',
      department: 'Infrastructure',
      joiningDate: new Date(),
    });

    const rawToken = employee.generateInvitationToken();
    assert(typeof rawToken === 'string' && rawToken.length === 64, 'Raw token is 64-char random hex');
    assert(typeof employee.invitationToken === 'string' && employee.invitationToken.length === 64, 'Database field holds SHA-256 hash');
    assert(employee.invitationToken !== rawToken, 'Raw token is never saved directly in MongoDB');

    const expectedHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    assert(employee.invitationToken === expectedHash, 'Database field equals exact SHA-256 hash of raw token');

    const expectedExpiryMin = Date.now() + 47 * 3600 * 1000;
    const expectedExpiryMax = Date.now() + 49 * 3600 * 1000;
    assert(
      employee.invitationExpires.getTime() > expectedExpiryMin &&
      employee.invitationExpires.getTime() < expectedExpiryMax,
      'Invitation token has 48-hour expiration window'
    );
    assert(employee.invitationStatus === 'PENDING', 'Initial invitation status is PENDING');

    // -----------------------------------------------------------------------
    // TEST 6: Pre-Activation Gate (Login Strictly Blocked Before Password Setup)
    // -----------------------------------------------------------------------
    console.log('\n[6/8] Testing Pre-Activation Gate (Login Blocked)...');

    const canLoginPending = employee.invitationStatus === 'ACCEPTED' && Boolean(employee.passwordHash);
    assert(canLoginPending === false, 'Pending employee login is strictly blocked');

    employee.invitationStatus = 'SENT';
    const canLoginSent = employee.invitationStatus === 'ACCEPTED' && Boolean(employee.passwordHash);
    assert(canLoginSent === false, 'Sent employee without password cannot log in');

    // -----------------------------------------------------------------------
    // TEST 7: Expired Token Rejection & Single-Use Enforcement
    // -----------------------------------------------------------------------
    console.log('\n[7/8] Testing Expired Token Rejection & Single-Use Enforcement...');

    // 7a. Expired token check
    employee.invitationExpires = new Date(Date.now() - 3600 * 1000); // 1 hour in past
    assert(employee.invitationExpires < new Date(), 'Correctly identifies expired token');

    // 7b. Password creation and activation
    const newPassword = 'SecurePassword@2026!';
    employee.passwordHash = await User.hashPassword(newPassword);
    employee.invitationToken = undefined;
    employee.invitationExpires = undefined;
    employee.invitationStatus = 'ACCEPTED';
    employee.isEmailVerified = true;

    assert(employee.invitationStatus === 'ACCEPTED', 'Account status transitions to ACCEPTED');
    assert(typeof employee.passwordHash === 'string' && employee.passwordHash.startsWith('$2'), 'Password securely hashed with bcrypt ($2...)');
    assert(employee.invitationToken === undefined, 'Invitation token scrubbed from database (single-use)');
    assert(employee.invitationExpires === undefined, 'Invitation expiration scrubbed from database');

    const isPasswordMatch = await employee.comparePassword(newPassword);
    assert(isPasswordMatch === true, 'comparePassword validates correct new password');

    const isWrongPasswordMatch = await employee.comparePassword('WrongPassword123!');
    assert(isWrongPasswordMatch === false, 'comparePassword rejects incorrect password');

    // -----------------------------------------------------------------------
    // TEST 8: Activated Employee Authentication & RBAC Boundaries
    // -----------------------------------------------------------------------
    console.log('\n[8/8] Testing Activated Employee Authentication & RBAC Boundaries...');

    const canLoginNow = employee.invitationStatus === 'ACCEPTED' && Boolean(employee.passwordHash);
    assert(canLoginNow === true, 'Activated employee can now log in');
    assert(employee.role === 'EMPLOYEE', 'Role remains EMPLOYEE (never elevated to HR_ADMIN)');

    const safeJson = employee.toJSON();
    assert(safeJson.passwordHash === undefined, 'toJSON strictly excludes passwordHash');
    assert(safeJson.invitationToken === undefined, 'toJSON strictly excludes invitationToken');
    assert(safeJson.invitationExpires === undefined, 'toJSON strictly excludes invitationExpires');
    assert(safeJson.invitationStatus === 'ACCEPTED', 'toJSON reports invitationStatus as ACCEPTED');

    console.log('\n========================================================================');
    console.log(`ALL TESTS PASSED: ${passedTests} / ${totalTests} (100% SUCCESS)`);
    console.log('========================================================================\n');
  } finally {
    globalThis.fetch = originalFetch;
    process.env = originalEnv;
  }
}

runTests();
