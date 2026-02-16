import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from './jwt';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function requireAuth(request: NextRequest) {
  try {
    // Try to get token from cookie first (check both auth_token and token), then from Authorization header
    let token = request.cookies.get('auth_token')?.value || request.cookies.get('token')?.value;
    
    if (!token) {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

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

    const formattedUser = {
      ...user,
      userId: user.id
    };

    return { user: formattedUser };
  } catch (error) {
    console.error('Auth middleware error:', error);
    return { error: 'Authentication failed', status: 500 };
  }
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

