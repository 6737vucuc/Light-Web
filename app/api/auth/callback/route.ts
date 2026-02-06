import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const locale = requestUrl.pathname.split('/')[1] || 'en';

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
            emailVerified: true,
            emailVerifiedAt: new Date(),
            avatar: existingUser.avatar || user.user_metadata.avatar_url,
            updatedAt: new Date(),
          })
          .where(eq(users.id, existingUser.id));
      } else {
        // Create new user if doesn't exist
        const fullName = user.user_metadata.full_name || user.user_metadata.name || 'User';
        const nameParts = fullName.split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ');
        const username = (user.email?.split('@')[0] || 'user') + Math.floor(Math.random() * 1000);

        await db.insert(users).values({
          name: fullName,
          email: user.email as string,
          password: 'OAUTH_USER_' + Math.random().toString(36).slice(-8), // Placeholder password
          firstName: firstName,
          lastName: lastName,
          googleId: user.id,
          authProvider: 'google',
          emailVerified: true,
          emailVerifiedAt: new Date(),
          avatar: user.user_metadata.avatar_url,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }
  }

  // URL to redirect to after sign in process completes
  // We use the locale from the request or default to 'en'
  return NextResponse.redirect(new URL(`/${locale}`, request.url));
}
