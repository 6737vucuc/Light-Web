export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { 
  users, posts, comments, follows, notifications, messages, blockedUsers,
  likes, commentLikes, stories, storyViews, savedPosts, postTags,
  messageReactions, typingIndicators, reports, groupChatMembers, groupChatMessages,
  lessonProgress, friendships, userPrivacySettings, vpnLogs,
  supportRequests, testimonies, encryptionKeys,
  groupChats, lessons, dailyVerses, shares, reactions, groupMessages
} from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth/middleware';
import { eq, desc, or } from 'drizzle-orm';

// Get all users
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  // Check if user is admin
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, authResult.user.id))
    .limit(1);

  if (!user || !user.isAdmin) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 403 }
    );
  }

  try {
    const allUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        avatar: users.avatar,
        isAdmin: users.isAdmin,
        isBanned: users.isBanned,
        bannedUntil: users.bannedUntil,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));

    return NextResponse.json({ users: allUsers });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { error: 'Failed to get users' },
      { status: 500 }
    );
  }
}

// Ban/Unban user
export async function PUT(request: NextRequest) {
  const authResult = await requireAuth(request);
  
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  // Check if user is admin
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, authResult.user.id))
    .limit(1);

  if (!user || !user.isAdmin) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { userId, action, bannedUntil } = body;

    if (!userId || !action) {
      return NextResponse.json(
        { error: 'User ID and action are required' },
        { status: 400 }
      );
    }

    if (action === 'ban') {
      if (!bannedUntil) {
        return NextResponse.json(
          { error: 'Ban duration is required' },
          { status: 400 }
        );
      }

      await db
        .update(users)
        .set({
          isBanned: true,
          bannedUntil: new Date(bannedUntil),
        })
        .where(eq(users.id, userId));

      return NextResponse.json({
        message: 'User banned successfully',
      });
    } else if (action === 'unban') {
      await db
        .update(users)
        .set({
          isBanned: false,
          bannedUntil: null,
        })
        .where(eq(users.id, userId));

      return NextResponse.json({
        message: 'User unbanned successfully',
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

// Delete user
export async function DELETE(request: NextRequest) {
  const authResult = await requireAuth(request);
  
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  // Check if user is admin
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, authResult.user.id))
    .limit(1);

  if (!user || !user.isAdmin) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('id');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Prevent admin from deleting themselves
    if (parseInt(userId) === authResult.user.id) {
      return NextResponse.json(
        { error: 'Cannot delete yourself' },
        { status: 400 }
      );
    }

    const userIdNum = parseInt(userId);

    // Delete all related data in correct order (deepest dependencies first)
    try {
      // Level 4: Delete deepest dependencies first
      // Delete message reactions (depends on messages)
      await db.delete(messageReactions).where(eq(messageReactions.userId, userIdNum));
      
      // Delete typing indicators (depends on conversations)
      await db.delete(typingIndicators).where(eq(typingIndicators.userId, userIdNum));
      
      // Delete story views (depends on stories)
      await db.delete(storyViews).where(eq(storyViews.viewerId, userIdNum));
      
      // Delete comment likes (depends on comments)
      await db.delete(commentLikes).where(eq(commentLikes.userId, userIdNum));
      
      // Delete reactions (depends on posts/comments)
      await db.delete(reactions).where(eq(reactions.userId, userIdNum));
      
      // Delete likes (depends on posts)
      await db.delete(likes).where(eq(likes.userId, userIdNum));
      
      // Delete post tags (depends on posts)
      await db.delete(postTags).where(eq(postTags.userId, userIdNum));
      
      // Delete saved posts (depends on posts)
      await db.delete(savedPosts).where(eq(savedPosts.userId, userIdNum));
      
      // Delete shares (depends on posts)
      await db.delete(shares).where(eq(shares.userId, userIdNum));
      
      // Level 3: Delete middle-level dependencies
      // Delete comments (depends on posts)
      await db.delete(comments).where(eq(comments.userId, userIdNum));
      
      // Delete messages (depends on conversations)
      await db.delete(messages).where(
        or(
          eq(messages.senderId, userIdNum),
          eq(messages.receiverId, userIdNum)
        )
      );
      
      // Delete group chat messages (depends on group chats)
      await db.delete(groupChatMessages).where(eq(groupChatMessages.userId, userIdNum));
      
      // Delete group messages (depends on group chats)
      await db.delete(groupMessages).where(eq(groupMessages.userId, userIdNum));
      
      // Delete group chat members (depends on group chats)
      await db.delete(groupChatMembers).where(eq(groupChatMembers.userId, userIdNum));
      
      // Level 2: Delete main content
      // Delete posts
      await db.delete(posts).where(eq(posts.userId, userIdNum));
      
      // Delete stories
      await db.delete(stories).where(eq(stories.userId, userIdNum));
      
      // Conversations table removed - no longer needed
      
      // Delete group chats created by user
      await db.delete(groupChats).where(eq(groupChats.createdBy, userIdNum));
      
      // Delete lessons created by user
      await db.delete(lessons).where(eq(lessons.createdBy, userIdNum));
      
      // Delete daily verses created by user
      await db.delete(dailyVerses).where(eq(dailyVerses.createdBy, userIdNum));
      
      // Level 1: Delete user-related data
      // Delete notifications
      await db.delete(notifications).where(
        or(
          eq(notifications.userId, userIdNum),
          eq(notifications.fromUserId, userIdNum)
        )
      );
      
      // Delete follows
      await db.delete(follows).where(
        or(
          eq(follows.followerId, userIdNum),
          eq(follows.followingId, userIdNum)
        )
      );
      
      // Delete blocked users
      await db.delete(blockedUsers).where(
        or(
          eq(blockedUsers.userId, userIdNum),
          eq(blockedUsers.blockedUserId, userIdNum)
        )
      );
      
      // Delete friendships
      await db.delete(friendships).where(
        or(
          eq(friendships.userId, userIdNum),
          eq(friendships.friendId, userIdNum)
        )
      );
      
      // Delete reports (made by user or against user)
      await db.delete(reports).where(
        or(
          eq(reports.reporterId, userIdNum),
          eq(reports.reportedUserId, userIdNum)
        )
      );
      
      // Note: 'calls' table doesn't exist in current schema, skipping
      
      // Delete lesson progress
      await db.delete(lessonProgress).where(eq(lessonProgress.userId, userIdNum));
      
      // Delete user-specific data
      await db.delete(userPrivacySettings).where(eq(userPrivacySettings.userId, userIdNum));
      await db.delete(encryptionKeys).where(eq(encryptionKeys.userId, userIdNum));
      await db.delete(vpnLogs).where(eq(vpnLogs.userId, userIdNum));
      await db.delete(supportRequests).where(eq(supportRequests.userId, userIdNum));
      await db.delete(testimonies).where(eq(testimonies.userId, userIdNum));
      
      // Finally delete the user
      await db.delete(users).where(eq(users.id, userIdNum));

      return NextResponse.json({
        success: true,
        message: 'User and all related data deleted successfully',
      });
    } catch (deleteError: any) {
      console.error('Error during cascading delete:', deleteError);
      console.error('Error message:', deleteError?.message);
      console.error('Error detail:', deleteError?.detail);
      return NextResponse.json({
        error: 'Failed to delete user',
        details: deleteError?.message || 'Unknown error',
        hint: deleteError?.detail || 'Check server logs'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}

