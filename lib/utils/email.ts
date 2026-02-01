import { createTransport } from 'nodemailer';

// Create transporter using Gmail
const transporter = createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function sendVerificationCode(email: string, code: string, userName?: string) {
  try {
    const mailOptions = {
      from: `"Light of Life" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Light of Life - Verification Code',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              padding: 20px;
              margin: 0;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background: white;
              border-radius: 15px;
              padding: 40px;
              box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            }
            .logo {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo img {
              width: 120px;
              height: 120px;
              border-radius: 50%;
              margin: 0 auto 20px;
              display: block;
            }
            .logo h1 {
              color: #667eea;
              margin: 0;
              font-size: 32px;
            }
            .logo p {
              color: #764ba2;
              margin: 5px 0;
              font-size: 16px;
            }
            .code {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              font-size: 32px;
              font-weight: bold;
              padding: 20px;
              text-align: center;
              border-radius: 10px;
              letter-spacing: 8px;
              margin: 30px 0;
            }
            .message {
              color: #333;
              font-size: 16px;
              line-height: 1.6;
              text-align: center;
            }
            .message p {
              margin: 10px 0;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              color: #666;
              font-size: 14px;
            }
            .footer p {
              margin: 5px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">
              <img src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663201735195/HWGCkoAGIODRiPAL.png" alt="Light of Life" />
              <h1>Light of Life</h1>
              <p>Spreading Christ's Love</p>
            </div>
            <div class="message">
              <p>Welcome to Light of Life, ${userName || 'Friend'}!</p>
              <p>Your verification code is:</p>
            </div>
            <div class="code">${code}</div>
            <div class="message">
              <p><strong>This code is valid for 10 minutes only.</strong></p>
              <p>If you didn't request this code, please ignore this message.</p>
            </div>
            <div class="footer">
              <p>© 2026 Light of Life</p>
              <p>May Christ's love and peace be with you always 🕊️</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
}

/**
 * Generate a secure 6-digit verification code
 * Uses cryptographically secure random number generation
 */
export function generateVerificationCode(): string {
  // Generate 6 random digits using crypto for better security
  const crypto = require('crypto');
  const randomNum = crypto.randomInt(100000, 999999);
  return randomNum.toString();
}

/**
 * Send password reset verification code
 */
export async function sendPasswordResetCode(email: string, code: string, userName?: string) {
  try {
    const mailOptions = {
      from: `"Light of Life" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Light of Life - Password Reset Code',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              padding: 20px;
              margin: 0;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background: white;
              border-radius: 15px;
              padding: 40px;
              box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            }
            .logo {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo img {
              width: 120px;
              height: 120px;
              border-radius: 50%;
              margin: 0 auto 20px;
              display: block;
            }
            .logo h1 {
              color: #667eea;
              margin: 0;
              font-size: 32px;
            }
            .logo p {
              color: #764ba2;
              margin: 5px 0;
              font-size: 16px;
            }
            .code {
              background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
              color: white;
              font-size: 32px;
              font-weight: bold;
              padding: 20px;
              text-align: center;
              border-radius: 10px;
              letter-spacing: 8px;
              margin: 30px 0;
            }
            .message {
              color: #333;
              font-size: 16px;
              line-height: 1.6;
              text-align: center;
            }
            .message p {
              margin: 10px 0;
            }
            .warning {
              background: #fef3c7;
              border-left: 4px solid #f59e0b;
              padding: 15px;
              margin: 20px 0;
              border-radius: 5px;
            }
            .warning p {
              margin: 5px 0;
              color: #92400e;
              text-align: left;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              color: #666;
              font-size: 14px;
            }
            .footer p {
              margin: 5px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">
              <img src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663201735195/HWGCkoAGIODRiPAL.png" alt="Light of Life" />
              <h1>Light of Life</h1>
              <p>Spreading Christ's Love</p>
            </div>
            <div class="message">
              <p>Hello ${userName || 'Friend'},</p>
              <p>We received a request to reset your password.</p>
              <p>Your password reset code is:</p>
            </div>
            <div class="code">${code}</div>
            <div class="warning">
              <p><strong>⚠️ Security Notice:</strong></p>
              <p>• This code is valid for 10 minutes only</p>
              <p>• Never share this code with anyone</p>
              <p>• If you didn't request this, please ignore this email and secure your account</p>
            </div>
            <div class="footer">
              <p>© 2025 Light of Life</p>
              <p>May Christ's love and peace be with you always 🕊️</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    throw error;
  }
}

/**
 * Send account lockout notification
 */
export async function sendAccountLockoutNotification(email: string, userName?: string, ipAddress?: string, lockedUntil?: Date) {
  try {
    const unlockTime = lockedUntil ? new Date(lockedUntil).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }) : 'in 30 minutes';

    const mailOptions = {
      from: `"Light of Life Security" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '🔒 Light of Life - Account Locked Due to Multiple Failed Login Attempts',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
              padding: 20px;
              margin: 0;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background: white;
              border-radius: 15px;
              padding: 40px;
              box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            }
            .logo {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo img {
              width: 120px;
              height: 120px;
              border-radius: 50%;
              margin: 0 auto 20px;
              display: block;
            }
            .logo h1 {
              color: #ef4444;
              margin: 0;
              font-size: 32px;
            }
            .logo p {
              color: #dc2626;
              margin: 5px 0;
              font-size: 16px;
            }
            .alert-box {
              background: #fee2e2;
              border: 2px solid #ef4444;
              padding: 20px;
              border-radius: 10px;
              margin: 20px 0;
              text-align: center;
            }
            .alert-box h2 {
              color: #dc2626;
              margin: 0 0 10px 0;
              font-size: 24px;
            }
            .alert-box p {
              color: #991b1b;
              margin: 5px 0;
              font-size: 16px;
            }
            .message {
              color: #333;
              font-size: 16px;
              line-height: 1.6;
              text-align: center;
            }
            .message p {
              margin: 10px 0;
            }
            .info-box {
              background: #fef3c7;
              border-left: 4px solid #f59e0b;
              padding: 15px;
              margin: 20px 0;
              border-radius: 5px;
            }
            .info-box p {
              margin: 5px 0;
              color: #92400e;
              text-align: left;
            }
            .security-tips {
              background: #e0e7ff;
              border-left: 4px solid #667eea;
              padding: 15px;
              margin: 20px 0;
              border-radius: 5px;
            }
            .security-tips h3 {
              color: #3730a3;
              margin: 0 0 10px 0;
              font-size: 18px;
            }
            .security-tips ul {
              margin: 10px 0;
              padding-left: 20px;
              color: #3730a3;
              text-align: left;
            }
            .security-tips li {
              margin: 5px 0;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              color: #666;
              font-size: 14px;
            }
            .footer p {
              margin: 5px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">
              <img src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663201735195/HWGCkoAGIODRiPAL.png" alt="Light of Life" />
              <h1>Light of Life</h1>
              <p>Security Alert</p>
            </div>
            <div class="alert-box">
              <h2>🔒 Account Locked</h2>
              <p><strong>Your account has been temporarily locked</strong></p>
            </div>
            <div class="message">
              <p>Hello ${userName || 'Friend'},</p>
              <p>We detected <strong>multiple failed login attempts</strong> on your account.</p>
              <p>For your security, your account has been temporarily locked.</p>
            </div>
            <div class="info-box">
              <p><strong>⚠️ Lockout Details:</strong></p>
              ${ipAddress ? `<p>• IP Address: ${ipAddress}</p>` : ''}
              <p>• Time: ${new Date().toLocaleString()}</p>
              <p>• Account will unlock: ${unlockTime}</p>
              <p>• Reason: 5 consecutive failed login attempts</p>
            </div>
            <div class="message">
              <p><strong>What happens next?</strong></p>
              <p>Your account will automatically unlock after 30 minutes.</p>
              <p>If this wasn't you, please take immediate action to secure your account.</p>
            </div>
            <div class="security-tips">
              <h3>🛡️ Security Recommendations:</h3>
              <ul>
                <li>Change your password immediately after unlock</li>
                <li>Enable two-factor authentication (2FA)</li>
                <li>Use a strong, unique password</li>
                <li>Never share your password with anyone</li>
                <li>Check for suspicious activity in your account</li>
              </ul>
            </div>
            <div class="message">
              <p>If you need assistance, please contact our support team.</p>
            </div>
            <div class="footer">
              <p>© 2025 Light of Life</p>
              <p>This is an automated security notification</p>
              <p>May Christ's love and peace be with you always 🕊️</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Account lockout notification sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('Failed to send account lockout notification:', error);
    throw error;
  }
}

/**
 * Send login verification code (2FA)
 */
export async function sendLoginVerificationCode(email: string, code: string, userName?: string, ipAddress?: string) {
  try {
    const mailOptions = {
      from: `"Light of Life" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Light of Life - Login Verification Code',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              padding: 20px;
              margin: 0;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              background: white;
              border-radius: 15px;
              padding: 40px;
              box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            }
            .logo {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo img {
              width: 120px;
              height: 120px;
              border-radius: 50%;
              margin: 0 auto 20px;
              display: block;
            }
            .logo h1 {
              color: #667eea;
              margin: 0;
              font-size: 32px;
            }
            .logo p {
              color: #764ba2;
              margin: 5px 0;
              font-size: 16px;
            }
            .code {
              background: linear-gradient(135deg, #10b981 0%, #059669 100%);
              color: white;
              font-size: 32px;
              font-weight: bold;
              padding: 20px;
              text-align: center;
              border-radius: 10px;
              letter-spacing: 8px;
              margin: 30px 0;
            }
            .message {
              color: #333;
              font-size: 16px;
              line-height: 1.6;
              text-align: center;
            }
            .message p {
              margin: 10px 0;
            }
            .info-box {
              background: #e0e7ff;
              border-left: 4px solid #667eea;
              padding: 15px;
              margin: 20px 0;
              border-radius: 5px;
            }
            .info-box p {
              margin: 5px 0;
              color: #3730a3;
              text-align: left;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              color: #666;
              font-size: 14px;
            }
            .footer p {
              margin: 5px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">
              <img src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663201735195/HWGCkoAGIODRiPAL.png" alt="Light of Life" />
              <h1>Light of Life</h1>
              <p>Spreading Christ's Love</p>
            </div>
            <div class="message">
              <p>Hello ${userName || 'Friend'},</p>
              <p>We detected a login attempt to your account.</p>
              <p>Your verification code is:</p>
            </div>
            <div class="code">${code}</div>
            <div class="info-box">
              <p><strong>ℹ️ Login Information:</strong></p>
              ${ipAddress ? `<p>• IP Address: ${ipAddress}</p>` : ''}
              <p>• Time: ${new Date().toLocaleString()}</p>
              <p>• This code is valid for 10 minutes</p>
            </div>
            <div class="message">
              <p>If this wasn't you, please secure your account immediately.</p>
            </div>
            <div class="footer">
              <p>© 2025 Light of Life</p>
              <p>May Christ's love and peace be with you always 🕊️</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Login verification email sent successfully:', info.messageId);
    return info;
  } catch (error) {
    console.error('Failed to send login verification email:', error);
    throw error;
  }
}
