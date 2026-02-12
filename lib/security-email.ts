import nodemailer from 'nodemailer';

/**
 * Security Email System
 * Uses Outlook for all security-related emails (VPN, Account Lockout, Password Reset, etc.)
 * Separate from OTP emails which use Gmail
 */

// Create security email transporter
function createSecurityTransporter() {
  const emailService = process.env.VPN_EMAIL_SERVICE || process.env.EMAIL_SERVICE || 'outlook';
  
  let transportConfig: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  
  if (emailService === 'custom') {
    transportConfig = {
      host: process.env.VPN_SMTP_HOST || process.env.SMTP_HOST,
      port: parseInt(process.env.VPN_SMTP_PORT || process.env.SMTP_PORT || '587'),
      secure: (process.env.VPN_SMTP_SECURE || process.env.SMTP_SECURE) === 'true',
      auth: {
        user: process.env.VPN_EMAIL_USER || process.env.EMAIL_USER,
        pass: process.env.VPN_EMAIL_PASS || process.env.EMAIL_PASS,
      },
    };
  } else {
    transportConfig = {
      service: emailService,
      auth: {
        user: process.env.VPN_EMAIL_USER || process.env.EMAIL_USER,
        pass: process.env.VPN_EMAIL_PASS || process.env.EMAIL_PASS,
      },
    };
  }
  
  return nodemailer.createTransport(transportConfig);
}

// Creative Email Template Wrapper
function createCreativeEmailTemplate(
  title: string,
  icon: string,
  content: string,
  primaryColor: string = '#9333ea',
  secondaryColor: string = '#4f46e5'
): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://light-of-life.com';
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap');
    body { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" style="max-width: 600px; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);">
          
          <!-- Creative Header -->
          <tr>
            <td style="background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%); padding: 60px 40px; text-align: center; position: relative;">
              <div style="background: rgba(255, 255, 255, 0.2); width: 100px; height: 100px; border-radius: 30px; margin: 0 auto 24px; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.3);">
                <span style="font-size: 48px;">${icon}</span>
              </div>
              <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 800; letter-spacing: -0.025em;">${title}</h1>
              <p style="color: rgba(255, 255, 255, 0.8); margin: 12px 0 0 0; font-size: 16px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Light of Life Security</p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 48px 40px;">
              ${content}
            </td>
          </tr>

          <!-- Creative Footer -->
          <tr>
            <td style="padding: 40px; background-color: #f1f5f9; text-align: center; border-top: 1px solid #e2e8f0;">
              <div style="margin-bottom: 24px;">
                <img src="https://light-web-project.vercel.app/logo.png" alt="Light of Life" style="height: 32px; opacity: 0.5;">
              </div>
              <p style="color: #64748b; margin: 0 0 8px 0; font-size: 14px; font-weight: 600;">
                Automated Security Notification
              </p>
              <p style="color: #94a3b8; margin: 0; font-size: 12px; line-height: 1.6;">
                This is a system-generated email to protect your account.<br>
                © ${new Date().getFullYear()} Light of Life. All rights reserved.
              </p>
              <div style="margin-top: 24px;">
                <a href="${appUrl}" style="color: ${primaryColor}; text-decoration: none; font-size: 14px; font-weight: 700;">Visit Platform</a>
                <span style="color: #cbd5e1; margin: 0 12px;">•</span>
                <a href="${appUrl}/support" style="color: ${primaryColor}; text-decoration: none; font-size: 14px; font-weight: 700;">Help Center</a>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// Send Account Banned Alert
export async function sendAccountBannedAlert(
  userName: string,
  userEmail: string,
  reason: string,
  duration?: number,
  bannedUntil?: Date
) {
  const transporter = createSecurityTransporter();
  const isPermanent = !duration || !bannedUntil;
  
  const untilText = bannedUntil 
    ? new Date(bannedUntil).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })
    : 'N/A';
  
  const content = `
    <p style="font-size: 20px; color: #0f172a; margin: 0 0 24px 0; font-weight: 600;">Hello ${userName},</p>
    
    <div style="background-color: #fff1f2; border-radius: 20px; padding: 32px; border: 1px solid #ffe4e6; margin-bottom: 32px;">
      <p style="color: #be123c; margin: 0; font-size: 16px; line-height: 1.7; font-weight: 500;">
        We're writing to inform you that your account has been <strong>${isPermanent ? 'permanently restricted' : 'temporarily suspended'}</strong> due to a violation of our community guidelines.
      </p>
    </div>

    <div style="margin-bottom: 32px;">
      <h2 style="color: #0f172a; font-size: 18px; font-weight: 800; margin: 0 0 16px 0; text-transform: uppercase; letter-spacing: 0.05em;">Ban Details</h2>
      <div style="background-color: #f8fafc; border-radius: 16px; padding: 24px; border: 1px solid #f1f5f9;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 14px; font-weight: 600;">Status</td>
            <td align="right" style="padding: 8px 0; color: #e11d48; font-size: 14px; font-weight: 800;">${isPermanent ? 'PERMANENT' : 'TEMPORARY'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 14px; font-weight: 600;">Reason</td>
            <td align="right" style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 600;">${reason}</td>
          </tr>
          ${!isPermanent ? `
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 14px; font-weight: 600;">Duration</td>
            <td align="right" style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 600;">${duration} Days</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 14px; font-weight: 600;">Expires</td>
            <td align="right" style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 600;">${untilText}</td>
          </tr>
          ` : ''}
        </table>
      </div>
    </div>

    <div style="background-color: #f1f5f9; border-radius: 20px; padding: 32px; margin-bottom: 40px;">
      <h3 style="color: #0f172a; font-size: 16px; font-weight: 800; margin: 0 0 16px 0;">What happens now?</h3>
      <ul style="color: #475569; margin: 0; padding: 0 0 0 20px; line-height: 1.8; font-size: 15px;">
        <li>Access to your account is currently disabled.</li>
        <li>Your public profile has been hidden from the community.</li>
        ${isPermanent ? '<li>This decision is final and cannot be appealed.</li>' : '<li>Your access will be automatically restored once the suspension ends.</li>'}
      </ul>
    </div>

    <div style="text-align: center;">
      <a href="mailto:support@lightoflife.com" style="display: inline-block; background: #0f172a; color: #ffffff; text-decoration: none; padding: 18px 36px; border-radius: 16px; font-weight: 700; font-size: 16px; transition: all 0.2s;">
        Contact Support Team
      </a>
    </div>
  `;
  
  const emailHtml = createCreativeEmailTemplate('Account Restricted', '🚫', content, '#e11d48', '#9f1239');
  
  await transporter.sendMail({
    from: `"Light of Life Security" <${process.env.VPN_EMAIL_USER || process.env.EMAIL_USER}>`,
    to: userEmail,
    subject: `🚫 Security Alert: Account ${isPermanent ? 'Permanently Restricted' : 'Suspended'}`,
    html: emailHtml,
  });
}

// Send Account Unbanned Alert
export async function sendAccountUnbannedAlert(userName: string, userEmail: string) {
  const transporter = createSecurityTransporter();
  
  const content = `
    <p style="font-size: 20px; color: #0f172a; margin: 0 0 24px 0; font-weight: 600;">Welcome back, ${userName}!</p>
    
    <div style="background-color: #f0fdf4; border-radius: 20px; padding: 32px; border: 1px solid #dcfce7; margin-bottom: 32px;">
      <p style="color: #15803d; margin: 0; font-size: 16px; line-height: 1.7; font-weight: 500;">
        We're happy to inform you that your account access has been <strong>fully restored</strong>. Our team has reviewed your case and lifted the suspension.
      </p>
    </div>

    <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-radius: 24px; padding: 40px; text-align: center; margin-bottom: 40px; border: 1px solid #e2e8f0;">
      <div style="font-size: 48px; margin-bottom: 16px;">🚀</div>
      <h3 style="color: #0f172a; font-size: 20px; font-weight: 800; margin: 0 0 12px 0;">Ready to explore?</h3>
      <p style="color: #64748b; margin: 0 0 24px 0; font-size: 15px; line-height: 1.6;">
        All features are now available to you. We appreciate your patience and look forward to your positive contributions to the community.
      </p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/login" style="display: inline-block; background: linear-gradient(135deg, #9333ea 0%, #4f46e5 100%); color: #ffffff; text-decoration: none; padding: 18px 40px; border-radius: 16px; font-weight: 700; font-size: 16px; box-shadow: 0 10px 15px -3px rgba(147, 51, 234, 0.3);">
        Log In to Your Account
      </a>
    </div>

    <div style="padding: 24px; border-radius: 16px; border: 2px dashed #e2e8f0; text-align: center;">
      <p style="color: #94a3b8; margin: 0; font-size: 13px; font-weight: 600;">
        Please ensure you follow our community guidelines to maintain a safe environment for everyone.
      </p>
    </div>
  `;
  
  const emailHtml = createCreativeEmailTemplate('Access Restored', '🔓', content, '#9333ea', '#4f46e5');
  
  await transporter.sendMail({
    from: `"Light of Life Security" <${process.env.VPN_EMAIL_USER || process.env.EMAIL_USER}>`,
    to: userEmail,
    subject: '🔓 Good News: Your Account Access is Restored!',
    html: emailHtml,
  });
}

// Send VPN Detection Alert
export async function sendVPNAlert(userName: string, userEmail: string, ipAddress: string, detection: any) {
  const transporter = createSecurityTransporter();
  
  const content = `
    <p style="font-size: 20px; color: #0f172a; margin: 0 0 24px 0; font-weight: 600;">Security Alert, ${userName}</p>
    
    <div style="background-color: #fff7ed; border-radius: 20px; padding: 32px; border: 1px solid #ffedd5; margin-bottom: 32px;">
      <p style="color: #9a3412; margin: 0; font-size: 16px; line-height: 1.7; font-weight: 500;">
        Our system detected an attempt to access your account using a <strong>VPN, Proxy, or Anonymous network</strong>. To protect our community, we require a direct connection.
      </p>
    </div>

    <div style="margin-bottom: 32px;">
      <h2 style="color: #0f172a; font-size: 18px; font-weight: 800; margin: 0 0 16px 0; text-transform: uppercase; letter-spacing: 0.05em;">Connection Details</h2>
      <div style="background-color: #f8fafc; border-radius: 16px; padding: 24px; border: 1px solid #f1f5f9;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 14px; font-weight: 600;">IP Address</td>
            <td align="right" style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 800;">${ipAddress}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 14px; font-weight: 600;">Location</td>
            <td align="right" style="padding: 8px 0; color: #0f172a; font-size: 14px; font-weight: 600;">${detection.country || 'Unknown'}, ${detection.city || 'Unknown'}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b; font-size: 14px; font-weight: 600;">Network Type</td>
            <td align="right" style="padding: 8px 0; color: #ea580c; font-size: 14px; font-weight: 800;">SECURE BYPASS DETECTED</td>
          </tr>
        </table>
      </div>
    </div>

    <div style="background-color: #f1f5f9; border-radius: 20px; padding: 32px; margin-bottom: 40px;">
      <h3 style="color: #0f172a; font-size: 16px; font-weight: 800; margin: 0 0 16px 0;">How to fix this?</h3>
      <ol style="color: #475569; margin: 0; padding: 0 0 0 20px; line-height: 1.8; font-size: 15px;">
        <li>Disable any active VPN or Proxy services.</li>
        <li>Ensure you are using a standard residential or mobile network.</li>
        <li>Refresh the page and try logging in again.</li>
      </ol>
    </div>

    <div style="text-align: center;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL}" style="display: inline-block; background: #ea580c; color: #ffffff; text-decoration: none; padding: 18px 36px; border-radius: 16px; font-weight: 700; font-size: 16px;">
        Return to Platform
      </a>
    </div>
  `;
  
  const emailHtml = createCreativeEmailTemplate('VPN Detected', '⚠️', content, '#ea580c', '#c2410c');
  
  await transporter.sendMail({
    from: `"Light of Life Security" <${process.env.VPN_EMAIL_USER || process.env.EMAIL_USER}>`,
    to: userEmail,
    subject: '⚠️ Security Alert: VPN/Proxy Connection Detected',
    html: emailHtml,
  });
}

// Send Account Lockout Alert
export async function sendAccountLockoutAlert(userName: string, userEmail: string, attempts: number, lockDuration: number) {
  const transporter = createSecurityTransporter();
  
  const content = `
    <p style="font-size: 20px; color: #0f172a; margin: 0 0 24px 0; font-weight: 600;">Security Alert, ${userName}</p>
    
    <div style="background-color: #fff1f2; border-radius: 20px; padding: 32px; border: 1px solid #ffe4e6; margin-bottom: 32px;">
      <p style="color: #be123c; margin: 0; font-size: 16px; line-height: 1.7; font-weight: 500;">
        Your account has been <strong>temporarily locked</strong> due to ${attempts} failed login attempts. This is a protective measure to keep your account safe.
      </p>
    </div>

    <div style="background-color: #f8fafc; border-radius: 24px; padding: 32px; text-align: center; border: 1px solid #e2e8f0; margin-bottom: 40px;">
      <div style="font-size: 40px; margin-bottom: 12px;">⏳</div>
      <h3 style="color: #0f172a; font-size: 18px; font-weight: 800; margin: 0 0 8px 0;">Lockout Duration</h3>
      <p style="color: #64748b; margin: 0; font-size: 24px; font-weight: 800;">${lockDuration} Minutes</p>
      <p style="color: #94a3b8; margin: 12px 0 0 0; font-size: 14px;">You can try logging in again after this period.</p>
    </div>

    <div style="text-align: center;">
      <p style="color: #64748b; font-size: 14px; margin-bottom: 24px;">If this wasn't you, we recommend resetting your password immediately.</p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/auth/forgot-password" style="display: inline-block; background: #0f172a; color: #ffffff; text-decoration: none; padding: 18px 36px; border-radius: 16px; font-weight: 700; font-size: 16px;">
        Reset Password
      </a>
    </div>
  `;
  
  const emailHtml = createCreativeEmailTemplate('Account Locked', '🔒', content, '#e11d48', '#9f1239');
  
  await transporter.sendMail({
    from: `"Light of Life Security" <${process.env.VPN_EMAIL_USER || process.env.EMAIL_USER}>`,
    to: userEmail,
    subject: '🔒 Security Alert: Account Temporarily Locked',
    html: emailHtml,
  });
}

// Send 2FA Verification Code
export async function send2FACodeAlert(
  userName: string,
  userEmail: string,
  code: string
) {
  const transporter = createSecurityTransporter();
  
  const content = `
    <p style="font-size: 18px; color: #1f2937; margin: 0 0 20px 0;">Hello ${userName},</p>
    
    <div style="background-color: #f3f4f6; border-radius: 12px; padding: 30px; text-align: center; margin-bottom: 25px; border: 1px solid #e5e7eb;">
      <p style="color: #4b5563; margin: 0 0 15px 0; font-size: 16px; font-weight: bold;">Your Verification Code:</p>
      <div style="font-size: 42px; font-weight: 900; letter-spacing: 10px; color: #9333ea; margin: 0;">${code}</div>
      <p style="color: #9ca3af; margin: 15px 0 0 0; font-size: 14px;">This code will expire in 10 minutes.</p>
    </div>

    <h2 style="color: #1f2937; font-size: 20px; margin: 30px 0 15px 0;">🛡️ Security Information:</h2>
    
    <ul style="color: #4b5563; line-height: 1.8; margin-bottom: 25px;">
      <li><strong>Purpose:</strong> Two-Factor Authentication (2FA)</li>
      <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
      <li><strong>Action:</strong> If you didn't request this code, please secure your account immediately.</li>
    </ul>

    <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
      <p style="color: #991b1b; margin: 0; font-size: 14px; line-height: 1.6;">
        <strong>⚠️ Important:</strong> Never share this code with anyone. Our team will never ask for your 2FA code.
      </p>
    </div>

    <div style="text-align: center; margin-top: 30px;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://light-of-life.com'}" 
         style="display: inline-block; background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%); color: white; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-weight: bold; font-size: 16px;">
        Go to Website
      </a>
    </div>
  `;
  
  const emailHtml = createSecurityEmailTemplate(
    'Verification Code',
    '🔑',
    content,
    '#9333ea'
  );
  
  await transporter.sendMail({
    from: `"Light of Life Security" <${process.env.VPN_EMAIL_USER || process.env.EMAIL_USER}>`,
    to: userEmail,
    subject: `🔑 ${code} is your verification code`,
    html: emailHtml,
  });
  
  console.log(`2FA code email sent to: ${userEmail}`);
}

/**
 * Send Internal 2FA Code (Email Based)
 */
export async function sendInternal2FACode(
  userName: string,
  userEmail: string,
  code: string,
  location?: string,
  browser?: string
) {
  try {
    const transporter = createSecurityTransporter();
    
    const content = `
    <p style="font-size: 18px; color: #1f2937; margin: 0 0 20px 0;">Hello ${userName},</p>
    
    <div style="background-color: #f3f4f6; border-radius: 12px; padding: 30px; text-align: center; margin-bottom: 25px;">
      <p style="color: #4b5563; margin: 0 0 15px 0; font-size: 16px;">Your security verification code is:</p>
      <h1 style="color: #9333ea; font-size: 48px; letter-spacing: 10px; margin: 0; font-weight: bold;">${code}</h1>
      <p style="color: #9ca3af; margin: 15px 0 0 0; font-size: 14px;">This code will expire in 10 minutes.</p>
    </div>

    <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
      <h3 style="color: #1f2937; font-size: 16px; margin: 0 0 10px 0;">Attempt Details:</h3>
      <p style="color: #4b5563; margin: 5px 0; font-size: 14px;"><strong>Location:</strong> ${location || 'Unknown'}</p>
      <p style="color: #4b5563; margin: 5px 0; font-size: 14px;"><strong>Browser:</strong> ${browser || 'Unknown'}</p>
      <p style="color: #4b5563; margin: 5px 0; font-size: 14px;"><strong>Time:</strong> ${new Date().toLocaleString()}</p>
    </div>

    <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
      If you did not request this code, someone may be trying to access your account. 
      Please change your password immediately and contact support.
    </p>
    `;
    
    const emailHtml = createSecurityEmailTemplate(
      'Security Verification',
      '🔐',
      content,
      '#9333ea'
    );
    
    await transporter.sendMail({
      from: `"Light of Life Security" <${process.env.VPN_EMAIL_USER || process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: `🔐 ${code} is your security code`,
      html: emailHtml,
    });
    
    return true;
  } catch (error) {
    console.error('Failed to send internal 2FA email:', error);
    return false;
  }
}

/**
 * Send New Trusted Device Alert
 */
export async function sendNewDeviceAlert(
  userName: string,
  userEmail: string,
  deviceInfo: {
    browser: string;
    os: string;
    ip: string;
    location: string;
  }
) {
  try {
    const transporter = createSecurityTransporter();
    
    const content = `
    <p style="font-size: 18px; color: #1f2937; margin: 0 0 20px 0;">Hello ${userName},</p>
    
    <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
      <p style="color: #065f46; margin: 0; font-size: 16px; line-height: 1.6;">
        <strong>A new device has been added to your trusted devices list.</strong>
      </p>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
      <tr>
        <td style="padding: 12px; background-color: #f9fafb; border: 1px solid #e5e7eb; font-weight: bold; color: #4b5563;">Device:</td>
        <td style="padding: 12px; background-color: white; border: 1px solid #e5e7eb; color: #1f2937;">${deviceInfo.browser} on ${deviceInfo.os}</td>
      </tr>
      <tr>
        <td style="padding: 12px; background-color: #f9fafb; border: 1px solid #e5e7eb; font-weight: bold; color: #4b5563;">IP Address:</td>
        <td style="padding: 12px; background-color: white; border: 1px solid #e5e7eb; color: #1f2937;">${deviceInfo.ip}</td>
      </tr>
      <tr>
        <td style="padding: 12px; background-color: #f9fafb; border: 1px solid #e5e7eb; font-weight: bold; color: #4b5563;">Location:</td>
        <td style="padding: 12px; background-color: white; border: 1px solid #e5e7eb; color: #1f2937;">${deviceInfo.location}</td>
      </tr>
    </table>

    <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
      If this was you, you can ignore this email. If not, please secure your account immediately.
    </p>
    `;
    
    const emailHtml = createSecurityEmailTemplate(
      'New Trusted Device',
      '📱',
      content,
      '#10b981'
    );
    
    await transporter.sendMail({
      from: `"Light of Life Security" <${process.env.VPN_EMAIL_USER || process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: '📱 New Trusted Device Added',
      html: emailHtml,
    });
    
    return true;
  } catch (error) {
    console.error('Failed to send new device alert email:', error);
    return false;
  }
}

/**
 * Send Alert when a trusted device is removed/revoked
 */
export async function sendDeviceRevokedAlert(
  userName: string,
  userEmail: string,
  deviceInfo: {
    name: string;
    location: string;
  }
) {
  try {
    const transporter = createSecurityTransporter();
    
    const content = `
    <p style="font-size: 18px; color: #1f2937; margin: 0 0 20px 0;">Hello ${userName},</p>
    
    <div style="background-color: #fff7ed; border-left: 4px solid #f97316; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
      <p style="color: #9a3412; margin: 0; font-size: 16px; line-height: 1.6;">
        <strong>A device has been removed from your trusted devices list.</strong>
      </p>
    </div>

    <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
      <p style="color: #4b5563; margin: 5px 0; font-size: 14px;"><strong>Device:</strong> ${deviceInfo.name}</p>
      <p style="color: #4b5563; margin: 5px 0; font-size: 14px;"><strong>Location:</strong> ${deviceInfo.location}</p>
      <p style="color: #4b5563; margin: 5px 0; font-size: 14px;"><strong>Action:</strong> Trust Revoked</p>
    </div>

    <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
      This device will now require a security code for any future login attempts. 
      If you did not perform this action, please review your security settings immediately.
    </p>
    `;
    
    const emailHtml = createSecurityEmailTemplate(
      'Device Trust Revoked',
      '🔓',
      content,
      '#f97316'
    );
    
    await transporter.sendMail({
      from: `"Light of Life Security" <${process.env.VPN_EMAIL_USER || process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: '🔓 Security Alert: Device Trust Revoked',
      html: emailHtml,
    });
    
    return true;
  } catch (error) {
    console.error('Failed to send device revoked alert:', error);
    return false;
  }
}

/**
 * Send Alert when account is frozen/locked by user
 */
export async function sendAccountFrozenAlert(
  userName: string,
  userEmail: string,
  until?: string
) {
  try {
    const transporter = createSecurityTransporter();
    
    const content = `
    <p style="font-size: 18px; color: #1f2937; margin: 0 0 20px 0;">Hello ${userName},</p>
    
    <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
      <p style="color: #991b1b; margin: 0; font-size: 16px; line-height: 1.6;">
        <strong>Your account has been frozen as requested.</strong>
      </p>
    </div>

    <p style="color: #4b5563; line-height: 1.8; margin-bottom: 25px;">
      As per your security request, we have temporarily disabled access to your account. 
      No one (including you) will be able to log in until the freeze period expires.
    </p>

    <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
      <p style="color: #4b5563; margin: 5px 0; font-size: 14px;"><strong>Status:</strong> Frozen (Self-Locked)</p>
      ${until ? `<p style="color: #4b5563; margin: 5px 0; font-size: 14px;"><strong>Unlocks On:</strong> ${until}</p>` : ''}
    </div>

    <p style="color: #6b7280; font-size: 14px; line-height: 1.6;">
      This is a protective measure. If you did not request this, please contact our support team immediately.
    </p>
    `;
    
    const emailHtml = createSecurityEmailTemplate(
      'Account Frozen',
      '❄️',
      content,
      '#dc2626'
    );
    
    await transporter.sendMail({
      from: `"Light of Life Security" <${process.env.VPN_EMAIL_USER || process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: '❄️ Security Alert: Account Frozen',
      html: emailHtml,
    });
    
    return true;
  } catch (error) {
    console.error('Failed to send account frozen alert:', error);
    return false;
  }
}
