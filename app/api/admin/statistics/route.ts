import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, communityGroups, groupMessages, dailyVerses } from '@/lib/db/schema';
import { verifyAuth } from '@/lib/auth/verify';
import { eq, sql } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.userId),
      columns: { isAdmin: true }
    });

    if (!dbUser || !dbUser.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get counts
    const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
    const [groupCount] = await db.select({ count: sql<number>`count(*)` }).from(communityGroups);
    const [messageCount] = await db.select({ count: sql<number>`count(*)` }).from(groupMessages);
    const [verseCount] = await db.select({ count: sql<number>`count(*)` }).from(dailyVerses);

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

    return NextResponse.json({
      stats: {
        totalUsers: Number(userCount.count),
        totalGroups: Number(groupCount.count),
        totalMessages: Number(messageCount.count),
        totalVerses: Number(verseCount.count)
      },
      total: Number(userCount.count),
      genderStats
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
