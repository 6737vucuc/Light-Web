import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';

const sql = neon(process.env.DATABASE_URL!);
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Get user's story highlights
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get all highlights with their stories
    const highlights = await sql`
      SELECT 
        h.id,
        h.title,
        h.cover_story_id,
        h.created_at,
        COUNT(hs.story_id) as stories_count,
        s.media_url as cover_image
      FROM story_highlights h
      LEFT JOIN highlight_stories hs ON h.id = hs.highlight_id
      LEFT JOIN stories s ON h.cover_story_id = s.id
      WHERE h.user_id = ${parseInt(userId)}
      GROUP BY h.id, h.title, h.cover_story_id, h.created_at, s.media_url
      ORDER BY h.created_at DESC
    `;

    return NextResponse.json({
      success: true,
      highlights: highlights.map((h) => ({
        id: h.id,
        title: h.title,
        coverStoryId: h.cover_story_id,
        coverImage: h.cover_image,
        storiesCount: h.stories_count,
        createdAt: h.created_at,
      })),
    });
  } catch (error) {
    console.error('Error fetching highlights:', error);
    return NextResponse.json(
      { error: 'Failed to fetch highlights' },
      { status: 500 }
    );
  }
}

// Create a new highlight
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    const { title, storyIds, coverStoryId } = await request.json();

    if (!title || !storyIds || storyIds.length === 0) {
      return NextResponse.json(
        { error: 'Title and story IDs are required' },
        { status: 400 }
      );
    }

    // Create highlight
    const highlightResult = await sql`
      INSERT INTO story_highlights (user_id, title, cover_story_id)
      VALUES (${decoded.userId}, ${title}, ${coverStoryId || storyIds[0]})
      RETURNING id, title, cover_story_id, created_at
    `;

    const highlight = highlightResult[0];

    // Add stories to highlight
    for (const storyId of storyIds) {
      await sql`
        INSERT INTO highlight_stories (highlight_id, story_id)
        VALUES (${highlight.id}, ${storyId})
      `;
    }

    return NextResponse.json({
      success: true,
      highlight: {
        id: highlight.id,
        title: highlight.title,
        coverStoryId: highlight.cover_story_id,
        createdAt: highlight.created_at,
      },
    });
  } catch (error) {
    console.error('Error creating highlight:', error);
    return NextResponse.json(
      { error: 'Failed to create highlight' },
      { status: 500 }
    );
  }
}

// Delete a highlight
export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    const { searchParams } = new URL(request.url);
    const highlightId = searchParams.get('highlightId');

    if (!highlightId) {
      return NextResponse.json(
        { error: 'Highlight ID is required' },
        { status: 400 }
      );
    }

    // Check if user owns the highlight
    const highlightResult = await sql`
      SELECT user_id FROM story_highlights WHERE id = ${parseInt(highlightId)}
    `;

    if (highlightResult.length === 0) {
      return NextResponse.json({ error: 'Highlight not found' }, { status: 404 });
    }

    if (highlightResult[0].user_id !== decoded.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Delete highlight (cascade will delete highlight_stories)
    await sql`
      DELETE FROM story_highlights WHERE id = ${parseInt(highlightId)}
    `;

    return NextResponse.json({
      success: true,
      message: 'Highlight deleted',
    });
  } catch (error) {
    console.error('Error deleting highlight:', error);
    return NextResponse.json(
      { error: 'Failed to delete highlight' },
      { status: 500 }
    );
  }
}
