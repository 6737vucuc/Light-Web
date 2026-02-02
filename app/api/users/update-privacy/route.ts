import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { verifyToken } from '@/lib/auth/jwt';

export async function POST(request: NextRequest) {
  // Privacy settings removed in favor of community focus
  return NextResponse.json({
    success: true,
    message: 'Privacy settings updated (Legacy)',
  });
}
