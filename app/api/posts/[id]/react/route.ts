import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth } from '@/lib/auth/verify';
import { sql } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/posts/[id]/react - React to a post (like/dislike)
export async function POST(
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

    const body = await request.json();
    const { reactionType } = body;

    if (!reactionType || !['like', 'dislike'].includes(reactionType)) {
      return NextResponse.json({ error: 'Invalid reaction type' }, { status: 400 });
    }

    // Check if post exists
    const postResult = await db.execute(sql`
      SELECT id, likes_count, dislikes_count FROM community_posts WHERE id = ${postId}
    `);

    const post = postResult.rows?.[0];
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Check existing reaction
    const reactionResult = await db.execute(sql`
      SELECT id, reaction_type FROM post_reactions 
      WHERE post_id = ${postId} AND user_id = ${userId}
    `);

    const existingReaction = reactionResult.rows?.[0];

    let newLikesCount = post.likes_count || 0;
    let newDislikesCount = post.dislikes_count || 0;
    let userReaction: string | null = reactionType;

    if (existingReaction) {
      if (existingReaction.reaction_type === reactionType) {
        // Remove reaction (toggle off)
        await db.execute(sql`
          DELETE FROM post_reactions WHERE id = ${existingReaction.id}
        `);

        if (reactionType === 'like') {
          newLikesCount = Math.max(0, newLikesCount - 1);
        } else {
          newDislikesCount = Math.max(0, newDislikesCount - 1);
        }
        userReaction = null;
      } else {
        // Change reaction
        await db.execute(sql`
          UPDATE post_reactions 
          SET reaction_type = ${reactionType}
          WHERE id = ${existingReaction.id}
        `);

        if (reactionType === 'like') {
          newLikesCount += 1;
          newDislikesCount = Math.max(0, newDislikesCount - 1);
        } else {
          newDislikesCount += 1;
          newLikesCount = Math.max(0, newLikesCount - 1);
        }
      }
    } else {
      // Add new reaction
      await db.execute(sql`
        INSERT INTO post_reactions (post_id, user_id, reaction_type)
        VALUES (${postId}, ${userId}, ${reactionType})
      `);

      if (reactionType === 'like') {
        newLikesCount += 1;
      } else {
        newDislikesCount += 1;
      }
    }

    // Update post counts
    await db.execute(sql`
      UPDATE community_posts 
      SET likes_count = ${newLikesCount}, dislikes_count = ${newDislikesCount}
      WHERE id = ${postId}
    `);

    return NextResponse.json({
      success: true,
      likesCount: newLikesCount,
      dislikesCount: newDislikesCount,
      userReaction,
    });
  } catch (error) {
    console.error('Post react error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
