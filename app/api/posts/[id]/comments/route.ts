export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';

// GET /api/posts/[id]/comments - Get comments for a post
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  try {
    const postId = parseInt(id);

    const result = await sql`
      SELECT 
        c.id,
        c.content,
        c.created_at,
        u.id as user_id,
        u.name as user_name,
        u.avatar as user_avatar
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.post_id = ${postId}
      ORDER BY c.created_at ASC
    `;

    return NextResponse.json({
      success: true,
      comments: result.map((row: any) => ({
        id: row.id,
        content: row.content,
        createdAt: row.created_at,
        userId: row.user_id,
        userName: row.user_name,
        userAvatar: row.user_avatar
      }))
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}

// POST /api/posts/[id]/comments - Add a comment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { content } = await request.json();

    if (!content || !content.trim()) {
      return NextResponse.json(
        { success: false, error: 'Comment content is required' },
        { status: 400 }
      );
    }

    // Insert comment
    const result = await sql`
      INSERT INTO comments (user_id, post_id, content)
      VALUES (${user.id}, ${postId}, ${content.trim()})
      RETURNING id, content, created_at
    `;

    // Update comments count
    await sql`
      UPDATE posts 
      SET comments_count = comments_count + 1 
      WHERE id = ${postId}
    `;

    const comment = result[0];

    return NextResponse.json({
      success: true,
      comment: {
        id: comment.id,
        content: comment.content,
        createdAt: comment.created_at,
        userId: user.id,
        userName: user.name,
        userAvatar: user.avatar
      }
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add comment' },
      { status: 500 }
    );
  }
}

// DELETE /api/posts/[id]/comments - Delete a comment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const commentId = searchParams.get('commentId');

    if (!commentId) {
      return NextResponse.json(
        { success: false, error: 'Comment ID is required' },
        { status: 400 }
      );
    }

    // Check if user owns the comment or is admin
    const commentCheck = await sql`
      SELECT user_id, post_id FROM comments WHERE id = ${parseInt(commentId)}
    `;

    if (commentCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Comment not found' },
        { status: 404 }
      );
    }

    const comment = commentCheck[0];

    if (comment.user_id !== user.id && !user.isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Delete comment
    await sql`DELETE FROM comments WHERE id = ${parseInt(commentId)}`;

    // Update comments count
    await sql`
      UPDATE posts 
      SET comments_count = GREATEST(comments_count - 1, 0) 
      WHERE id = ${comment.post_id}
    `;

    return NextResponse.json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete comment' },
      { status: 500 }
    );
  }
}
