import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, posts } from '@/lib/db/schema';
import { sql, or, ilike } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const type = searchParams.get('type') || 'all'; // all, users, posts

    if (!query || query.trim().length === 0) {
      return NextResponse.json({
        users: [],
        posts: [],
      });
    }

    const searchQuery = `%${query.trim()}%`;
    let searchResults: any = {
      users: [],
      posts: [],
    };

    // Search users
    if (type === 'all' || type === 'users') {
      const userResults = await db
        .select({
          id: users.id,
          name: users.name,
          username: users.username,
          avatar: users.avatar,
          bio: users.bio,
        })
        .from(users)
        .where(
          or(
            ilike(users.name, searchQuery),
            ilike(users.username, searchQuery),
            ilike(users.bio, searchQuery)
          )
        )
        .limit(10);

      searchResults.users = userResults;
    }

    // Search posts
    if (type === 'all' || type === 'posts') {
      const postResults = await db
        .select({
          id: posts.id,
          content: posts.content,
          imageUrl: posts.imageUrl,
          userId: posts.userId,
          userName: users.name,
          userAvatar: users.avatar,
          createdAt: posts.createdAt,
          likesCount: posts.likesCount,
          commentsCount: posts.commentsCount,
        })
        .from(posts)
        .leftJoin(users, sql`${posts.userId} = ${users.id}`)
        .where(ilike(posts.content, searchQuery))
        .orderBy(sql`${posts.createdAt} DESC`)
        .limit(20);

      searchResults.posts = postResults;
    }

    return NextResponse.json(searchResults);
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Failed to search' },
      { status: 500 }
    );
  }
}
