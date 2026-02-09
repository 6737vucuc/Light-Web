import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { verifyAuth } from '@/lib/auth/verify';
import { eq } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Start a new conversation with a user
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { recipientId } = body;

    if (!recipientId) {
      return NextResponse.json(
        { error: 'Recipient ID is required' },
        { status: 400 }
      );
    }

    // Get recipient user info
    const [recipient] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        avatar: users.avatar,
      })
      .from(users)
      .where(eq(users.id, recipientId));

    if (!recipient) {
      return NextResponse.json(
        { error: 'Recipient not found' },
        { status: 404 }
      );
    }

    // Return conversation object matching the structure expected by WhatsAppMessenger
    const conversation = {
      id: recipientId,
      other_user_id: recipientId,
      other_user_name: recipient.name,
      other_user_avatar: recipient.avatar,
      last_message: '',
      last_message_at: null,
      unread_count: 0,
      created_at: new Date().toISOString(),
    };

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error('Start conversation error:', error);
    return NextResponse.json(
      { error: 'Failed to start conversation' },
      { status: 500 }
    );
  }
}
