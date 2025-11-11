import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { conversations, users } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth/middleware';
import { eq, and, or } from 'drizzle-orm';

// POST /api/messages/create-conversation - Create or get existing conversation
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  const { user } = authResult;

  try {
    const { otherUserId } = await request.json();

    if (!otherUserId) {
      return NextResponse.json(
        { error: 'Missing otherUserId' },
        { status: 400 }
      );
    }

    // Check if other user exists
    const otherUser = await db
      .select()
      .from(users)
      .where(eq(users.id, otherUserId))
      .limit(1);

    if (!otherUser.length) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if conversation already exists
    const existingConversation = await db
      .select()
      .from(conversations)
      .where(
        or(
          and(
            eq(conversations.participant1Id, user.id),
            eq(conversations.participant2Id, otherUserId)
          ),
          and(
            eq(conversations.participant1Id, otherUserId),
            eq(conversations.participant2Id, user.id)
          )
        )
      )
      .limit(1);

    if (existingConversation.length > 0) {
      // Conversation already exists
      return NextResponse.json({
        conversation: {
          id: existingConversation[0].id,
          participant1Id: existingConversation[0].participant1Id,
          participant2Id: existingConversation[0].participant2Id,
          otherUser: {
            id: otherUser[0].id,
            name: otherUser[0].name,
            username: otherUser[0].username,
            avatar: otherUser[0].avatar,
          }
        },
        isNew: false
      });
    }

    // Create new conversation
    const [newConversation] = await db
      .insert(conversations)
      .values({
        participant1Id: user.id,
        participant2Id: otherUserId,
        lastMessageAt: new Date(),
        createdAt: new Date(),
      })
      .returning();

    return NextResponse.json({
      conversation: {
        id: newConversation.id,
        participant1Id: newConversation.participant1Id,
        participant2Id: newConversation.participant2Id,
        otherUser: {
          id: otherUser[0].id,
          name: otherUser[0].name,
          username: otherUser[0].username,
          avatar: otherUser[0].avatar,
        }
      },
      isNew: true
    });

  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    );
  }
}
