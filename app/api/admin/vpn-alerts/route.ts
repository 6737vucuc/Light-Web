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
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>تحذير أمني - VPN Detection</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 30px; text-align: center;">
      <div style="background-color: rgba(255,255,255,0.2); width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 15px; display: flex; align-items: center; justify-content: center;">
        <span style="font-size: 40px;">⚠️</span>
      </div>
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">تحذير أمني</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">تم اكتشاف استخدام VPN/Proxy</p>
    </div>

    <!-- Content -->
    <div style="padding: 40px 30px;">
      <p style="font-size: 18px; color: #1f2937; margin: 0 0 20px 0;">مرحباً ${userName}،</p>
      
      <div style="background-color: #fef2f2; border-right: 4px solid #dc2626; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
        <p style="color: #991b1b; margin: 0; font-size: 16px; line-height: 1.6;">
          <strong>تم اكتشاف محاولة الوصول إلى حسابك باستخدام VPN أو Proxy.</strong>
        </p>
      </div>

      <h2 style="color: #1f2937; font-size: 20px; margin: 30px 0 15px 0;">📋 تفاصيل الاكتشاف:</h2>
      
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
        <tr>
          <td style="padding: 12px; background-color: #f9fafb; border: 1px solid #e5e7eb; font-weight: bold; color: #4b5563;">عنوان IP:</td>
          <td style="padding: 12px; background-color: white; border: 1px solid #e5e7eb; color: #1f2937;">${ipAddress}</td>
        </tr>
        <tr>
          <td style="padding: 12px; background-color: #f9fafb; border: 1px solid #e5e7eb; font-weight: bold; color: #4b5563;">نوع الاتصال:</td>
          <td style="padding: 12px; background-color: white; border: 1px solid #e5e7eb; color: #1f2937;">
            ${detection.isVPN ? '✓ VPN' : ''} 
            ${detection.isTor ? '✓ Tor' : ''} 
            ${detection.isProxy ? '✓ Proxy' : ''}
          </td>
        </tr>
        <tr>
          <td style="padding: 12px; background-color: #f9fafb; border: 1px solid #e5e7eb; font-weight: bold; color: #4b5563;">مستوى الخطر:</td>
          <td style="padding: 12px; background-color: white; border: 1px solid #e5e7eb; color: #1f2937;">
            <span style="background-color: ${detection.threatLevel === 'critical' ? '#dc2626' : detection.threatLevel === 'high' ? '#ea580c' : '#f59e0b'}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 14px;">
              ${detection.threatLevel === 'critical' ? 'حرج' : detection.threatLevel === 'high' ? 'عالي' : 'متوسط'}
            </span>
          </td>
        </tr>
        ${detection.country ? `
        <tr>
          <td style="padding: 12px; background-color: #f9fafb; border: 1px solid #e5e7eb; font-weight: bold; color: #4b5563;">الموقع:</td>
          <td style="padding: 12px; background-color: white; border: 1px solid #e5e7eb; color: #1f2937;">${detection.city || ''}, ${detection.country}</td>
        </tr>
        ` : ''}
      </table>

      <h2 style="color: #1f2937; font-size: 20px; margin: 30px 0 15px 0;">🔒 لماذا نمنع VPN؟</h2>
      
      <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
        <ul style="margin: 0; padding-right: 20px; color: #1e40af; line-height: 1.8;">
          <li><strong>حماية الخصوصية:</strong> نحمي خصوصية جميع المستخدمين من الأنشطة المشبوهة</li>
          <li><strong>منع الاحتيال:</strong> VPN يُستخدم أحياناً في أنشطة احتيالية</li>
          <li><strong>الأمان:</strong> نضمن بيئة آمنة لجميع أعضاء المجتمع</li>
          <li><strong>الامتثال:</strong> نلتزم بمعايير الأمان والخصوصية الدولية</li>
        </ul>
      </div>

      <h2 style="color: #1f2937; font-size: 20px; margin: 30px 0 15px 0;">✅ ماذا يجب أن تفعل؟</h2>
      
      <div style="background-color: #f0fdf4; border-right: 4px solid #16a34a; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
        <ol style="margin: 0; padding-right: 20px; color: #15803d; line-height: 1.8;">
          <li><strong>أوقف VPN/Proxy:</strong> قم بإيقاف تشغيل أي VPN أو Proxy</li>
          <li><strong>أعد تشغيل المتصفح:</strong> أغلق المتصفح وافتحه مجدداً</li>
          <li><strong>سجل الدخول مرة أخرى:</strong> حاول الدخول إلى حسابك بدون VPN</li>
          <li><strong>تواصل معنا:</strong> إذا كنت بحاجة لمساعدة، تواصل مع الدعم الفني</li>
        </ol>
      </div>

      <div style="background-color: #fffbeb; border-right: 4px solid #f59e0b; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
        <p style="margin: 0; color: #92400e; line-height: 1.6;">
          <strong>⚠️ تحذير:</strong> الاستمرار في محاولة الوصول باستخدام VPN قد يؤدي إلى تعليق حسابك مؤقتاً لحماية أمان المنصة.
        </p>
      </div>

      <div style="text-align: center; margin-top: 35px;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://light-of-life-project.vercel.app'}" 
           style="display: inline-block; background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%); color: white; padding: 14px 35px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
          العودة إلى الموقع
        </a>
      </div>

      <p style="color: #6b7280; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
        إذا لم تكن أنت من حاول الوصول، يرجى تغيير كلمة المرور فوراً والتواصل مع الدعم الفني.
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #f9fafb; padding: 25px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">
        هذا البريد الإلكتروني تم إرساله تلقائياً من نظام الأمان
      </p>
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">
        © 2026 Light of Life. جميع الحقوق محفوظة.
      </p>
    </div>
  </div>
</body>
</html>
    `;

    await transporter.sendMail({
      from: `"Light of Life Security" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject: '⚠️ تحذير أمني: تم اكتشاف استخدام VPN',
      html: emailHtml,
    });

    console.log(`VPN warning email sent to ${userEmail}`);
  } catch (error) {
    console.error('Error sending VPN warning email:', error);
    throw error;
  }
}
