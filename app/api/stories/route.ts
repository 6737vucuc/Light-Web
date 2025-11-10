export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';

// GET /api/stories - Get active stories
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    // Get stories that haven't expired yet
    const result = await sql`
      SELECT 
        s.id,
        s.media_url,
        s.media_type,
        s.caption,
        s.created_at,
        s.expires_at,
        u.id as user_id,
        u.name as user_name,
        u.avatar as user_avatar,
        COALESCE(
          (SELECT COUNT(*) FROM story_views sv WHERE sv.story_id = s.id),
          0
        ) as views_count,
        EXISTS(
          SELECT 1 FROM story_views sv 
          WHERE sv.story_id = s.id AND sv.viewer_id = ${user.id}
        ) as has_viewed
      FROM stories s
      JOIN users u ON s.user_id = u.id
      WHERE s.expires_at > NOW()
      ORDER BY s.created_at DESC
    `;

    // Group stories by user
    const storyGroups: any[] = [];
    const userMap = new Map();

    result.forEach((row: any) => {
      if (!userMap.has(row.user_id)) {
        userMap.set(row.user_id, {
          userId: row.user_id,
          userName: row.user_name,
          userAvatar: row.user_avatar,
          stories: [],
          hasViewed: true
        });
        storyGroups.push(userMap.get(row.user_id));
      }

      const group = userMap.get(row.user_id);
      group.stories.push({
        id: row.id,
        userId: row.user_id,
        userName: row.user_name,
        userAvatar: row.user_avatar,
        mediaUrl: row.media_url,
        mediaType: row.media_type,
        caption: row.caption,
        viewsCount: parseInt(row.views_count),
        createdAt: row.created_at,
        expiresAt: row.expires_at,
        hasViewed: row.has_viewed
      });

      // If any story in the group is not viewed, mark group as not viewed
      if (!row.has_viewed) {
        group.hasViewed = false;
      }
    });

    return NextResponse.json({
      success: true,
      storyGroups,
      stories: result.map((row: any) => ({
        id: row.id,
        mediaUrl: row.media_url,
        mediaType: row.media_type,
        caption: row.caption,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
        userId: row.user_id,
        userName: row.user_name,
        userAvatar: row.user_avatar,
        viewsCount: parseInt(row.views_count),
        hasViewed: row.has_viewed
      }))
    });
  } catch (error) {
    console.error('Error fetching stories:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch stories' },
      { status: 500 }
    );
  }
}

// POST /api/stories - Create a story
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
    const { mediaUrl, mediaType } = await request.json();

    if (!mediaUrl || !mediaType) {
      return NextResponse.json(
        { success: false, error: 'Media URL and type are required' },
        { status: 400 }
      );
    }

    const validMediaTypes = ['image', 'video'];
    if (!validMediaTypes.includes(mediaType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid media type' },
        { status: 400 }
      );
    }

    // Stories expire after 24 hours
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const result = await sql`
      INSERT INTO stories (user_id, media_url, media_type, expires_at)
      VALUES (${user.id}, ${mediaUrl}, ${mediaType}, ${expiresAt.toISOString()})
      RETURNING id, media_url, media_type, created_at, expires_at
    `;

    const story = result[0];

    return NextResponse.json({
      success: true,
      story: {
        id: story.id,
        mediaUrl: story.media_url,
        mediaType: story.media_type,
        createdAt: story.created_at,
        expiresAt: story.expires_at,
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
    const storyCheck = await sql`
      SELECT user_id FROM stories WHERE id = ${parseInt(storyId)}
    `;

    if (storyCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Story not found' },
        { status: 404 }
      );
    }

    const story = storyCheck[0];

    if (story.user_id !== user.id && !user.isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Delete story
    await sql`DELETE FROM stories WHERE id = ${parseInt(storyId)}`;

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
