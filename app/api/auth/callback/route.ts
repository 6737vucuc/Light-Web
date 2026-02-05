import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && user) {
      // Sync user data with our custom users table
      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, user.email as string),
      });

      if (existingUser) {
        // Update existing user
        await db.update(users)
          .set({
            googleId: user.id,
            authProvider: 'google',
            emailVerifiedAt: new Date(),
            avatar: existingUser.avatar || user.user_metadata.avatar_url,
          })
          .where(eq(users.id, existingUser.id));
      } else {
        // Create new user if doesn't exist (optional, depends on your flow)
        // For now, we assume users should register first or we auto-create
        await db.insert(users).values({
          email: user.email as string,
          firstName: user.user_metadata.full_name?.split(' ')[0] || 'User',
          lastName: user.user_metadata.full_name?.split(' ')[1] || '',
          googleId: user.id,
          authProvider: 'google',
          emailVerifiedAt: new Date(),
          avatar: user.user_metadata.avatar_url,
          username: user.email?.split('@')[0] + Math.floor(Math.random() * 1000),
        });
      }
    }
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(new URL('/en', request.url));
}
