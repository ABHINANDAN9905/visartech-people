/**
 * Gmail Email Delivery Service — VISARTECH People HRMS
 *
 * Provides resilient, secure email delivery using Nodemailer and Gmail SMTP.
 * Configured via environment variables:
 *  - SMTP_HOST (defaults to 'smtp.gmail.com')
 *  - SMTP_PORT (defaults to 465)
 *  - SMTP_SECURE (defaults to true for port 465)
 *  - SMTP_USER (e.g. 'kumarabhinandan1307@gmail.com')
 *  - SMTP_APP_PASSWORD (16-character Google App Password)
 *  - EMAIL_FROM (e.g. '"VISARTECH People" <kumarabhinandan1307@gmail.com>')
 *
 * Security Rules:
 *  - App passwords are NEVER logged or exposed in error messages.
 *  - Safe fallback when credentials are not yet configured.
 *  - All templates feature responsive HTML with inline CSS and plain text versions.
 */

import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

/**
 * Retrieve sanitized email service configuration
 */
export function getEmailConfig() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const secure = process.env.SMTP_SECURE === 'false' ? false : (port === 465 || process.env.SMTP_SECURE === 'true');
  const user = (process.env.SMTP_USER || process.env.EMAIL_USER || process.env.GMAIL_USER || 'kumarabhinandan1307@gmail.com').trim();
  const rawPass = process.env.SMTP_APP_PASSWORD || process.env.SMTP_PASS || process.env.EMAIL_PASS || process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASSWORD || '';
  // Strip any internal spaces from 16-character Google App Passwords
  const pass = rawPass.replace(/\s+/g, '');
  const from = process.env.EMAIL_FROM || `"VISARTECH People" <${user}>`;

  const isConfigured = Boolean(user && pass && pass.length > 0);

  return {
    host,
    port,
    secure,
    user,
    pass,
    from,
    isConfigured,
  };
}

/**
 * Validate that mandatory SMTP environment variables are present
 * @returns {{ valid: boolean, missing: string[] }}
 */
export function validateEmailEnv() {
  const missing = [];
  if (!process.env.SMTP_USER && !process.env.EMAIL_USER && !process.env.GMAIL_USER) {
    missing.push('SMTP_USER');
  }
  if (!process.env.SMTP_APP_PASSWORD && !process.env.SMTP_PASS && !process.env.EMAIL_PASS && !process.env.GMAIL_APP_PASSWORD && !process.env.SMTP_PASSWORD) {
    missing.push('SMTP_APP_PASSWORD');
  }
  return {
    valid: missing.length === 0,
    missing,
  };
}

let transporterInstance = null;

/**
 * Get or initialize the Nodemailer transporter instance
 */
export function getTransporter() {
  const config = getEmailConfig();

  if (!config.isConfigured) {
    return null;
  }

  if (!transporterInstance) {
    transporterInstance = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
      family: 4, // Force IPv4 DNS resolution to prevent container IPv6 routing issues on Render
      connectionTimeout: 15000, // 15s
      greetingTimeout: 10000,    // 10s
      socketTimeout: 30000,     // 30s
    });
  }

  return transporterInstance;
}

/**
 * Reset transporter instance (useful for unit tests or config reload)
 */
export function resetTransporter() {
  transporterInstance = null;
}

/**
 * Verify connection to the SMTP server without sending an email
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export async function verifySmtpConnection() {
  const envCheck = validateEmailEnv();
  if (!envCheck.valid) {
    return {
      success: false,
      message: `SMTP configuration incomplete. Missing environment variable(s): ${envCheck.missing.join(', ')}`,
      missing: envCheck.missing,
    };
  }

  const transporter = getTransporter();
  if (!transporter) {
    return {
      success: false,
      message: 'SMTP transporter could not be initialized. Check SMTP_USER and SMTP_APP_PASSWORD in .env.',
    };
  }

  try {
    await transporter.verify();
    return {
      success: true,
      message: 'SMTP connection verified successfully. Ready to send emails.',
    };
  } catch (err) {
    let cleanMessage = 'SMTP connection failed';
    if (err.code === 'EAUTH') {
      cleanMessage = 'SMTP authentication failed. Verify that your Google App Password is correct and active.';
    } else if (err.code === 'ETIMEDOUT' || err.code === 'ESOCKETTIMEDOUT') {
      cleanMessage = 'SMTP connection timed out. Check your network or firewall rules for port ' + (process.env.SMTP_PORT || '465') + '.';
    } else if (err.code === 'ECONNREFUSED') {
      cleanMessage = 'SMTP connection refused by host. Check SMTP_HOST and SMTP_PORT.';
    } else {
      cleanMessage = `SMTP error: ${err.message || 'Unknown network error'}`;
    }

    return {
      success: false,
      message: cleanMessage,
      code: err.code,
    };
  }
}

// ---------------------------------------------------------------------------
// HTML Email Layout and Templates
// ---------------------------------------------------------------------------

/**
 * Wrap content inside the responsive VISARTECH People branded master email frame
 */
export function masterEmailLayout({ title, previewText, bodyContent }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #F8FAFC;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #334155;
      -webkit-font-smoothing: antialiased;
    }
    table { border-collapse: collapse; }
    .container {
      max-width: 580px;
      margin: 30px auto;
      background-color: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
    }
    .header {
      background-color: #0F172A;
      padding: 28px 32px;
      text-align: left;
      border-bottom: 3px solid #356AE6;
    }
    .brand-title {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #FFFFFF;
      margin: 0;
    }
    .brand-badge {
      display: inline-block;
      background-color: rgba(53, 106, 230, 0.2);
      border: 1px solid rgba(53, 106, 230, 0.4);
      color: #60A5FA;
      font-size: 11px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 9999px;
      margin-left: 6px;
      vertical-align: middle;
    }
    .tagline {
      font-size: 12px;
      color: #94A3B8;
      margin-top: 4px;
      font-weight: 500;
    }
    .content {
      padding: 36px 32px;
      line-height: 1.6;
    }
    .button-container {
      text-align: center;
      margin: 32px 0;
    }
    .button {
      display: inline-block;
      background-color: #356AE6;
      color: #FFFFFF !important;
      font-size: 14px;
      font-weight: 700;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 10px;
      box-shadow: 0 4px 10px rgba(53, 106, 230, 0.3);
    }
    .notice-box {
      background-color: #F1F5F9;
      border-left: 4px solid #356AE6;
      padding: 14px 16px;
      border-radius: 6px;
      font-size: 12px;
      color: #475569;
      margin: 24px 0 16px 0;
    }
    .footer {
      background-color: #F8FAFC;
      border-top: 1px solid #E2E8F0;
      padding: 20px 32px;
      text-align: center;
      font-size: 11px;
      color: #94A3B8;
    }
    .link-fallback {
      font-size: 11px;
      color: #64748B;
      word-break: break-all;
      background-color: #F8FAFC;
      padding: 8px 12px;
      border-radius: 6px;
      border: 1px solid #E2E8F0;
    }
  </style>
</head>
<body>
  <div style="display: none; max-height: 0px; overflow: hidden; opacity: 0;">${previewText}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding: 16px;">
        <div class="container">
          <div class="header">
            <h1 class="brand-title">VISARTECH<span class="brand-badge">People</span></h1>
            <div class="tagline">One Platform. Every People Operation.</div>
          </div>
          <div class="content">
            ${bodyContent}
          </div>
          <div class="footer">
            <p style="margin: 0 0 6px 0;">&copy; ${new Date().getFullYear()} VISARTECH People HRMS. All rights reserved.</p>
            <p style="margin: 0;">This is an automated system notification. Please do not reply directly to this email.</p>
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * 1. HR Email Verification Template
 */
export function getVerificationEmailTemplate({ name, verificationUrl, expiresHours = 24 }) {
  const title = 'Verify Your HR Administrator Email';
  const previewText = `Verify your email address for VISARTECH People HRMS.`;

  const bodyContent = `
    <h2 style="font-size: 18px; font-weight: 700; color: #0F172A; margin: 0 0 16px 0;">
      Verify Your Email Address
    </h2>
    <p style="font-size: 14px; margin: 0 0 16px 0; color: #334155;">
      Hello <strong>${name || 'Administrator'}</strong>,
    </p>
    <p style="font-size: 14px; margin: 0 0 20px 0; color: #334155;">
      You have requested to connect your Gmail address as the primary identity for your <strong>HR Administrator</strong> account on VISARTECH People.
    </p>
    <p style="font-size: 14px; margin: 0 0 24px 0; color: #334155;">
      Please confirm this email address by clicking the verification button below:
    </p>

    <div class="button-container">
      <a href="${verificationUrl}" class="button" target="_blank" rel="noopener noreferrer">
        Verify Email Address
      </a>
    </div>

    <div class="notice-box">
      <strong>Security Notice:</strong> This verification link is valid for <strong>${expiresHours} hours</strong>. If you did not initiate this request, no action is needed and your account remains unchanged.
    </div>

    <p style="font-size: 12px; color: #64748B; margin-top: 24px;">
      If the button above does not work, copy and paste this URL into your browser:
    </p>
    <div class="link-fallback">${verificationUrl}</div>
  `;

  const html = masterEmailLayout({ title, previewText, bodyContent });
  const text = `VISARTECH People — Verify Your HR Administrator Email\n\n` +
    `Hello ${name || 'Administrator'},\n\n` +
    `Please confirm your Gmail address for VISARTECH People HRMS by visiting the link below:\n\n` +
    `${verificationUrl}\n\n` +
    `This link expires in ${expiresHours} hours.\n` +
    `If you did not initiate this request, you can safely ignore this email.\n\n` +
    `VISARTECH People — One Platform. Every People Operation.`;

  return { subject: 'Verify Your Email Address — VISARTECH People', html, text };
}

/**
 * 2. Password Reset Email Template
 */
export function getPasswordResetEmailTemplate({ name, resetUrl, expiresMinutes = 30 }) {
  const title = 'Reset Your VISARTECH People Password';
  const previewText = `Password reset request for your VISARTECH People account.`;

  const bodyContent = `
    <h2 style="font-size: 18px; font-weight: 700; color: #0F172A; margin: 0 0 16px 0;">
      Password Reset Request
    </h2>
    <p style="font-size: 14px; margin: 0 0 16px 0; color: #334155;">
      Hello <strong>${name || 'there'}</strong>,
    </p>
    <p style="font-size: 14px; margin: 0 0 20px 0; color: #334155;">
      We received a request to reset the password for your VISARTECH People account. Click the button below to choose a new password:
    </p>

    <div class="button-container">
      <a href="${resetUrl}" class="button" target="_blank" rel="noopener noreferrer">
        Reset Password
      </a>
    </div>

    <div class="notice-box">
      <strong>Notice:</strong> This link is strictly for one-time use and will expire in <strong>${expiresMinutes} minutes</strong>. If you did not request a password reset, your password remains secure and you can disregard this message.
    </div>

    <p style="font-size: 12px; color: #64748B; margin-top: 24px;">
      If the button above does not work, copy and paste this URL into your browser:
    </p>
    <div class="link-fallback">${resetUrl}</div>
  `;

  const html = masterEmailLayout({ title, previewText, bodyContent });
  const text = `VISARTECH People — Password Reset Request\n\n` +
    `Hello ${name || 'there'},\n\n` +
    `We received a request to reset your password. Click or paste the link below to set a new password:\n\n` +
    `${resetUrl}\n\n` +
    `This link expires in ${expiresMinutes} minutes.\n` +
    `If you did not request this, please ignore this email.\n\n` +
    `VISARTECH People — One Platform. Every People Operation.`;

  return { subject: 'Password Reset Request — VISARTECH People', html, text };
}

/**
 * 3. Employee Invitation Email Template
 */
export function getInvitationEmailTemplate({
  name,
  employeeId,
  jobTitle,
  department,
  temporaryPassword,
  loginUrl,
}) {
  const title = 'Welcome to VISARTECH People — Complete Your Account Setup';
  const previewText = `Your employee workspace account has been created on VISARTECH People. Set up your password to begin.`;

  const bodyContent = `
    <h2 style="font-size: 18px; font-weight: 700; color: #0F172A; margin: 0 0 16px 0;">
      Welcome to the Team!
    </h2>
    <p style="font-size: 14px; margin: 0 0 16px 0; color: #334155;">
      Hello <strong>${name}</strong>,
    </p>
    <p style="font-size: 14px; margin: 0 0 20px 0; color: #334155;">
      Your employee account on the <strong>VISARTECH People</strong> HRMS platform is now ready. Below are your employee onboarding details:
    </p>

    <table style="width: 100%; background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; margin: 20px 0; padding: 12px 16px; font-size: 13px;">
      <tr>
        <td style="padding: 6px 0; color: #64748B; width: 140px;">Employee ID:</td>
        <td style="padding: 6px 0; font-weight: 700; color: #0F172A;">${employeeId}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #64748B;">Role & Title:</td>
        <td style="padding: 6px 0; font-weight: 600; color: #0F172A;">${jobTitle} (${department})</td>
      </tr>
      ${temporaryPassword ? `
      <tr>
        <td style="padding: 6px 0; color: #64748B;">Initial Password:</td>
        <td style="padding: 6px 0; font-family: monospace; font-size: 13px; font-weight: 700; color: #356AE6;">${temporaryPassword}</td>
      </tr>
      ` : ''}
    </table>

    <p style="font-size: 14px; margin: 0 0 20px 0; color: #334155;">
      Please click the button below to choose your password and activate your workspace account:
    </p>

    <div class="button-container">
      <a href="${loginUrl}" class="button" target="_blank" rel="noopener noreferrer">
        Set Up Password & Activate Account
      </a>
    </div>

    <div class="notice-box">
      <strong>Security Notice:</strong> This single-use onboarding invitation link is valid for <strong>48 hours</strong>. It will allow you to create your confidential password and immediately access your workspace.
    </div>

    <p style="font-size: 12px; color: #64748B; margin-top: 24px;">
      If the button above does not work, copy and paste this URL directly into your browser:
    </p>
    <div class="link-fallback">${loginUrl}</div>
  `;

  const html = masterEmailLayout({ title, previewText, bodyContent });
  const text = `Welcome to VISARTECH People!\n\n` +
    `Hello ${name},\n\n` +
    `Your employee workspace account has been created.\n` +
    `Employee ID: ${employeeId}\n` +
    `Role: ${jobTitle} (${department})\n` +
    (temporaryPassword ? `Temporary Password: ${temporaryPassword}\n` : '') +
    `Click or paste the link below to set up your password and activate your account:\n` +
    `${loginUrl}\n\n` +
    `This single-use invitation link expires in 48 hours.\n\n` +
    `VISARTECH People — One Platform. Every People Operation.`;

  return { subject: 'Welcome to VISARTECH People — Account Setup & Password Creation', html, text };
}

/**
 * 4. Integration Test Email Template
 */
export function getIntegrationTestEmailTemplate({ recipientEmail }) {
  const title = 'Email Integration Test — VISARTECH People';
  const previewText = 'Confirmation that VISARTECH People email delivery service is operational.';

  const bodyContent = `
    <h2 style="font-size: 18px; font-weight: 700; color: #0F172A; margin: 0 0 16px 0;">
      Email Service Operational
    </h2>
    <p style="font-size: 14px; margin: 0 0 16px 0; color: #334155;">
      Hello <strong>HR Administrator</strong>,
    </p>
    <p style="font-size: 14px; margin: 0 0 20px 0; color: #334155;">
      This email confirms that the <strong>VISARTECH People</strong> Gmail SMTP integration has been successfully configured and verified.
    </p>

    <table style="width: 100%; background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; margin: 20px 0; padding: 12px 16px; font-size: 13px;">
      <tr>
        <td style="padding: 6px 0; color: #64748B; width: 140px;">Delivery Status:</td>
        <td style="padding: 6px 0; font-weight: 700; color: #16A34A;">VERIFIED & ACTIVE</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #64748B;">Transport Protocol:</td>
        <td style="padding: 6px 0; font-weight: 600; color: #0F172A;">Gmail SMTP (Port 465 SSL)</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #64748B;">Target Identity:</td>
        <td style="padding: 6px 0; font-weight: 600; color: #0F172A;">${recipientEmail}</td>
      </tr>
      <tr>
        <td style="padding: 6px 0; color: #64748B;">Timestamp:</td>
        <td style="padding: 6px 0; font-weight: 600; color: #64748B;">${new Date().toUTCString()}</td>
      </tr>
    </table>

    <div class="notice-box">
      <strong>Next Step:</strong> You can now proceed to link this verified Gmail address with your HR Administrator account (<strong>ADM-001</strong>).
    </div>

    <p style="font-size: 12px; color: #64748B; margin-top: 24px;">
      VISARTECH People HRMS &bull; One Platform. Every People Operation.
    </p>
  `;

  const html = masterEmailLayout({ title, previewText, bodyContent });
  const text = `VISARTECH People - Email Integration Test\n\n` +
    `Hello HR Administrator,\n\n` +
    `This email confirms that the VISARTECH People Gmail SMTP integration is working successfully.\n\n` +
    `Delivery Status: VERIFIED & ACTIVE\n` +
    `Transport: Gmail SMTP (Port 465 SSL)\n` +
    `Target Identity: ${recipientEmail}\n` +
    `Timestamp: ${new Date().toUTCString()}\n\n` +
    `VISARTECH People HRMS — One Platform. Every People Operation.`;

  return { subject: 'VISARTECH People - Email Integration Test', html, text };
}

// ---------------------------------------------------------------------------
// High-Level Email Sending Methods
// ---------------------------------------------------------------------------

/**
 * Dispatch an email with standard validation and error handling
 * @param {{ to: string, subject: string, html: string, text: string }} options
 * @returns {Promise<{ success: boolean, messageId?: string, message: string }>}
 */
export async function sendEmail({ to, subject, html, text }) {
  if (!to || !to.trim()) {
    throw new Error('Recipient email address is required');
  }
  if (!subject || !subject.trim()) {
    throw new Error('Email subject is required');
  }

  const config = getEmailConfig();
  if (!config.isConfigured) {
    const errorMsg = 'Email service is not configured. Missing SMTP_USER or SMTP_APP_PASSWORD in environment.';
    if (process.env.NODE_ENV !== 'test') {
      console.log(`[EmailService] ${errorMsg}`);
    }
    return {
      success: false,
      message: errorMsg,
      notConfigured: true,
    };
  }

  const transporter = getTransporter();
  if (!transporter) {
    return {
      success: false,
      message: 'SMTP transporter unavailable',
    };
  }

  try {
    console.log(`[EmailService] Attempting delivery to: ${to.trim().toLowerCase()}`);
    const info = await transporter.sendMail({
      from: config.from,
      to: to.trim().toLowerCase(),
      subject,
      html,
      text,
    });

    const isAccepted = info.accepted && info.accepted.length > 0;

    if (!isAccepted) {
      console.warn(`[EmailService] Email not accepted by SMTP recipient: ${to}`);
      return {
        success: false,
        message: 'Email was not accepted by SMTP recipient server.',
      };
    }

    console.log(`[EmailService] Email delivered successfully. MessageId: ${info.messageId}`);
    return {
      success: true,
      messageId: info.messageId,
      message: 'Email dispatched successfully.',
    };
  } catch (err) {
    let cleanError = 'Failed to deliver email.';
    if (err.code === 'EAUTH') {
      cleanError = 'SMTP authentication failure. Google App Password may be invalid, missing, or expired.';
    } else if (err.code === 'ETIMEDOUT' || err.code === 'ESOCKETTIMEDOUT') {
      cleanError = 'Connection to SMTP server timed out.';
    } else if (err.code === 'ECONNREFUSED') {
      cleanError = 'Connection refused by SMTP server.';
    } else if (err.message) {
      cleanError = `SMTP Delivery Error: ${err.message}`;
    }

    console.error(`[EmailService Error]: Code=${err.code || 'UNKNOWN'} Reason=${cleanError}`);
    return {
      success: false,
      message: cleanError,
      code: err.code,
    };
  }
}

/**
 * Send an HR email verification link
 */
export async function sendVerificationEmail({ to, name, verificationUrl }) {
  const template = getVerificationEmailTemplate({ name, verificationUrl });
  return sendEmail({
    to,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });
}

/**
 * Send a password reset link
 */
export async function sendPasswordResetEmail({ to, name, resetUrl }) {
  const template = getPasswordResetEmailTemplate({ name, resetUrl });
  return sendEmail({
    to,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });
}

/**
 * Send an employee onboarding invitation
 */
export async function sendEmployeeInvitationEmail({
  to,
  name,
  employeeId,
  jobTitle,
  department,
  temporaryPassword,
  loginUrl,
}) {
  const template = getInvitationEmailTemplate({
    name,
    employeeId,
    jobTitle,
    department,
    temporaryPassword,
    loginUrl,
  });
  return sendEmail({
    to,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });
}

export default {
  getEmailConfig,
  validateEmailEnv,
  getTransporter,
  resetTransporter,
  verifySmtpConnection,
  getVerificationEmailTemplate,
  getPasswordResetEmailTemplate,
  getInvitationEmailTemplate,
  getIntegrationTestEmailTemplate,
  masterEmailLayout,
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendEmployeeInvitationEmail,
};
