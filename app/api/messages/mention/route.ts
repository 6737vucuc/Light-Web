import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { ilike } from 'drizzle-orm';
import { verifyAuth } from '@/lib/auth/verify';

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const query = request.nextUrl.searchParams.get('q') || '';

    if (!query.trim() || query.length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    // Search for users by name
    const suggestions = await db.query.users.findMany({
      where: (usersTable) => ilike(usersTable.name, `%${query}%`),
      columns: {
        id: true,
        name: true,
        avatar: true,
      },
      limit: 10,
    });

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('Error searching mentions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
