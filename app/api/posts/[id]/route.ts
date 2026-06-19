import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth/verify';
import { sql } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// DELETE /api/posts/[id] - Delete a post
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.userId || user.id;
    const postId = parseInt(params.id);

    if (isNaN(postId)) {
      return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 });
    }

    // Check if post exists and belongs to user (or user is admin)
    const postResult = await db.execute(sql`
      SELECT id, user_id FROM community_posts WHERE id = ${postId}
    `);

    const post = postResult.rows?.[0];
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Check ownership or admin
    const isAdmin = user.isAdmin;
    if (post.user_id !== userId && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete reactions first
    await db.execute(sql`
      DELETE FROM post_reactions WHERE post_id = ${postId}
    `);

    // Delete post
    await db.execute(sql`
      DELETE FROM community_posts WHERE id = ${postId}
    `);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Post DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
