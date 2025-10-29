import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth/middleware';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    // Update lastSeen to current time
    await db
      .update(users)
      .set({ lastSeen: new Date() })
      .where(eq(users.id, authResult.user.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update lastSeen error:', error);
    return NextResponse.json(
      { error: 'Failed to update lastSeen' },
      { status: 500 }
    );
  }
}

