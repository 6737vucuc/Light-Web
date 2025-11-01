import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendVerificationCode(email: string, code: string, userName?: string) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Light of Life <noreply@no-reply.lightoflife.com>',
      to: [email],
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
              <p>© 2025 Light of Life</p>
              <p>May Christ's love and peace be with you always 🕊️</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      throw error;
    }

    console.log('Email sent successfully:', data);
    return data;
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
    const { data, error } = await resend.emails.send({
      from: 'Light of Life <noreply@no-reply.lightoflife.com>',
      to: [email],
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
    });

    if (error) {
      console.error('Resend error:', error);
      throw error;
    }

    console.log('Password reset email sent successfully:', data);
    return data;
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    throw error;
  }
}

/**
 * Send login verification code (2FA)
 */
export async function sendLoginVerificationCode(email: string, code: string, userName?: string, ipAddress?: string) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Light of Life <noreply@no-reply.lightoflife.com>',
      to: [email],
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
              background: #f3f4f6;
              padding: 15px;
              margin: 20px 0;
              border-radius: 5px;
              border-left: 4px solid #667eea;
            }
            .info-box p {
              margin: 5px 0;
              color: #374151;
              text-align: left;
              font-size: 14px;
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
              <p>Someone is trying to log in to your account.</p>
              <p>Your login verification code is:</p>
            </div>
            <div class="code">${code}</div>
            <div class="info-box">
              <p><strong>🔐 Login Details:</strong></p>
              <p>• Time: ${new Date().toLocaleString()}</p>
              ${ipAddress ? `<p>• IP Address: ${ipAddress}</p>` : ''}
              <p>• Code expires in: 10 minutes</p>
            </div>
            <div class="message">
              <p><strong>If this wasn't you, please secure your account immediately!</strong></p>
            </div>
            <div class="footer">
              <p>© 2025 Light of Life</p>
              <p>May Christ's love and peace be with you always 🕊️</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      throw error;
    }

    console.log('Login verification email sent successfully:', data);
    return data;
  } catch (error) {
    console.error('Failed to send login verification email:', error);
    throw error;
  }
}

/**
 * Verify code expiration (10 minutes)
 */
export function isCodeExpired(createdAt: Date): boolean {
  const TEN_MINUTES = 10 * 60 * 1000; // 10 minutes in milliseconds
  const now = new Date().getTime();
  const codeTime = new Date(createdAt).getTime();
  return (now - codeTime) > TEN_MINUTES;
}

/**
 * Generate and hash verification code for storage
 */
export function generateAndHashCode(): { code: string; hashedCode: string } {
  const crypto = require('crypto');
  const code = generateVerificationCode();
  const hashedCode = crypto.createHash('sha256').update(code).digest('hex');
  return { code, hashedCode };
}

/**
 * Verify code against hashed version
 */
export function verifyCode(inputCode: string, hashedCode: string): boolean {
  const crypto = require('crypto');
  const inputHash = crypto.createHash('sha256').update(inputCode).digest('hex');
  
  // Timing-safe comparison
  if (inputHash.length !== hashedCode.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < inputHash.length; i++) {
    result |= inputHash.charCodeAt(i) ^ hashedCode.charCodeAt(i);
  }
  
  return result === 0;
}
