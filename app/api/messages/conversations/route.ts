import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { directMessages, users } from '@/lib/db/schema';
import { verifyAuth } from '@/lib/auth/verify';
import { eq, or, and, desc, sql } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.userId;

    // Get all unique conversations
    const conversations = await db
      .select({
        otherUserId: sql<number>`CASE 
          WHEN ${directMessages.senderId} = ${userId} THEN ${directMessages.receiverId}
          ELSE ${directMessages.senderId}
        END`,
        name: users.name,
        avatar: users.avatar,
        lastSeen: users.lastSeen,
      })
      .from(directMessages)
      .innerJoin(
        users,
        sql`${users.id} = CASE 
          WHEN ${directMessages.senderId} = ${userId} THEN ${directMessages.receiverId}
          ELSE ${directMessages.senderId}
        END`
      )
      .where(
        or(
          eq(directMessages.senderId, userId),
          eq(directMessages.receiverId, userId)
        )
      )
      .groupBy(
        sql`CASE 
          WHEN ${directMessages.senderId} = ${userId} THEN ${directMessages.receiverId}
          ELSE ${directMessages.senderId}
        END`,
        users.name,
        users.avatar,
        users.lastSeen
      )
      .orderBy(desc(directMessages.createdAt));

    // Get last message and unread count for each conversation
    const conversationsWithDetails = await Promise.all(
      conversations.map(async (conv) => {
        const [lastMessage] = await db
          .select()
          .from(directMessages)
          .where(
            or(
              and(
                eq(directMessages.senderId, userId),
                eq(directMessages.receiverId, conv.otherUserId)
              ),
              and(
                eq(directMessages.senderId, conv.otherUserId),
                eq(directMessages.receiverId, userId)
              )
            )
          )
          .orderBy(desc(directMessages.createdAt))
          .limit(1);

        const unreadCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(directMessages)
          .where(
            and(
              eq(directMessages.senderId, conv.otherUserId),
              eq(directMessages.receiverId, userId),
              eq(directMessages.isRead, false)
            )
          );

        return {
          id: conv.otherUserId,
          other_user_id: conv.otherUserId,
          other_user_name: conv.name,
          other_user_avatar: conv.avatar,
          last_message: lastMessage?.content || '',
          last_message_at: lastMessage?.createdAt,
          unread_count: Number(unreadCount[0]?.count || 0),
          created_at: lastMessage?.createdAt || new Date().toISOString(),
        };
      })
    );

    return NextResponse.json({ conversations: conversationsWithDetails });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}
