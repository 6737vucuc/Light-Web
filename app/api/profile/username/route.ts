import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';

const sql = neon(process.env.DATABASE_URL!);
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    const { username } = await request.json();

    if (!username || username.length < 3) {
      return NextResponse.json(
        { error: 'Username must be at least 3 characters' },
        { status: 400 }
      );
    }

    // Validate username format
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return NextResponse.json(
        { error: 'Username can only contain letters, numbers, and underscores' },
        { status: 400 }
      );
    }

    // Check if user exists and get last username change date
    const userResult = await sql`
      SELECT id, username, username_last_changed
      FROM users
      WHERE id = ${decoded.userId}
    `;

    if (userResult.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = userResult[0];

    // Check if username is the same
    if (user.username === username) {
      return NextResponse.json(
        { error: 'This is already your username' },
        { status: 400 }
      );
    }

    // Check if 30 days have passed since last change
    if (user.username_last_changed) {
      const lastChanged = new Date(user.username_last_changed);
      const now = new Date();
      const daysSinceChange = Math.floor(
        (now.getTime() - lastChanged.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceChange < 30) {
        return NextResponse.json(
          {
            error: `You can change your username again in ${30 - daysSinceChange} days`,
            daysRemaining: 30 - daysSinceChange,
          },
          { status: 400 }
        );
      }
    }

    // Check if username is already taken
    const existingUser = await sql`
      SELECT id FROM users WHERE username = ${username} AND id != ${decoded.userId}
    `;

    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: 'Username is already taken' },
        { status: 400 }
      );
    }

    // Update username and set last changed date
    await sql`
      UPDATE users
      SET username = ${username},
          username_last_changed = NOW(),
          updated_at = NOW()
      WHERE id = ${decoded.userId}
    `;

    return NextResponse.json({
      success: true,
      message: 'Username updated successfully',
      username,
    });
  } catch (error) {
    console.error('Error updating username:', error);
    return NextResponse.json(
      { error: 'Failed to update username' },
      { status: 500 }
    );
  }
}
