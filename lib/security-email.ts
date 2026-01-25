import nodemailer from 'nodemailer';

/**
 * Security Email System
 * Uses Outlook for all security-related emails (VPN, Account Lockout, Password Reset, etc.)
 * Separate from OTP emails which use Gmail
 */

// Create security email transporter
function createSecurityTransporter() {
  const emailService = process.env.VPN_EMAIL_SERVICE || process.env.EMAIL_SERVICE || 'outlook';
  
  let transportConfig: any;
  
  if (emailService === 'custom') {
    // Custom SMTP configuration
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
    // Predefined services (gmail, outlook, yahoo, etc.)
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

// Email template wrapper
function createSecurityEmailTemplate(
  title: string,
  icon: string,
  content: string,
  color: string = '#dc2626'
): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://light-of-life.com';
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, ${color} 0%, ${adjustColor(color)} 100%); padding: 30px; text-align: center;">
      <div style="background-color: rgba(255,255,255,0.2); width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center;">
        <span style="font-size: 40px;">${icon}</span>
      </div>
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">${title}</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Light of Life Security Team</p>
    </div>

    <!-- Content -->
    <div style="padding: 40px 30px;">
      ${content}
    </div>

    <!-- Footer -->
    <div style="background-color: #f9fafb; padding: 25px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="color: #6b7280; margin: 0 0 10px 0; font-size: 14px;">
        This is an automated security alert from <strong>Light of Life</strong>
      </p>
      <p style="color: #9ca3af; margin: 0; font-size: 12px;">
        If you believe this is an error, please contact our support team.
      </p>
      <p style="color: #9ca3af; margin: 10px 0 0 0; font-size: 12px;">
        <a href="${appUrl}" style="color: #9333ea; text-decoration: none;">Visit Website</a>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

// Helper function to adjust color darkness
function adjustColor(color: string): string {
  const colorMap: { [key: string]: string } = {
    '#dc2626': '#991b1b', // red
    '#ea580c': '#c2410c', // orange
    '#f59e0b': '#d97706', // yellow
    '#16a34a': '#15803d', // green
    '#2563eb': '#1d4ed8', // blue
    '#9333ea': '#7e22ce', // purple
  };
  return colorMap[color] || color;
}

// Send VPN Detection Alert
export async function sendVPNAlert(
  userName: string,
  userEmail: string,
  ipAddress: string,
  detection: any
) {
  try {
    console.log('Creating security email transporter...');
    console.log('VPN_EMAIL_SERVICE:', process.env.VPN_EMAIL_SERVICE || 'not set');
    console.log('VPN_EMAIL_USER:', process.env.VPN_EMAIL_USER ? 'set' : 'not set');
    console.log('VPN_EMAIL_PASS:', process.env.VPN_EMAIL_PASS ? 'set' : 'not set');
    
    const transporter = createSecurityTransporter();
    
    const content = `
    <p style="font-size: 18px; color: #1f2937; margin: 0 0 20px 0;">Hello ${userName},</p>
    
    <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
      <p style="color: #991b1b; margin: 0; font-size: 16px; line-height: 1.6;">
        <strong>An attempt to access your account using VPN or Proxy has been detected.</strong>
      </p>
    </div>

    <h2 style="color: #1f2937; font-size: 20px; margin: 30px 0 15px 0;">📋 Detection Details:</h2>
    
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
      <tr>
        <td style="padding: 12px; background-color: #f9fafb; border: 1px solid #e5e7eb; font-weight: bold; color: #4b5563;">IP Address:</td>
        <td style="padding: 12px; background-color: white; border: 1px solid #e5e7eb; color: #1f2937;">${ipAddress}</td>
      </tr>
      <tr>
        <td style="padding: 12px; background-color: #f9fafb; border: 1px solid #e5e7eb; font-weight: bold; color: #4b5563;">Location:</td>
        <td style="padding: 12px; background-color: white; border: 1px solid #e5e7eb; color: #1f2937;">${detection.country || 'Unknown'}, ${detection.city || 'Unknown'}</td>
      </tr>
      <tr>
        <td style="padding: 12px; background-color: #f9fafb; border: 1px solid #e5e7eb; font-weight: bold; color: #4b5563;">ISP:</td>
        <td style="padding: 12px; background-color: white; border: 1px solid #e5e7eb; color: #1f2937;">${detection.isp || 'Unknown'}</td>
      </tr>
      <tr>
        <td style="padding: 12px; background-color: #f9fafb; border: 1px solid #e5e7eb; font-weight: bold; color: #4b5563;">Detection Type:</td>
        <td style="padding: 12px; background-color: white; border: 1px solid #e5e7eb; color: #1f2937;">
          ${detection.isVPN ? '<span style="background-color: #dc2626; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; margin-right: 5px;">VPN</span>' : ''}
          ${detection.isTor ? '<span style="background-color: #991b1b; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; margin-right: 5px;">Tor</span>' : ''}
          ${detection.isProxy ? '<span style="background-color: #ea580c; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">Proxy</span>' : ''}
        </td>
      </tr>
    </table>

    <h2 style="color: #1f2937; font-size: 20px; margin: 30px 0 15px 0;">🛡️ Why do we block VPN?</h2>
    
    <ul style="color: #4b5563; line-height: 1.8; margin-bottom: 25px;">
      <li><strong>Privacy Protection:</strong> We protect all users' privacy from suspicious activities</li>
      <li><strong>Fraud Prevention:</strong> VPNs are sometimes used in fraudulent activities</li>
      <li><strong>Security:</strong> We ensure a safe environment for all community members</li>
      <li><strong>Compliance:</strong> We adhere to international security and privacy standards</li>
    </ul>

    <h2 style="color: #1f2937; font-size: 20px; margin: 30px 0 15px 0;">✅ What should you do?</h2>
    
    <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
      <ol style="color: #166534; margin: 0; padding-left: 20px; line-height: 1.8;">
        <li><strong>Turn off VPN/Proxy:</strong> Disable any VPN or Proxy service</li>
        <li><strong>Restart your browser:</strong> Close and reopen your browser</li>
        <li><strong>Sign in again:</strong> Try accessing your account without VPN</li>
      </ol>
    </div>

    <div style="background-color: #fefce8; border-left: 4px solid #eab308; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
      <p style="color: #854d0e; margin: 0; font-size: 14px; line-height: 1.6;">
        <strong>⚠️ Warning:</strong> Continuing to attempt access using VPN may result in temporary account suspension to protect platform security.
      </p>
    </div>

    <div style="text-align: center; margin-top: 30px;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://light-of-life.com'}" 
         style="display: inline-block; background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%); color: white; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-weight: bold; font-size: 16px;">
        Back to Site
      </a>
    </div>
    `;
    
    const emailHtml = createSecurityEmailTemplate(
      'Security Warning',
      '⚠️',
      content,
      '#dc2626'
    );
    
    console.log('Attempting to send email to:', userEmail);
    const info = await transporter.sendMail({
      from: `"Light of Life Security" <${process.env.VPN_EMAIL_USER || process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: '⚠️ Security Warning - VPN/Proxy Detected',
      html: emailHtml,
    });
    
    console.log('VPN warning email sent successfully!');
    console.log('Message ID:', info.messageId);
  } catch (error: any) {
    console.error('❌ Error in sendVPNAlert:');
    console.error('Error message:', error.message);
    console.error('Full error:', error);
    throw error;
  }
}

// Send Account Lockout Alert
export async function sendAccountLockoutAlert(
  userName: string,
  userEmail: string,
  attempts: number,
  lockDuration: number
) {
  const transporter = createSecurityTransporter();
  
  const content = `
    <p style="font-size: 18px; color: #1f2937; margin: 0 0 20px 0;">Hello ${userName},</p>
    
    <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
      <p style="color: #991b1b; margin: 0; font-size: 16px; line-height: 1.6;">
        <strong>Your account has been temporarily locked due to multiple failed login attempts.</strong>
      </p>
    </div>

    <h2 style="color: #1f2937; font-size: 20px; margin: 30px 0 15px 0;">📊 Details:</h2>
    
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
      <tr>
        <td style="padding: 12px; background-color: #f9fafb; border: 1px solid #e5e7eb; font-weight: bold; color: #4b5563;">Failed Attempts:</td>
        <td style="padding: 12px; background-color: white; border: 1px solid #e5e7eb; color: #1f2937;">${attempts}</td>
      </tr>
      <tr>
        <td style="padding: 12px; background-color: #f9fafb; border: 1px solid #e5e7eb; font-weight: bold; color: #4b5563;">Lock Duration:</td>
        <td style="padding: 12px; background-color: white; border: 1px solid #e5e7eb; color: #1f2937;">${lockDuration} minutes</td>
      </tr>
      <tr>
        <td style="padding: 12px; background-color: #f9fafb; border: 1px solid #e5e7eb; font-weight: bold; color: #4b5563;">Time:</td>
        <td style="padding: 12px; background-color: white; border: 1px solid #e5e7eb; color: #1f2937;">${new Date().toLocaleString()}</td>
      </tr>
    </table>

    <h2 style="color: #1f2937; font-size: 20px; margin: 30px 0 15px 0;">🔒 What happened?</h2>
    
    <p style="color: #4b5563; line-height: 1.8; margin-bottom: 25px;">
      After ${attempts} failed login attempts, your account has been automatically locked for ${lockDuration} minutes to protect your security.
    </p>

    <h2 style="color: #1f2937; font-size: 20px; margin: 30px 0 15px 0;">✅ What should you do?</h2>
    
    <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
      <ol style="color: #166534; margin: 0; padding-left: 20px; line-height: 1.8;">
        <li><strong>Wait ${lockDuration} minutes:</strong> Your account will be automatically unlocked</li>
        <li><strong>Reset your password:</strong> If you forgot your password, use the reset option</li>
        <li><strong>Contact support:</strong> If you didn't attempt to login, contact us immediately</li>
      </ol>
    </div>

    <div style="background-color: #fefce8; border-left: 4px solid #eab308; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
      <p style="color: #854d0e; margin: 0; font-size: 14px; line-height: 1.6;">
        <strong>⚠️ Security Tip:</strong> If this wasn't you, someone may be trying to access your account. Please change your password immediately after the lockout period.
      </p>
    </div>

    <div style="text-align: center; margin-top: 30px;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password" 
         style="display: inline-block; background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%); color: white; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-weight: bold; font-size: 16px;">
        Reset Password
      </a>
    </div>
  `;
  
  const emailHtml = createSecurityEmailTemplate(
    'Account Locked',
    '🔒',
    content,
    '#dc2626'
  );
  
  await transporter.sendMail({
    from: `"Light of Life Security" <${process.env.VPN_EMAIL_USER || process.env.EMAIL_USER}>`,
    to: userEmail,
    subject: '🔒 Account Locked - Multiple Failed Login Attempts',
    html: emailHtml,
  });
  
  console.log('Account lockout email sent to:', userEmail);
}

// Send Password Changed Alert
export async function sendPasswordChangedAlert(
  userName: string,
  userEmail: string,
  ipAddress: string,
  location: string
) {
  const transporter = createSecurityTransporter();
  
  const content = `
    <p style="font-size: 18px; color: #1f2937; margin: 0 0 20px 0;">Hello ${userName},</p>
    
    <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
      <p style="color: #166534; margin: 0; font-size: 16px; line-height: 1.6;">
        <strong>Your password has been successfully changed.</strong>
      </p>
    </div>

    <h2 style="color: #1f2937; font-size: 20px; margin: 30px 0 15px 0;">📋 Change Details:</h2>
    
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
      <tr>
        <td style="padding: 12px; background-color: #f9fafb; border: 1px solid #e5e7eb; font-weight: bold; color: #4b5563;">IP Address:</td>
        <td style="padding: 12px; background-color: white; border: 1px solid #e5e7eb; color: #1f2937;">${ipAddress}</td>
      </tr>
      <tr>
        <td style="padding: 12px; background-color: #f9fafb; border: 1px solid #e5e7eb; font-weight: bold; color: #4b5563;">Location:</td>
        <td style="padding: 12px; background-color: white; border: 1px solid #e5e7eb; color: #1f2937;">${location}</td>
      </tr>
      <tr>
        <td style="padding: 12px; background-color: #f9fafb; border: 1px solid #e5e7eb; font-weight: bold; color: #4b5563;">Time:</td>
        <td style="padding: 12px; background-color: white; border: 1px solid #e5e7eb; color: #1f2937;">${new Date().toLocaleString()}</td>
      </tr>
    </table>

    <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
      <p style="color: #991b1b; margin: 0; font-size: 14px; line-height: 1.6;">
        <strong>⚠️ Didn't change your password?</strong><br>
        If you didn't make this change, your account may be compromised. Please contact our support team immediately.
      </p>
    </div>

    <div style="text-align: center; margin-top: 30px;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL}" 
         style="display: inline-block; background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%); color: white; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-weight: bold; font-size: 16px;">
        Go to Site
      </a>
    </div>
  `;
  
  const emailHtml = createSecurityEmailTemplate(
    'Password Changed',
    '🔑',
    content,
    '#16a34a'
  );
  
  await transporter.sendMail({
    from: `"Light of Life Security" <${process.env.VPN_EMAIL_USER || process.env.EMAIL_USER}>`,
    to: userEmail,
    subject: '🔑 Password Changed Successfully',
    html: emailHtml,
  });
  
  console.log('Password changed email sent to:', userEmail);
}

// Send Suspicious Activity Alert
export async function sendSuspiciousActivityAlert(
  userName: string,
  userEmail: string,
  activityType: string,
  details: string
) {
  const transporter = createSecurityTransporter();
  
  const content = `
    <p style="font-size: 18px; color: #1f2937; margin: 0 0 20px 0;">Hello ${userName},</p>
    
    <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
      <p style="color: #991b1b; margin: 0; font-size: 16px; line-height: 1.6;">
        <strong>Suspicious activity has been detected on your account.</strong>
      </p>
    </div>

    <h2 style="color: #1f2937; font-size: 20px; margin: 30px 0 15px 0;">📋 Activity Details:</h2>
    
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
      <tr>
        <td style="padding: 12px; background-color: #f9fafb; border: 1px solid #e5e7eb; font-weight: bold; color: #4b5563;">Activity Type:</td>
        <td style="padding: 12px; background-color: white; border: 1px solid #e5e7eb; color: #1f2937;">${activityType}</td>
      </tr>
      <tr>
        <td style="padding: 12px; background-color: #f9fafb; border: 1px solid #e5e7eb; font-weight: bold; color: #4b5563;">Details:</td>
        <td style="padding: 12px; background-color: white; border: 1px solid #e5e7eb; color: #1f2937;">${details}</td>
      </tr>
      <tr>
        <td style="padding: 12px; background-color: #f9fafb; border: 1px solid #e5e7eb; font-weight: bold; color: #4b5563;">Time:</td>
        <td style="padding: 12px; background-color: white; border: 1px solid #e5e7eb; color: #1f2937;">${new Date().toLocaleString()}</td>
      </tr>
    </table>

    <h2 style="color: #1f2937; font-size: 20px; margin: 30px 0 15px 0;">✅ Recommended Actions:</h2>
    
    <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
      <ol style="color: #166534; margin: 0; padding-left: 20px; line-height: 1.8;">
        <li><strong>Change your password:</strong> Update your password immediately</li>
        <li><strong>Review account activity:</strong> Check your recent login history</li>
        <li><strong>Enable 2FA:</strong> Add an extra layer of security</li>
        <li><strong>Contact support:</strong> If you need assistance</li>
      </ol>
    </div>

    <div style="text-align: center; margin-top: 30px;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/settings/security" 
         style="display: inline-block; background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%); color: white; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-weight: bold; font-size: 16px;">
        Review Security Settings
      </a>
    </div>
  `;
  
  const emailHtml = createSecurityEmailTemplate(
    'Suspicious Activity Detected',
    '🚨',
    content,
    '#ea580c'
  );
  
  await transporter.sendMail({
    from: `"Light of Life Security" <${process.env.VPN_EMAIL_USER || process.env.EMAIL_USER}>`,
    to: userEmail,
    subject: '🚨 Suspicious Activity Detected on Your Account',
    html: emailHtml,
  });
  
  console.log('Suspicious activity email sent to:', userEmail);
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
  const durationText = isPermanent 
    ? 'permanently' 
    : `for ${duration} day${duration > 1 ? 's' : ''}`;
  
  const untilText = bannedUntil 
    ? new Date(bannedUntil).toLocaleString('en-US', {
        dateStyle: 'full',
        timeStyle: 'short'
      })
    : 'N/A';
  
  const content = `
    <p style="font-size: 18px; color: #1f2937; margin: 0 0 20px 0;">Hello ${userName},</p>
    
    <div style="background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
      <p style="color: #991b1b; margin: 0; font-size: 16px; line-height: 1.6;">
        <strong>Your account has been ${isPermanent ? 'permanently banned' : 'temporarily suspended'} by an administrator.</strong>
      </p>
    </div>

    <h2 style="color: #1f2937; font-size: 20px; margin: 30px 0 15px 0;">📋 Ban Details:</h2>
    
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
      <tr>
        <td style="padding: 12px; background-color: #f9fafb; border: 1px solid #e5e7eb; font-weight: bold; color: #4b5563;">Status:</td>
        <td style="padding: 12px; background-color: white; border: 1px solid #e5e7eb; color: #dc2626; font-weight: bold;">${isPermanent ? 'PERMANENTLY BANNED' : 'TEMPORARILY SUSPENDED'}</td>
      </tr>
      <tr>
        <td style="padding: 12px; background-color: #f9fafb; border: 1px solid #e5e7eb; font-weight: bold; color: #4b5563;">Reason:</td>
        <td style="padding: 12px; background-color: white; border: 1px solid #e5e7eb; color: #1f2937;">${reason || 'Violation of Terms of Service'}</td>
      </tr>
      ${!isPermanent ? `
      <tr>
        <td style="padding: 12px; background-color: #f9fafb; border: 1px solid #e5e7eb; font-weight: bold; color: #4b5563;">Duration:</td>
        <td style="padding: 12px; background-color: white; border: 1px solid #e5e7eb; color: #1f2937;">${duration} day${duration > 1 ? 's' : ''}</td>
      </tr>
      <tr>
        <td style="padding: 12px; background-color: #f9fafb; border: 1px solid #e5e7eb; font-weight: bold; color: #4b5563;">Ban Expires:</td>
        <td style="padding: 12px; background-color: white; border: 1px solid #e5e7eb; color: #1f2937;">${untilText}</td>
      </tr>
      ` : ''}
      <tr>
        <td style="padding: 12px; background-color: #f9fafb; border: 1px solid #e5e7eb; font-weight: bold; color: #4b5563;">Banned On:</td>
        <td style="padding: 12px; background-color: white; border: 1px solid #e5e7eb; color: #1f2937;">${new Date().toLocaleString()}</td>
      </tr>
    </table>

    <h2 style="color: #1f2937; font-size: 20px; margin: 30px 0 15px 0;">⚠️ What This Means:</h2>
    
    <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
      <ul style="color: #991b1b; margin: 0; padding-left: 20px; line-height: 1.8;">
        <li>You cannot log in to your account</li>
        <li>Your profile is no longer visible to other users</li>
        <li>You cannot access any content or features</li>
        ${isPermanent ? '<li>This ban is permanent and cannot be reversed</li>' : '<li>Your account will be automatically restored after the ban period</li>'}
      </ul>
    </div>

    ${!isPermanent ? `
    <div style="background-color: #fefce8; border-left: 4px solid #eab308; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
      <p style="color: #854d0e; margin: 0; font-size: 14px; line-height: 1.6;">
        <strong>📅 Your Account Will Be Restored:</strong><br>
        After ${duration} day${duration > 1 ? 's' : ''}, on ${untilText}, your account will be automatically reactivated. You'll be able to log in and use all features normally.
      </p>
    </div>
    ` : ''}

    <h2 style="color: #1f2937; font-size: 20px; margin: 30px 0 15px 0;">🤝 Need Help?</h2>
    
    <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
      <p style="color: #166534; margin: 0; font-size: 14px; line-height: 1.6;">
        <strong>If you believe this ban was made in error:</strong><br>
        Please contact our support team at <a href="mailto:support@lightoflife.com" style="color: #16a34a; text-decoration: underline;">support@lightoflife.com</a> with your account details and explain your situation. We'll review your case carefully.
      </p>
    </div>

    <div style="text-align: center; margin-top: 30px;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/support" 
         style="display: inline-block; background: linear-gradient(135deg, #9333ea 0%, #ec4899 100%); color: white; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-weight: bold; font-size: 16px;">
        Contact Support
      </a>
    </div>
  `;
  
  const emailHtml = createSecurityEmailTemplate(
    isPermanent ? 'Account Permanently Banned' : 'Account Temporarily Suspended',
    '🚫',
    content,
    '#dc2626'
  );
  
  await transporter.sendMail({
    from: `"Light of Life Security" <${process.env.VPN_EMAIL_USER || process.env.EMAIL_USER}>`,
    to: userEmail,
    subject: `🚫 ${isPermanent ? 'Account Permanently Banned' : 'Account Temporarily Suspended'}`,
    html: emailHtml,
  });
  
  console.log(`Account ban email sent to: ${userEmail} (${isPermanent ? 'permanent' : `${duration} days`})`);
}
