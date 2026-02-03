import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verses, users } from '@/lib/db/schema';
import { verifyAuth } from '@/lib/auth/verify';
import { eq, or, sql } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    let userReligion = 'all';

    if (user) {
      const userDetails = await db.query.users.findFirst({
        where: eq(users.id, user.userId),
      });
      userReligion = userDetails?.religion || 'all';
    }

    // Fetch random verse matching user religion or 'all'
    const randomVerse = await db.select()
      .from(verses)
      .where(
        or(
          eq(verses.religion, userReligion),
          eq(verses.religion, 'all')
        )
      )
      .orderBy(sql`RANDOM()`)
      .limit(1);

    if (randomVerse.length === 0) {
      // Fallback if no verses found
      return NextResponse.json({
        verse: {
          content: "Let your light shine before others.",
          reference: "Matthew 5:16",
          religion: "all"
        }
      });
    }

    return NextResponse.json({ verse: randomVerse[0] });
  } catch (error) {
    console.error('Random verse error:', error);
    return NextResponse.json({ error: 'Failed to fetch random verse' }, { status: 500 });
  }
}
