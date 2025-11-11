export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { storyHighlights, storyHighlightItems, stories } from '@/lib/db/schema';
import { requireAuth } from '@/lib/auth/middleware';
import { eq, and } from 'drizzle-orm';

// GET /api/stories/highlights - Get user's story highlights
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || authResult.user.id.toString();

    // Get all highlights for the user
    const highlights = await db
      .select()
      .from(storyHighlights)
      .where(eq(storyHighlights.userId, parseInt(userId)));

    // Get stories for each highlight
    const highlightsWithStories = await Promise.all(
      highlights.map(async (highlight) => {
        const items = await db
          .select({
            id: storyHighlightItems.id,
            storyId: stories.id,
            mediaUrl: stories.mediaUrl,
            mediaType: stories.mediaType,
            caption: stories.caption,
            createdAt: stories.createdAt,
          })
          .from(storyHighlightItems)
          .innerJoin(stories, eq(storyHighlightItems.storyId, stories.id))
          .where(eq(storyHighlightItems.highlightId, highlight.id));

        return {
          ...highlight,
          storiesCount: items.length,
          stories: items,
          coverImage: highlight.coverImage || (items[0]?.mediaUrl || null)
        };
      })
    );

    return NextResponse.json({
      success: true,
      highlights: highlightsWithStories
    });
  } catch (error) {
    console.error('Error fetching highlights:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch highlights' },
      { status: 500 }
    );
  }
}

// POST /api/stories/highlights - Create a new highlight
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
    const { title, coverImage, storyIds } = await request.json();

    if (!title) {
      return NextResponse.json(
        { success: false, error: 'Title is required' },
        { status: 400 }
      );
    }

    // Create highlight
    const [highlight] = await db
      .insert(storyHighlights)
      .values({
        userId: user.id,
        title,
        coverImage: coverImage || null
      })
      .returning();

    // Add stories to highlight if provided
    if (storyIds && Array.isArray(storyIds) && storyIds.length > 0) {
      await db
        .insert(storyHighlightItems)
        .values(
          storyIds.map((storyId: number) => ({
            highlightId: highlight.id,
            storyId
          }))
        );
    }

    return NextResponse.json({
      success: true,
      message: 'Highlight created successfully',
      highlight
    });
  } catch (error) {
    console.error('Error creating highlight:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create highlight' },
      { status: 500 }
    );
  }
}

// PUT /api/stories/highlights - Update a highlight
export async function PUT(request: NextRequest) {
  const authResult = await requireAuth(request);
  
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  const { user } = authResult;

  try {
    const { highlightId, title, coverImage, storyIds } = await request.json();

    if (!highlightId) {
      return NextResponse.json(
        { success: false, error: 'Highlight ID is required' },
        { status: 400 }
      );
    }

    // Check ownership
    const [highlight] = await db
      .select()
      .from(storyHighlights)
      .where(eq(storyHighlights.id, highlightId))
      .limit(1);

    if (!highlight) {
      return NextResponse.json(
        { success: false, error: 'Highlight not found' },
        { status: 404 }
      );
    }

    if (highlight.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Update highlight
    const updateData: any = {};
    if (title) updateData.title = title;
    if (coverImage !== undefined) updateData.coverImage = coverImage;

    if (Object.keys(updateData).length > 0) {
      await db
        .update(storyHighlights)
        .set(updateData)
        .where(eq(storyHighlights.id, highlightId));
    }

    // Update stories if provided
    if (storyIds && Array.isArray(storyIds)) {
      // Remove existing stories
      await db
        .delete(storyHighlightItems)
        .where(eq(storyHighlightItems.highlightId, highlightId));

      // Add new stories
      if (storyIds.length > 0) {
        await db
          .insert(storyHighlightItems)
          .values(
            storyIds.map((storyId: number) => ({
              highlightId,
              storyId
            }))
          );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Highlight updated successfully'
    });
  } catch (error) {
    console.error('Error updating highlight:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update highlight' },
      { status: 500 }
    );
  }
}

// DELETE /api/stories/highlights - Delete a highlight
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
    const highlightId = searchParams.get('highlightId');

    if (!highlightId) {
      return NextResponse.json(
        { success: false, error: 'Highlight ID is required' },
        { status: 400 }
      );
    }

    // Check ownership
    const [highlight] = await db
      .select()
      .from(storyHighlights)
      .where(eq(storyHighlights.id, parseInt(highlightId)))
      .limit(1);

    if (!highlight) {
      return NextResponse.json(
        { success: false, error: 'Highlight not found' },
        { status: 404 }
      );
    }

    if (highlight.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Delete highlight (cascade will delete items)
    await db
      .delete(storyHighlights)
      .where(eq(storyHighlights.id, parseInt(highlightId)));

    return NextResponse.json({
      success: true,
      message: 'Highlight deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting highlight:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete highlight' },
      { status: 500 }
    );
  }
}
