export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { messages, users } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth/middleware';
import { eq, or, and, sql, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    // Get all unique conversations
    const conversationsData = await db.execute(sql`
      WITH ranked_messages AS (
        SELECT 
          m.*,
          u.id as other_user_id,
          u.name as other_user_name,
          u.avatar as other_user_avatar,
          u.last_seen as other_user_last_seen,
          ROW_NUMBER() OVER (
            PARTITION BY 
              CASE 
                WHEN m.sender_id = ${authResult.user.id} THEN m.receiver_id 
                ELSE m.sender_id 
              END
            ORDER BY m.created_at DESC
          ) as rn
        FROM messages m
        JOIN users u ON (
          CASE 
            WHEN m.sender_id = ${authResult.user.id} THEN u.id = m.receiver_id
            ELSE u.id = m.sender_id
          END
        )
        WHERE (m.sender_id = ${authResult.user.id} OR m.receiver_id = ${authResult.user.id})
          AND m.is_deleted = false
      )
      SELECT 
        other_user_id as "userId",
        other_user_name as "userName",
        other_user_avatar as "userAvatar",
        content as "lastMessage",
        created_at as "lastMessageTime",
        other_user_last_seen as "lastSeen",
        (
          SELECT COUNT(*)
          FROM messages
          WHERE receiver_id = ${authResult.user.id}
            AND sender_id = other_user_id
            AND is_read = false
            AND is_deleted = false
        ) as "unreadCount"
      FROM ranked_messages
      WHERE rn = 1
      ORDER BY created_at DESC
    `);

    const conversations = conversationsData.rows.map((row: any) => {
      const lastSeen = row.lastSeen ? new Date(row.lastSeen) : null;
      const isOnline = lastSeen ? (new Date().getTime() - lastSeen.getTime()) < 5 * 60 * 1000 : false;

      return {
        userId: row.userId,
        userName: row.userName,
        userAvatar: row.userAvatar,
        lastMessage: row.lastMessage,
        lastMessageTime: row.lastMessageTime,
        unreadCount: parseInt(row.unreadCount) || 0,
        isOnline,
      };
    });

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}
