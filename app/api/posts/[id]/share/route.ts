export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';

// POST /api/posts/[id]/share - Share a post
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

    // Check if post exists
    const postCheck = await sql`
      SELECT id FROM posts WHERE id = ${postId}
    `;

    if (postCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Post not found' },
        { status: 404 }
      );
    }

    // Check if user already shared this post
    const existingShare = await sql`
      SELECT id FROM shares 
      WHERE user_id = ${user.id} AND post_id = ${postId}
    `;

    if (existingShare.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Post already shared' },
        { status: 400 }
      );
    }

    // Insert share
    await sql`
      INSERT INTO shares (user_id, post_id)
      VALUES (${user.id}, ${postId})
    `;

    // Update shares count
    await sql`
      UPDATE posts 
      SET shares_count = shares_count + 1 
      WHERE id = ${postId}
    `;

    return NextResponse.json({
      success: true,
      message: 'Post shared successfully'
    });
  } catch (error) {
    console.error('Error sharing post:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to share post' },
      { status: 500 }
    );
  }
}

// DELETE /api/posts/[id]/share - Unshare a post
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
    const postId = parseInt(id);

    // Delete share
    const result = await sql`
      DELETE FROM shares 
      WHERE user_id = ${user.id} AND post_id = ${postId}
      RETURNING id
    `;

    if (result.length > 0) {
      // Update shares count
      await sql`
        UPDATE posts 
        SET shares_count = GREATEST(shares_count - 1, 0) 
        WHERE id = ${postId}
      `;
    }

    return NextResponse.json({
      success: true,
      message: 'Share removed successfully'
    });
  } catch (error) {
    console.error('Error removing share:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove share' },
      { status: 500 }
    );
  }
}
