export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);

    // إذا لم يكن هناك توكن صالح، نرجع user: null بدلاً من 401
    if ('error' in authResult) {
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({ user: authResult.user });
  } catch (error) {
    console.error('Auth /me error:', error);
    return NextResponse.json({ error: 'Auth failed' }, { status: 500 });
  }
}
