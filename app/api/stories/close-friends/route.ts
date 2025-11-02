import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';

const sql = neon(process.env.DATABASE_URL!);
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Get close friends list
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };

    const closeFriends = await sql`
      SELECT 
        cf.id,
        cf.friend_id,
        cf.added_at,
        u.name,
        u.username,
        u.avatar
      FROM close_friends cf
      JOIN users u ON cf.friend_id = u.id
      WHERE cf.user_id = ${decoded.userId}
      ORDER BY cf.added_at DESC
    `;

    return NextResponse.json({
      success: true,
      closeFriends: closeFriends.map((cf) => ({
        id: cf.id,
        friendId: cf.friend_id,
        name: cf.name,
        username: cf.username,
        avatar: cf.avatar,
        addedAt: cf.added_at,
      })),
    });
  } catch (error) {
    console.error('Error fetching close friends:', error);
    return NextResponse.json(
      { error: 'Failed to fetch close friends' },
      { status: 500 }
    );
  }
}

// Add user to close friends
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    const { friendId } = await request.json();

    if (!friendId) {
      return NextResponse.json(
        { error: 'Friend ID is required' },
        { status: 400 }
      );
    }

    // Check if user exists
    const userResult = await sql`
      SELECT id FROM users WHERE id = ${friendId}
    `;

    if (userResult.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if already in close friends
    const existingResult = await sql`
      SELECT id FROM close_friends
      WHERE user_id = ${decoded.userId} AND friend_id = ${friendId}
    `;

    if (existingResult.length > 0) {
      return NextResponse.json(
        { error: 'User is already in close friends' },
        { status: 400 }
      );
    }

    // Add to close friends
    const result = await sql`
      INSERT INTO close_friends (user_id, friend_id)
      VALUES (${decoded.userId}, ${friendId})
      RETURNING id, friend_id, added_at
    `;

    return NextResponse.json({
      success: true,
      closeFriend: result[0],
    });
  } catch (error) {
    console.error('Error adding close friend:', error);
    return NextResponse.json(
      { error: 'Failed to add close friend' },
      { status: 500 }
    );
  }
}

// Remove user from close friends
export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    const { searchParams } = new URL(request.url);
    const friendId = searchParams.get('friendId');

    if (!friendId) {
      return NextResponse.json(
        { error: 'Friend ID is required' },
        { status: 400 }
      );
    }

    await sql`
      DELETE FROM close_friends
      WHERE user_id = ${decoded.userId} AND friend_id = ${parseInt(friendId)}
    `;

    return NextResponse.json({
      success: true,
      message: 'Removed from close friends',
    });
  } catch (error) {
    console.error('Error removing close friend:', error);
    return NextResponse.json(
      { error: 'Failed to remove close friend' },
      { status: 500 }
    );
  }
}
