export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { db } from '@/lib/db';
import { testimonies, users } from '@/lib/db/schema';
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
        id: testimonies.id,
        content: testimonies.content,
        createdAt: testimonies.createdAt,
        userName: users.name,
        userEmail: users.email,
      })
      .from(testimonies)
      .leftJoin(users, eq(testimonies.userId, users.id))
      .orderBy(testimonies.createdAt);

    return NextResponse.json({ 
      testimonies: result,
      success: true 
    });
  } catch (error) {
    console.error('Fetch testimonies error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch testimonies' },
      { status: 500 }
    );
  }
}
