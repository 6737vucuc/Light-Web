export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { stories, storyViews, users, follows, closeFriends, storyReactions } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth/middleware';
import { eq, and, or, desc, sql as drizzleSql, inArray } from 'drizzle-orm';

// GET /api/stories - Get active stories (Instagram-style)
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  const { user } = authResult;

  try {
    // Get users that current user follows
    const following = await db
      .select({ followingId: follows.followingId })
      .from(follows)
      .where(eq(follows.followerId, user.id));

    const followingIds = following.map(f => f.followingId);
    
    // Get close friends list
    const closeFriendsList = await db
      .select({ friendId: closeFriends.friendId })
      .from(closeFriends)
      .where(eq(closeFriends.userId, user.id));
    
    const closeFriendsIds = closeFriendsList.map(cf => cf.friendId);

    // Get all active stories from followed users and own stories
    const activeStories = await db
      .select({
        id: stories.id,
        userId: stories.userId,
        mediaUrl: stories.mediaUrl,
        mediaType: stories.mediaType,
        caption: stories.caption,
        viewsCount: stories.viewsCount,
        expiresAt: stories.expiresAt,
        isCloseFriends: stories.isCloseFriends,
        backgroundColor: stories.backgroundColor,
        textContent: stories.textContent,
        fontStyle: stories.fontStyle,
        musicUrl: stories.musicUrl,
        musicTitle: stories.musicTitle,
        location: stories.location,
        mentions: stories.mentions,
        hashtags: stories.hashtags,
        stickers: stories.stickers,
        pollData: stories.pollData,
        questionData: stories.questionData,
        linkUrl: stories.linkUrl,
        linkTitle: stories.linkTitle,
        createdAt: stories.createdAt,
        userName: users.name,
        userAvatar: users.avatar,
        username: users.username,
      })
      .from(stories)
      .innerJoin(users, eq(stories.userId, users.id))
      .where(
        and(
          drizzleSql`${stories.expiresAt} > NOW()`,
          or(
            eq(stories.userId, user.id), // Own stories
            and(
              inArray(stories.userId, [...followingIds, user.id]),
              or(
                eq(stories.isCloseFriends, false), // Public stories from followed users
                and(
                  eq(stories.isCloseFriends, true),
                  inArray(stories.userId, closeFriendsIds) // Close friends stories
                )
              )
            )
          )
        )
      )
      .orderBy(desc(stories.createdAt));

    // Get viewed stories by current user
    const viewedStories = await db
      .select({ storyId: storyViews.storyId })
      .from(storyViews)
      .where(eq(storyViews.viewerId, user.id));

    const viewedStoryIds = new Set(viewedStories.map(v => v.storyId));

    // Group stories by user
    const storyGroups: any[] = [];
    const userMap = new Map();

    activeStories.forEach((story: any) => {
      if (!userMap.has(story.userId)) {
        userMap.set(story.userId, {
          userId: story.userId,
          userName: story.userName,
          username: story.username,
          userAvatar: story.userAvatar,
          stories: [],
          hasUnviewed: false,
          isOwnStory: story.userId === user.id
        });
        storyGroups.push(userMap.get(story.userId));
      }

      const group = userMap.get(story.userId);
      const hasViewed = viewedStoryIds.has(story.id);
      
      group.stories.push({
        id: story.id,
        userId: story.userId,
        mediaUrl: story.mediaUrl,
        mediaType: story.mediaType,
        caption: story.caption,
        viewsCount: story.viewsCount,
        expiresAt: story.expiresAt,
        isCloseFriends: story.isCloseFriends,
        backgroundColor: story.backgroundColor,
        textContent: story.textContent,
        fontStyle: story.fontStyle,
        musicUrl: story.musicUrl,
        musicTitle: story.musicTitle,
        location: story.location,
        mentions: story.mentions ? JSON.parse(story.mentions) : [],
        hashtags: story.hashtags ? JSON.parse(story.hashtags) : [],
        stickers: story.stickers ? JSON.parse(story.stickers) : [],
        pollData: story.pollData ? JSON.parse(story.pollData) : null,
        questionData: story.questionData ? JSON.parse(story.questionData) : null,
        linkUrl: story.linkUrl,
        linkTitle: story.linkTitle,
        createdAt: story.createdAt,
        hasViewed
      });

      if (!hasViewed) {
        group.hasUnviewed = true;
      }
    });

    // Sort: Own story first, then unviewed, then viewed
    storyGroups.sort((a, b) => {
      if (a.isOwnStory) return -1;
      if (b.isOwnStory) return 1;
      if (a.hasUnviewed && !b.hasUnviewed) return -1;
      if (!a.hasUnviewed && b.hasUnviewed) return 1;
      return 0;
    });

    return NextResponse.json({
      success: true,
      storyGroups
    });
  } catch (error) {
    console.error('Error fetching stories:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stories' },
      { status: 500 }
    );
  }
}

// POST /api/stories - Create a story (Instagram-style)
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
    const body = await request.json();
    const {
      mediaUrl,
      mediaType,
      caption,
      isCloseFriends,
      backgroundColor,
      textContent,
      fontStyle,
      musicUrl,
      musicTitle,
      location,
      mentions,
      hashtags,
      stickers,
      pollData,
      questionData,
      linkUrl,
      linkTitle
    } = body;

    // Validate media type
    const validMediaTypes = ['image', 'video', 'text'];
    if (!mediaType || !validMediaTypes.includes(mediaType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid media type' },
        { status: 400 }
      );
    }

    // For image/video stories, mediaUrl is required
    if ((mediaType === 'image' || mediaType === 'video') && !mediaUrl) {
      return NextResponse.json(
        { success: false, error: 'Media URL is required for image/video stories' },
        { status: 400 }
      );
    }

    // For text stories, textContent is required
    if (mediaType === 'text' && !textContent) {
      return NextResponse.json(
        { success: false, error: 'Text content is required for text stories' },
        { status: 400 }
      );
    }

    // Stories expire after 24 hours
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const [story] = await db
      .insert(stories)
      .values({
        userId: user.id,
        mediaUrl: mediaUrl || null,
        mediaType,
        caption: caption || null,
        isCloseFriends: isCloseFriends || false,
        backgroundColor: backgroundColor || null,
        textContent: textContent || null,
        fontStyle: fontStyle || null,
        musicUrl: musicUrl || null,
        musicTitle: musicTitle || null,
        location: location || null,
        mentions: mentions ? JSON.stringify(mentions) : null,
        hashtags: hashtags ? JSON.stringify(hashtags) : null,
        stickers: stickers ? JSON.stringify(stickers) : null,
        pollData: pollData ? JSON.stringify(pollData) : null,
        questionData: questionData ? JSON.stringify(questionData) : null,
        linkUrl: linkUrl || null,
        linkTitle: linkTitle || null,
        expiresAt
      })
      .returning();

    return NextResponse.json({
      success: true,
      story: {
        id: story.id,
        mediaUrl: story.mediaUrl,
        mediaType: story.mediaType,
        caption: story.caption,
        isCloseFriends: story.isCloseFriends,
        backgroundColor: story.backgroundColor,
        textContent: story.textContent,
        fontStyle: story.fontStyle,
        musicUrl: story.musicUrl,
        musicTitle: story.musicTitle,
        location: story.location,
        mentions: story.mentions ? JSON.parse(story.mentions) : [],
        hashtags: story.hashtags ? JSON.parse(story.hashtags) : [],
        stickers: story.stickers ? JSON.parse(story.stickers) : [],
        pollData: story.pollData ? JSON.parse(story.pollData) : null,
        questionData: story.questionData ? JSON.parse(story.questionData) : null,
        linkUrl: story.linkUrl,
        linkTitle: story.linkTitle,
        createdAt: story.createdAt,
        expiresAt: story.expiresAt,
        userId: user.id,
        userName: user.name,
        userAvatar: user.avatar
      }
    });
  } catch (error) {
    console.error('Error creating story:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create story' },
      { status: 500 }
    );
  }
}

// DELETE /api/stories - Delete a story
export async function DELETE(request: NextRequest) {
  const authResult = await requireAuth(request);
  
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  const { user } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const storyId = searchParams.get('storyId');

    if (!storyId) {
      return NextResponse.json(
        { success: false, error: 'Story ID is required' },
        { status: 400 }
      );
    }

    // Check if user owns the story or is admin
    const [story] = await db
      .select()
      .from(stories)
      .where(eq(stories.id, parseInt(storyId)))
      .limit(1);

    if (!story) {
      return NextResponse.json(
        { success: false, error: 'Story not found' },
        { status: 404 }
      );
    }

    if (story.userId !== user.id && !user.isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Delete story
    await db
      .delete(stories)
      .where(eq(stories.id, parseInt(storyId)));

    return NextResponse.json({
      success: true,
      message: 'Story deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting story:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete story' },
      { status: 500 }
    );
  }
}
