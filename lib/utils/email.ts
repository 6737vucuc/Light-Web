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
              <img src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663194710412/HjaUaIWSYzXdMpPT.png" alt="Light of Life" />
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

export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
