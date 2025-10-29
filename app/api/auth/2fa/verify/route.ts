import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth/middleware';
import { TwoFactorAuth, Email2FA } from '@/lib/auth/two-factor';

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { method, code } = await request.json();

    if (!code) {
      return NextResponse.json({ error: 'Verification code is required' }, { status: 400 });
    }

    let isValid = false;

    if (method === 'authenticator') {
      // Verify TOTP code
      isValid = await TwoFactorAuth.verify2FA(user.id, code);
    } else if (method === 'email') {
      // Verify email code
      isValid = Email2FA.verifyCode(user.email, code);
    } else {
      return NextResponse.json(
        { error: 'Invalid 2FA method' },
        { status: 400 }
      );
    }

    if (isValid) {
      return NextResponse.json({
        success: true,
        message: '2FA enabled successfully',
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Verify 2FA error:', error);
    return NextResponse.json(
      { error: 'Failed to verify 2FA' },
      { status: 500 }
    );
  }
}
