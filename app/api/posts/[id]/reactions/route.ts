export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';

// POST /api/posts/[id]/reactions - Add or update reaction
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authResult = await requireAuth(request);
  
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  const { user } = authResult;

  try {
    const postId = parseInt(id);
    const { reactionType } = await request.json();

    const validReactions = ['love', 'like', 'haha', 'wow', 'sad', 'pray'];
    if (!validReactions.includes(reactionType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid reaction type' },
        { status: 400 }
      );
    }

    // Check if user already reacted
    const existingReaction = await sql`
      SELECT id, reaction_type FROM reactions 
      WHERE user_id = ${user.id} AND post_id = ${postId}
    `;

    if (existingReaction.length > 0) {
      // Update existing reaction
      await sql`
        UPDATE reactions 
        SET reaction_type = ${reactionType}
        WHERE user_id = ${user.id} AND post_id = ${postId}
      `;
    } else {
      // Insert new reaction
      await sql`
        INSERT INTO reactions (user_id, post_id, reaction_type)
        VALUES (${user.id}, ${postId}, ${reactionType})
      `;

      // Update likes count (for backward compatibility)
      await sql`
        UPDATE posts 
        SET likes_count = likes_count + 1 
        WHERE id = ${postId}
      `;
    }

    return NextResponse.json({
      success: true,
      message: 'Reaction added successfully'
    });
  } catch (error) {
    console.error('Error adding reaction:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add reaction' },
      { status: 500 }
    );
  }
}

// DELETE /api/posts/[id]/reactions - Remove reaction
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authResult = await requireAuth(request);
  
  if ('error' in authResult) {
    return NextResponse.json(
      { error: authResult.error },
      { status: authResult.status }
    );
  }

  const { user } = authResult;

  try {
    const postId = parseInt(id);

    // Delete reaction
    const result = await sql`
      DELETE FROM reactions 
      WHERE user_id = ${user.id} AND post_id = ${postId}
      RETURNING id
    `;

    if (result.length > 0) {
      // Update likes count
      await sql`
        UPDATE posts 
        SET likes_count = GREATEST(likes_count - 1, 0) 
        WHERE id = ${postId}
      `;
    }

    return NextResponse.json({
      success: true,
      message: 'Reaction removed successfully'
    });
  } catch (error) {
    console.error('Error removing reaction:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove reaction' },
      { status: 500 }
    );
  }
}

// GET /api/posts/[id]/reactions - Get reactions for a post
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const postId = parseInt(id);

    const result = await sql`
      SELECT 
        reaction_type,
        COUNT(*) as count
      FROM reactions
      WHERE post_id = ${postId}
      GROUP BY reaction_type
    `;

    const reactions: { [key: string]: number } = {};
    result.forEach((row: any) => {
      reactions[row.reaction_type] = parseInt(row.count);
    });

    return NextResponse.json({
      success: true,
      reactions
    });
  } catch (error) {
    console.error('Error fetching reactions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reactions' },
      { status: 500 }
    );
  }
}
