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
    const body = await request.json();

    const {
      isPrivate,
      hideFollowers,
      hideFollowing,
      allowComments,
      allowMessages,
    } = body;

    // Check if at least one field is provided
    if (
      typeof isPrivate !== 'boolean' &&
      typeof hideFollowers !== 'boolean' &&
      typeof hideFollowing !== 'boolean' &&
      !allowComments &&
      !allowMessages
    ) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Update privacy settings using template literals
    const result = await sql`
      UPDATE users
      SET 
        is_private = COALESCE(${typeof isPrivate === 'boolean' ? isPrivate : null}, is_private),
        hide_followers = COALESCE(${typeof hideFollowers === 'boolean' ? hideFollowers : null}, hide_followers),
        hide_following = COALESCE(${typeof hideFollowing === 'boolean' ? hideFollowing : null}, hide_following),
        allow_comments = COALESCE(${allowComments || null}, allow_comments),
        allow_messages = COALESCE(${allowMessages || null}, allow_messages),
        updated_at = NOW()
      WHERE id = ${decoded.userId}
      RETURNING id, is_private, hide_followers, hide_following, allow_comments, allow_messages
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Privacy settings updated successfully',
      settings: result[0],
    });
  } catch (error) {
    console.error('Error updating privacy settings:', error);
    return NextResponse.json(
      { error: 'Failed to update privacy settings' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };

    const result = await sql`
      SELECT 
        is_private,
        hide_followers,
        hide_following,
        allow_comments,
        allow_messages,
        privacy_posts,
        privacy_friends_list,
        privacy_profile,
        privacy_photos,
        privacy_messages,
        privacy_friend_requests,
        hide_online_status
      FROM users
      WHERE id = ${decoded.userId}
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      settings: result[0],
    });
  } catch (error) {
    console.error('Error fetching privacy settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch privacy settings' },
      { status: 500 }
    );
  }
}
