import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { logIDORAttempt, logCriticalError } from '@/lib/security/security-logger';
import { getClientIP } from '@/lib/security/vpn-detection';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authResult = await requireAuth(request);
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { user: authenticatedUser } = authResult;

    const userId = parseInt(id);

    // IDOR Protection: Ensure the authenticated user can only access their own profile
    // or if they are an admin, they can access any profile.
    if (authenticatedUser.id !== userId && !authenticatedUser.isAdmin) {
      logIDORAttempt(authenticatedUser.id, id, 'user_profile', getClientIP(request));
      return NextResponse.json({ error: 'Unauthorized access to user profile' }, { status: 403 });
    }

    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        id: true,
        name: true,
        avatar: true,
        lastSeen: true,
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const formattedUser = {
      ...user,
      userId: user.id
    };

    return NextResponse.json({ user: formattedUser });
  } catch (error) {
    logCriticalError(error, 'GET /api/users/[id]');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
