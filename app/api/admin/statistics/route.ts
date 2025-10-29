import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth/middleware';
import { sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  // Check if user is admin
  if (!authResult.user.isAdmin) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 403 }
    );
  }

  try {
    // Get total users count
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(users);
    const total = Number(totalResult[0]?.count || 0);

    // Get gender statistics
    const genderResult = await db
      .select({
        gender: users.gender,
        count: sql<number>`count(*)`
      })
      .from(users)
      .groupBy(users.gender);

    const genderStats: Record<string, number> = {};
    genderResult.forEach((row) => {
      if (row.gender) {
        genderStats[row.gender] = Number(row.count);
      }
    });

    // Get country statistics
    const countryResult = await db
      .select({
        country: users.country,
        count: sql<number>`count(*)`
      })
      .from(users)
      .groupBy(users.country);

    const countryStats: Record<string, number> = {};
    countryResult.forEach((row) => {
      if (row.country) {
        countryStats[row.country] = Number(row.count);
      }
    });

    return NextResponse.json({
      total,
      genderStats,
      countryStats,
    });
  } catch (error) {
    console.error('Statistics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  }
}

