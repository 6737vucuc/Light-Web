import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';

const sql = neon(process.env.DATABASE_URL!);
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Update typing status
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    const { receiverId, isTyping } = await request.json();

    if (!receiverId) {
      return NextResponse.json(
        { error: 'Receiver ID is required' },
        { status: 400 }
      );
    }

    // Store typing status in a temporary table or cache
    // For now, we'll use a simple table approach
    if (isTyping) {
      // Upsert typing status
      await sql`
        INSERT INTO typing_status (user_id, receiver_id, updated_at)
        VALUES (${decoded.userId}, ${receiverId}, NOW())
        ON CONFLICT (user_id, receiver_id)
        DO UPDATE SET updated_at = NOW()
      `;
    } else {
      // Remove typing status
      await sql`
        DELETE FROM typing_status
        WHERE user_id = ${decoded.userId} AND receiver_id = ${receiverId}
      `;
    }

    return NextResponse.json({
      success: true,
      message: 'Typing status updated',
    });
  } catch (error) {
    console.error('Error updating typing status:', error);
    return NextResponse.json(
      { error: 'Failed to update typing status' },
      { status: 500 }
    );
  }
}

// Get typing status
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get typing status (only if updated within last 5 seconds)
    const result = await sql`
      SELECT user_id, updated_at
      FROM typing_status
      WHERE user_id = ${parseInt(userId)} 
        AND receiver_id = ${decoded.userId}
        AND updated_at > NOW() - INTERVAL '5 seconds'
    `;

    return NextResponse.json({
      success: true,
      isTyping: result.length > 0,
    });
  } catch (error) {
    console.error('Error fetching typing status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch typing status' },
      { status: 500 }
    );
  }
}
