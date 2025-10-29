import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from './jwt';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function requireAuth(request: NextRequest) {
  const token = request.cookies.get('token')?.value;

  if (!token) {
    return { error: 'Unauthorized', status: 401 };
  }

  const payload = await verifyToken(token);

  if (!payload) {
    return { error: 'Invalid token', status: 401 };
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, payload.userId as number),
  });

  if (!user) {
    return { error: 'User not found', status: 404 };
  }

  if (user.isBanned) {
    return { error: 'Your account has been banned', status: 403 };
  }

  return { user };
}

export async function requireAdmin(request: NextRequest) {
  const authResult = await requireAuth(request);

  if ('error' in authResult) {
    return authResult;
  }

  if (!authResult.user.isAdmin) {
    return { error: 'Unauthorized - Admin access required', status: 403 };
  }

  return { user: authResult.user };
}

