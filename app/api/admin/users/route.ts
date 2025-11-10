export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { 
  users, posts, comments, follows, notifications, messages, blockedUsers,
  likes, commentLikes, stories, storyViews, savedPosts, postTags,
  messageReactions, typingIndicators, reports, groupChatMembers, groupChatMessages,
  lessonProgress, friendships, userPrivacySettings, calls, vpnLogs,
  conversations, supportRequests, testimonies, encryptionKeys
} from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth/middleware';
import { eq, desc } from 'drizzle-orm';

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

    // Delete all related data in correct order to avoid foreign key constraints
    try {
      // Delete encryption keys
      await db.delete(encryptionKeys).where(eq(encryptionKeys.userId, userIdNum));
      
      // Delete testimonies
      await db.delete(testimonies).where(eq(testimonies.userId, userIdNum));
      
      // Delete support requests
      await db.delete(supportRequests).where(eq(supportRequests.userId, userIdNum));
      
      // Delete VPN logs
      await db.delete(vpnLogs).where(eq(vpnLogs.userId, userIdNum));
      
      // Delete calls
      await db.delete(calls).where(eq(calls.callerId, userIdNum));
      await db.delete(calls).where(eq(calls.receiverId, userIdNum));
      
      // Delete user privacy settings
      await db.delete(userPrivacySettings).where(eq(userPrivacySettings.userId, userIdNum));
      
      // Delete friendships
      await db.delete(friendships).where(eq(friendships.userId, userIdNum));
      await db.delete(friendships).where(eq(friendships.friendId, userIdNum));
      
      // Delete lesson progress
      await db.delete(lessonProgress).where(eq(lessonProgress.userId, userIdNum));
      
      // Delete group chat messages
      await db.delete(groupChatMessages).where(eq(groupChatMessages.userId, userIdNum));
      
      // Delete group chat members
      await db.delete(groupChatMembers).where(eq(groupChatMembers.userId, userIdNum));
      
      // Delete reports (made by user and against user)
      await db.delete(reports).where(eq(reports.reporterId, userIdNum));
      await db.delete(reports).where(eq(reports.reportedUserId, userIdNum));
      
      // Delete typing indicators
      await db.delete(typingIndicators).where(eq(typingIndicators.userId, userIdNum));
      
      // Delete message reactions
      await db.delete(messageReactions).where(eq(messageReactions.userId, userIdNum));
      
      // Delete story views
      await db.delete(storyViews).where(eq(storyViews.userId, userIdNum));
      
      // Delete stories
      await db.delete(stories).where(eq(stories.userId, userIdNum));
      
      // Delete post tags
      await db.delete(postTags).where(eq(postTags.userId, userIdNum));
      
      // Delete saved posts
      await db.delete(savedPosts).where(eq(savedPosts.userId, userIdNum));
      
      // Delete comment likes
      await db.delete(commentLikes).where(eq(commentLikes.userId, userIdNum));
      
      // Delete likes
      await db.delete(likes).where(eq(likes.userId, userIdNum));
      
      // Delete blocked users records
      await db.delete(blockedUsers).where(eq(blockedUsers.userId, userIdNum));
      await db.delete(blockedUsers).where(eq(blockedUsers.blockedUserId, userIdNum));
      
      // Delete conversations
      await db.delete(conversations).where(eq(conversations.participant1Id, userIdNum));
      await db.delete(conversations).where(eq(conversations.participant2Id, userIdNum));
      
      // Delete messages
      await db.delete(messages).where(eq(messages.senderId, userIdNum));
      await db.delete(messages).where(eq(messages.receiverId, userIdNum));
      
      // Delete notifications
      await db.delete(notifications).where(eq(notifications.userId, userIdNum));
      await db.delete(notifications).where(eq(notifications.fromUserId, userIdNum));
      
      // Delete follows
      await db.delete(follows).where(eq(follows.followerId, userIdNum));
      await db.delete(follows).where(eq(follows.followingId, userIdNum));
      
      // Delete comments
      await db.delete(comments).where(eq(comments.userId, userIdNum));
      
      // Delete posts
      await db.delete(posts).where(eq(posts.userId, userIdNum));
      
      // Finally delete the user
      await db.delete(users).where(eq(users.id, userIdNum));

      return NextResponse.json({
        success: true,
        message: 'User and all related data deleted successfully',
      });
    } catch (deleteError) {
      console.error('Error during cascading delete:', deleteError);
      throw deleteError;
    }
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}

