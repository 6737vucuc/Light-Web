export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { db } from '@/lib/db';
import { supportRequests, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request);
  
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const result = await db
      .select({
        id: supportRequests.id,
        message: supportRequests.message,
        status: supportRequests.status,
        createdAt: supportRequests.createdAt,
        userName: users.name,
        userEmail: users.email,
      })
      .from(supportRequests)
      .leftJoin(users, eq(supportRequests.userId, users.id))
      .orderBy(supportRequests.createdAt);

    return NextResponse.json({ 
      requests: result,
      success: true 
    });
  } catch (error) {
    console.error('Fetch support requests error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch support requests' },
      { status: 500 }
    );
  }
}
