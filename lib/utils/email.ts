import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function sendVerificationCode(email: string, code: string, userName?: string) {
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
          .footer {
            margin-top: 30px;
            text-align: center;
            color: #666;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">
            <img src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663194710412/HjaUaIWSYzXdMpPT.png" alt="Light of Life" style="width: 120px; height: 120px; border-radius: 50%; margin: 0 auto 20px; display: block;" />
            <h1 style="color: #667eea; margin: 0;">Light of Life</h1>
            <p style="color: #764ba2; margin: 5px 0;">Spreading Christ's Love</p>
          </div>
          <div class="message">
            <p>Welcome to Light of Life, ${userName || 'Friend'}!</p>
            <p>Your verification code is:</p>
          </div>
          <div class="code">${code}</div>
          <div class="message">
            <p>This code is valid for 10 minutes only.</p>
            <p>If you didn't request this code, please ignore this message.</p>
          </div>
          <div class="footer">
            <p>© 2025 Light of Life</p>
            <p>May Christ's love and peace be with you always</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  await transporter.sendMail(mailOptions);
}

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

