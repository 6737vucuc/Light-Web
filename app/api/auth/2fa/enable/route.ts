export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { TwoFactorAuth, Email2FA } from '@/lib/auth/two-factor';
import QRCode from 'qrcode';

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { user } = authResult;

    const body = await request.json();
    const method = body.method; // 'authenticator' or 'email'

    if (method === 'authenticator') {
      // Generate TOTP secret and QR code
      const { secret, backupCodes, qrCode } = await TwoFactorAuth.enable2FA(user.id);

      // Generate QR code image
      const qrCodeImage = await QRCode.toDataURL(qrCode);

      return NextResponse.json({
        success: true,
        method: 'authenticator',
        secret,
        qrCode: qrCodeImage,
        backupCodes,
        message: 'Scan the QR code with your authenticator app',
      });
    } else if (method === 'email') {
      // Send verification code via email
      const sent = await Email2FA.sendCode(user.email, user.name);

      if (!sent) {
        return NextResponse.json(
          { error: 'Failed to send verification email. Please try again later.' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        method: 'email',
        message: 'Verification code sent to your email',
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid 2FA method. Use "authenticator" or "email"' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Enable 2FA error:', error);
    return NextResponse.json(
      { error: 'Failed to enable 2FA' },
      { status: 500 }
    );
  }
}
