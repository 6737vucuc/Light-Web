import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import nodemailer from 'nodemailer';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, email, ipAddress, detection } = body;

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get user details
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Send warning email
    await sendVPNWarningEmail(user.name, email, ipAddress, detection);

    return NextResponse.json({
      success: true,
      message: 'Warning email sent successfully',
    });
  } catch (error) {
    console.error('VPN alert error:', error);
    return NextResponse.json(
      { error: 'Failed to send alert' },
      { status: 500 }
    );
  }
}

async function sendVPNWarningEmail(
  userName: string,
  userEmail: string,
  ipAddress: string,
  detection: any
) {
  try {
    // Create transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Security Warning - VPN Detection</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 30px; text-align: center;">
      <div style="background-color: rgba(255,255,255,0.2); width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center;">
        <span style="font-size: 40px;">⚠️</span>
      </div>
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">Security Warning</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">VPN/Proxy Detected</p>
    </div>

    <!-- Content -->
    <div style="padding: 40px 30px;">
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
    </div>

    <!-- Footer -->
    <div style="background-color: #f9fafb; padding: 25px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="color: #6b7280; margin: 0 0 10px 0; font-size: 14px;">
        This is an automated security alert from <strong>Light of Life</strong>
      </p>
      <p style="color: #9ca3af; margin: 0; font-size: 12px;">
        If you believe this is an error, please contact our support team.
      </p>
    </div>
  </div>
</body>
</html>
    `;

    // Send email
    await transporter.sendMail({
      from: `"Light of Life Security" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: '⚠️ Security Warning - VPN/Proxy Detected',
      html: emailHtml,
    });

    console.log('VPN warning email sent to:', userEmail);
  } catch (error) {
    console.error('Error sending VPN warning email:', error);
    throw error;
  }
}
