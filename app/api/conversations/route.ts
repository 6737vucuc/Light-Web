import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { conversations, conversationParticipants, messages, users } from '@/lib/db/schema';
import { eq, and, or, desc, sql } from 'drizzle-orm';
import { verifyAuth } from '@/lib/auth/middleware';

// GET /api/conversations - Get all conversations for current user
export async function GET(req: NextRequest) {
  try {
    const authResult = await verifyAuth(req);
    if (!authResult.valid || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authResult.user.id;

    // Get all conversations where user is a participant
    const userConversations = await db
      .select({
        id: conversations.id,
        type: conversations.type,
        name: conversations.name,
        avatar: conversations.avatar,
        lastMessageAt: conversations.lastMessageAt,
        createdAt: conversations.createdAt,
        lastReadAt: conversationParticipants.lastReadAt,
      })
      .from(conversations)
      .innerJoin(
        conversationParticipants,
        and(
          eq(conversationParticipants.conversationId, conversations.id),
          eq(conversationParticipants.userId, userId),
          eq(conversationParticipants.isActive, true)
        )
      )
      .orderBy(desc(conversations.lastMessageAt));

    // For each conversation, get the other participant info and last message
    const conversationsWithDetails = await Promise.all(
      userConversations.map(async (conv) => {
        // Get last message
        const lastMessage = await db
          .select()
          .from(messages)
          .where(
            and(
              eq(messages.conversationId, conv.id),
              eq(messages.isDeleted, false)
            )
          )
          .orderBy(desc(messages.createdAt))
          .limit(1);

        // Get other participants
        const participants = await db
          .select({
            id: users.id,
            name: users.name,
            avatar: users.avatar,
            isOnline: users.isOnline,
            lastSeen: users.lastSeen,
          })
          .from(conversationParticipants)
          .innerJoin(users, eq(users.id, conversationParticipants.userId))
          .where(
            and(
              eq(conversationParticipants.conversationId, conv.id),
              eq(conversationParticipants.isActive, true)
            )
          );

        // Get unread count
        const unreadCountResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(messages)
          .where(
            and(
              eq(messages.conversationId, conv.id),
              sql`${messages.createdAt} > ${conv.lastReadAt}`,
              eq(messages.isDeleted, false)
            )
          );

        const unreadCount = Number(unreadCountResult[0]?.count || 0);

        return {
          ...conv,
          lastMessage: lastMessage[0] || null,
          participants: participants.filter((p) => p.id !== userId),
          unreadCount,
        };
      })
    );

    return NextResponse.json({ conversations: conversationsWithDetails });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
  }
}

// POST /api/conversations - Create or get existing conversation
export async function POST(req: NextRequest) {
  try {
    const authResult = await verifyAuth(req);
    if (!authResult.valid || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { participantIds, type = 'direct', name, avatar } = await req.json();
    const userId = authResult.user.id;

    if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
      return NextResponse.json({ error: 'Participant IDs required' }, { status: 400 });
    }

    // For direct messages, check if conversation already exists
    if (type === 'direct' && participantIds.length === 1) {
      const otherUserId = participantIds[0];
      
      // Find existing conversation between these two users
      const existingConv = await db
        .select({ conversationId: conversationParticipants.conversationId })
        .from(conversationParticipants)
        .where(eq(conversationParticipants.userId, userId))
        .innerJoin(
          conversations,
          and(
            eq(conversations.id, conversationParticipants.conversationId),
            eq(conversations.type, 'direct')
          )
        );

      for (const conv of existingConv) {
        const otherParticipants = await db
          .select()
          .from(conversationParticipants)
          .where(
            and(
              eq(conversationParticipants.conversationId, conv.conversationId),
              eq(conversationParticipants.userId, otherUserId),
              eq(conversationParticipants.isActive, true)
            )
          );

        if (otherParticipants.length > 0) {
          return NextResponse.json({ 
            conversationId: conv.conversationId,
            existing: true 
          });
        }
      }
    }

    // Create new conversation
    const newConversation = await db
      .insert(conversations)
      .values({
        type,
        name: type === 'group' ? name : null,
        avatar: type === 'group' ? avatar : null,
        createdBy: userId,
        lastMessageAt: new Date(),
      })
      .returning();

    const conversationId = newConversation[0].id;

    // Add all participants
    const allParticipants = [userId, ...participantIds];
    await db.insert(conversationParticipants).values(
      allParticipants.map((participantId, index) => ({
        conversationId,
        userId: participantId,
        role: participantId === userId ? 'admin' : 'member',
        joinedAt: new Date(),
        lastReadAt: new Date(),
      }))
    );

    return NextResponse.json({ 
      conversationId,
      existing: false 
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
  }
}
