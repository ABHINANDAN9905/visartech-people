/**
 * Email Delivery Service — VISARTECH People HRMS
 *
 * Primary Production Delivery: Resend HTTPS REST API (Port 443 HTTPS).
 * Eliminates Render Free Tier SMTP port blocking (ports 25, 465, 587 blocked by Render).
 *
 * Configured via environment variables:
 *  - RESEND_API_KEY (Official Resend API key e.g. 're_...')
 *  - EMAIL_FROM (defaults to 'VISARTECH People <onboarding@resend.dev>')
 *  - FRONTEND_URL (defaults to 'https://visartech-people.vercel.app')
 *
 * Optional Local Development Fallback:
 *  - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_APP_PASSWORD
 *
 * Security Rules:
 *  - API keys and passwords are NEVER logged or exposed in error messages or health checks.
 *  - Email delivery is only marked successful when Resend confirms HTTP 200/201 with an accepted message ID.
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
 * Parse a standard From header string into name and email address components
 * e.g. '"VISARTECH People" <kumarabhinandan1307@gmail.com>' -> { name: 'VISARTECH People', email: 'kumarabhinandan1307@gmail.com' }
 */
export function parseEmailFrom(fromStr) {
  if (!fromStr || typeof fromStr !== 'string') {
    return { name: 'VISARTECH People', email: 'kumarabhinandan1307@gmail.com' };
  }
  const match = fromStr.match(/^(?:"?([^"]*)"?\s)?<?([^>]+)>?$/);
  if (match) {
    const rawName = (match[1] || 'VISARTECH People').trim();
    const rawEmail = (match[2] || fromStr).trim().toLowerCase();
    return { name: rawName, email: rawEmail };
  }
  return { name: 'VISARTECH People', email: fromStr.trim().toLowerCase() };
}

/**
 * Retrieve sanitized email service configuration
 */
export function getEmailConfig() {
  const brevoApiKey = (process.env.BREVO_API_KEY || '').trim();
  const resendApiKey = (process.env.RESEND_API_KEY || '').trim();
  const defaultFrom = '"VISARTECH People" <kumarabhinandan1307@gmail.com>';
  const from = (process.env.EMAIL_FROM || defaultFrom).trim();
  const parsedFrom = parseEmailFrom(from);
  const frontendUrl = (process.env.FRONTEND_URL || process.env.CLIENT_ORIGIN || 'https://visartech-people.vercel.app').replace(/\/+$/, '');

  // Backward compatibility check for local development SMTP
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = parseInt(process.env.SMTP_PORT || '465', 10);
  const smtpSecure = process.env.SMTP_SECURE === 'false' ? false : (smtpPort === 465 || process.env.SMTP_SECURE === 'true');
  const smtpUser = (process.env.SMTP_USER || process.env.EMAIL_USER || process.env.GMAIL_USER || '').trim();
  const rawPass = process.env.SMTP_APP_PASSWORD || process.env.SMTP_PASS || process.env.EMAIL_PASS || process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASSWORD || '';
  const smtpPass = rawPass.replace(/\s+/g, '');
  const hasSmtp = Boolean(smtpUser && smtpPass);

  const isBrevoConfigured = Boolean(brevoApiKey && brevoApiKey.length > 0);
  const isResendConfigured = Boolean(resendApiKey && resendApiKey.length > 0);

  // In production (e.g. Render Free Tier), outbound SMTP is blocked at network level.
  // Never silently fall back to blocked SMTP in production.
  const isProduction = process.env.NODE_ENV === 'production';
  let provider = 'none';
  if (isBrevoConfigured) {
    provider = 'brevo';
  } else if (isResendConfigured) {
    provider = 'resend';
  } else if (hasSmtp && !isProduction) {
    provider = 'smtp';
  }

  const isConfigured = provider !== 'none';

  return {
    provider,
    brevoApiKey,
    isBrevoConfigured,
    resendApiKey,
    isResendConfigured,
    from,
    fromName: parsedFrom.name,
    fromEmail: parsedFrom.email,
    frontendUrl,
    isConfigured,
    // SMTP fields
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    user: smtpUser,
    pass: smtpPass,
    hasSmtp,
  };
}

/**
 * Validate that mandatory environment variables are present
 * @returns {{ valid: boolean, missing: string[] }}
 */
export function validateEmailEnv() {
  const missing = [];
  if (!process.env.BREVO_API_KEY && !process.env.RESEND_API_KEY) {
    if (!process.env.SMTP_USER && !process.env.SMTP_APP_PASSWORD) {
      missing.push('BREVO_API_KEY');
    }
  }
  return {
    valid: missing.length === 0,
    missing,
  };
}

let transporterInstance = null;

/**
 * Get or initialize the Nodemailer transporter instance (Local Dev SMTP only)
 */
export function getTransporter() {
  const config = getEmailConfig();

  if (!config.hasSmtp) {
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
      family: 4,
      connectionTimeout: 15000,
      greetingTimeout: 10000,
      socketTimeout: 30000,
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
 * Verify Brevo or Resend API connection or local dev SMTP without sending an email
 * @returns {Promise<{ success: boolean, provider: string, message: string, statusCode?: number }>}
 */
export async function verifyEmailProvider() {
  const config = getEmailConfig();

  // 1. Brevo HTTPS Account API
  if (config.provider === 'brevo') {
    try {
      const response = await fetch('https://api.brevo.com/v3/account', {
        method: 'GET',
        headers: {
          'api-key': config.brevoApiKey,
          accept: 'application/json',
          'User-Agent': 'VISARTECH-People-HRMS/1.0',
        },
      });

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        const planName = data.plan?.[0]?.type || 'Active';
        return {
          success: true,
          provider: 'brevo',
          message: `Brevo API connection and credentials verified successfully. Plan: ${planName}. Ready to send emails over HTTPS.`,
          statusCode: response.status,
          accountEmail: data.email || null,
        };
      }

      if (response.status === 401 || response.status === 403) {
        return {
          success: false,
          provider: 'brevo',
          message: 'Brevo API authentication failed. Verify that BREVO_API_KEY is valid and active in environment settings.',
          statusCode: response.status,
        };
      }

      const errData = await response.json().catch(() => ({}));
      return {
        success: false,
        provider: 'brevo',
        message: errData.message || `Brevo API returned HTTP ${response.status}`,
        statusCode: response.status,
      };
    } catch (err) {
      return {
        success: false,
        provider: 'brevo',
        message: `Network error connecting to Brevo HTTPS API: ${err.message}`,
      };
    }
  }

  // 2. Resend HTTPS API
  if (config.provider === 'resend') {
    try {
      const response = await fetch('https://api.resend.com/api-keys', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${config.resendApiKey}`,
          'User-Agent': 'VISARTECH-People-HRMS/1.0',
        },
      });

      if (response.ok) {
        return {
          success: true,
          provider: 'resend',
          message: 'Resend API connection and credentials verified successfully. Ready to send emails over HTTPS.',
          statusCode: response.status,
        };
      }

      if (response.status === 401 || response.status === 403) {
        return {
          success: false,
          provider: 'resend',
          message: 'Resend API authentication failed. Verify that RESEND_API_KEY is valid and active in environment settings.',
          statusCode: response.status,
        };
      }

      const errData = await response.json().catch(() => ({}));
      return {
        success: false,
        provider: 'resend',
        message: errData.message || `Resend API returned HTTP ${response.status}`,
        statusCode: response.status,
      };
    } catch (err) {
      return {
        success: false,
        provider: 'resend',
        message: `Network error connecting to Resend HTTPS API: ${err.message}`,
      };
    }
  }

  // 3. Local SMTP
  if (config.provider === 'smtp') {
    const transporter = getTransporter();
    if (!transporter) {
      return {
        success: false,
        provider: 'smtp',
        message: 'SMTP transporter could not be initialized.',
      };
    }

    try {
      await transporter.verify();
      return {
        success: true,
        provider: 'smtp',
        message: 'Local development SMTP connection verified successfully.',
      };
    } catch (err) {
      let cleanMessage = 'SMTP connection failed';
      if (err.code === 'EAUTH') {
        cleanMessage = 'SMTP authentication failed. Verify that your Google App Password is correct and active.';
      } else if (err.code === 'ETIMEDOUT' || err.code === 'ESOCKETTIMEDOUT') {
        cleanMessage = 'SMTP connection timed out. Outbound SMTP ports (25, 465, 587) are blocked on cloud hosts like Render. Use BREVO_API_KEY instead.';
      } else {
        cleanMessage = `SMTP error: ${err.message || 'Unknown network error'}`;
      }

      return {
        success: false,
        provider: 'smtp',
        message: cleanMessage,
        code: err.code,
      };
    }
  }

  return {
    success: false,
    provider: 'none',
    message: 'Email service is not configured. Missing BREVO_API_KEY in environment variables.',
    missing: ['BREVO_API_KEY'],
  };
}

export const verifySmtpConnection = verifyEmailProvider;

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

  const cleanRecipient = to.trim().toLowerCase();
  const config = getEmailConfig();

  if (!config.isConfigured) {
    const errorMsg = 'Email service is not configured. Missing BREVO_API_KEY in environment.';
    if (process.env.NODE_ENV !== 'test') {
      console.log(`[EmailService] ${errorMsg}`);
    }
    return {
      success: false,
      message: errorMsg,
      notConfigured: true,
    };
  }

  // 1. Preferred Production Engine: Brevo (Sendinblue) HTTPS Transactional API (Port 443)
  if (config.provider === 'brevo') {
    try {
      console.log(`[EmailService/Brevo] Attempting HTTPS delivery to: ${cleanRecipient}`);

      const payload = {
        sender: {
          name: config.fromName,
          email: config.fromEmail,
        },
        to: [
          {
            email: cleanRecipient,
          },
        ],
        subject: subject.trim(),
        htmlContent: html,
        textContent: text,
      };

      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': config.brevoApiKey,
          'Content-Type': 'application/json',
          accept: 'application/json',
          'User-Agent': 'VISARTECH-People-HRMS/1.0',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && (data.messageId || data.id)) {
        const messageId = data.messageId || data.id;
        console.log(`[EmailService/Brevo] Email accepted successfully. MessageId: ${messageId}`);
        return {
          success: true,
          provider: 'brevo',
          messageId,
          message: 'Email accepted by Brevo API for delivery.',
        };
      }

      const errMsg = data.message || `Brevo API rejected request with HTTP ${response.status}: ${response.statusText}`;
      console.error(`[EmailService/Brevo Error]: Status=${response.status} Reason=${errMsg}`);
      return {
        success: false,
        provider: 'brevo',
        statusCode: response.status,
        message: errMsg,
      };
    } catch (err) {
      console.error(`[EmailService/Brevo Error]: HTTPS dispatch exception: ${err.message}`);
      return {
        success: false,
        provider: 'brevo',
        message: `Failed to communicate with Brevo HTTPS API: ${err.message}`,
      };
    }
  }

  // 2. Alternative HTTPS Provider: Resend REST API (Port 443)
  if (config.provider === 'resend') {
    try {
      console.log(`[EmailService/Resend] Attempting HTTPS delivery to: ${cleanRecipient}`);

      const payload = {
        from: config.from,
        to: [cleanRecipient],
        subject: subject.trim(),
        html,
        text,
      };

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.resendApiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'VISARTECH-People-HRMS/1.0',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok && data.id) {
        console.log(`[EmailService/Resend] Email accepted successfully. MessageId: ${data.id}`);
        return {
          success: true,
          provider: 'resend',
          messageId: data.id,
          message: 'Email accepted by Resend API for delivery.',
        };
      }

      let errMsg = data.message || `Resend API rejected request with HTTP ${response.status}: ${response.statusText}`;
      if (response.status === 403 && data.message && data.message.includes('own email address')) {
        errMsg = `Resend Account Restricted: ${data.message} To send to unverified recipient domains, verify your domain in the Resend dashboard (resend.com/domains).`;
      }
      console.error(`[EmailService/Resend Error]: Status=${response.status} Reason=${errMsg}`);
      return {
        success: false,
        provider: 'resend',
        statusCode: response.status,
        message: errMsg,
      };
    } catch (err) {
      console.error(`[EmailService/Resend Error]: HTTPS dispatch exception: ${err.message}`);
      return {
        success: false,
        provider: 'resend',
        message: `Failed to communicate with Resend HTTPS API: ${err.message}`,
      };
    }
  }

  // 2. Optional Local Development Fallback: Nodemailer SMTP
  if (config.provider === 'smtp') {
    const transporter = getTransporter();
    if (!transporter) {
      return {
        success: false,
        provider: 'smtp',
        message: 'SMTP transporter unavailable',
      };
    }

    try {
      console.log(`[EmailService/SMTP] Attempting delivery to: ${cleanRecipient}`);
      const info = await transporter.sendMail({
        from: config.from,
        to: cleanRecipient,
        subject,
        html,
        text,
      });

      const isAccepted = info.accepted && info.accepted.length > 0;
      if (!isAccepted) {
        console.warn(`[EmailService/SMTP] Email not accepted by SMTP recipient: ${cleanRecipient}`);
        return {
          success: false,
          provider: 'smtp',
          message: 'Email was not accepted by SMTP recipient server.',
        };
      }

      console.log(`[EmailService/SMTP] Email delivered successfully. MessageId: ${info.messageId}`);
      return {
        success: true,
        provider: 'smtp',
        messageId: info.messageId,
        message: 'Email dispatched successfully via local SMTP.',
      };
    } catch (err) {
      let cleanError = 'Failed to deliver email.';
      if (err.code === 'EAUTH') {
        cleanError = 'SMTP authentication failure. Google App Password may be invalid, missing, or expired.';
      } else if (err.code === 'ETIMEDOUT' || err.code === 'ESOCKETTIMEDOUT') {
        cleanError = 'Connection to SMTP server timed out. Render blocks outbound SMTP ports. Configure RESEND_API_KEY instead.';
      } else if (err.code === 'ECONNREFUSED') {
        cleanError = 'Connection refused by SMTP server.';
      } else if (err.message) {
        cleanError = `SMTP Delivery Error: ${err.message}`;
      }

      console.error(`[EmailService/SMTP Error]: Code=${err.code || 'UNKNOWN'} Reason=${cleanError}`);
      return {
        success: false,
        provider: 'smtp',
        message: cleanError,
        code: err.code,
      };
    }
  }

  return {
    success: false,
    message: 'No email delivery provider configured.',
  };
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
