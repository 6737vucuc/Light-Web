import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function POST(request: NextRequest) {
  try {
    // Get current user from token
    const token = request.cookies.get('token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    let currentUserId: number;
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      currentUserId = decoded.userId;
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Check if current user is admin
    const currentUser = await db
      .select()
      .from(users)
      .where(eq(users.id, currentUserId))
      .limit(1);

    if (!currentUser.length || !currentUser[0].isAdmin) {
      return NextResponse.json(
        { error: 'Only admins can make other users admin' },
        { status: 403 }
      );
    }

    // Get target user ID from request
    const { userId, isAdmin } = await request.json();

    if (!userId || typeof isAdmin !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing required fields: userId, isAdmin' },
        { status: 400 }
      );
    }

    // Check if target user exists
    const targetUser = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!targetUser.length) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Prevent removing admin from yourself
    if (userId === currentUserId && !isAdmin) {
      return NextResponse.json(
        { error: 'You cannot remove admin status from yourself' },
        { status: 400 }
      );
    }

    // Update user admin status
    await db
      .update(users)
      .set({ 
        isAdmin,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));

    return NextResponse.json({
      success: true,
      message: isAdmin 
        ? `User ${targetUser[0].username} is now an admin` 
        : `Admin status removed from ${targetUser[0].username}`,
      user: {
        id: targetUser[0].id,
        username: targetUser[0].username,
        name: targetUser[0].name,
        isAdmin
      }
    });

  } catch (error) {
    console.error('Error updating admin status:', error);
    return NextResponse.json(
      { error: 'Failed to update admin status' },
      { status: 500 }
    );
  }
}

// GET endpoint to check if user is admin
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    let currentUserId: number;
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      currentUserId = decoded.userId;
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, currentUserId))
      .limit(1);

    if (!user.length) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      isAdmin: user[0].isAdmin,
      userId: user[0].id,
      username: user[0].username
    });

  } catch (error) {
    console.error('Error checking admin status:', error);
    return NextResponse.json(
      { error: 'Failed to check admin status' },
      { status: 500 }
    );
  }
}
