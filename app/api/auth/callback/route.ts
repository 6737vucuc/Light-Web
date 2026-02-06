import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createToken } from '@/lib/auth/jwt';

// استخدام القيم الثابتة من lib/supabase/client.ts
const supabaseUrl = 'https://lzqyucohnjtubivlmdkw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6cXl1Y29obmp0dWJpdmxtZGt3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1NTQ5MTYsImV4cCI6MjA4NTEzMDkxNn0.IvCkw4rkAcDBRK4T-Ejst4TYS4WquCi-YV0gYv4YudY';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  
  // Get locale from URL or default to 'en'
  const pathParts = requestUrl.pathname.split('/');
  const locale = pathParts[1] && ['en', 'ar', 'es', 'fr', 'de'].includes(pathParts[1]) ? pathParts[1] : 'en';

  console.log('Auth Callback triggered with code:', !!code);

  const response = NextResponse.redirect(new URL(`/${locale}`, request.url));

  if (code) {
    const cookieStore = cookies();
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: '', ...options });
          },
        },
      }
    );

    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('Supabase auth error:', error.message);
    }

    if (!error && user) {
      console.log('Supabase user authenticated:', user.email);
      
      // Sync user data with our custom users table
      let dbUser = await db.query.users.findFirst({
        where: eq(users.email, user.email as string),
      });

      const fullName = user.user_metadata.full_name || user.user_metadata.name || user.email?.split('@')[0] || 'User';
      const avatarUrl = user.user_metadata.avatar_url || user.user_metadata.picture;

      if (dbUser) {
        console.log('Updating existing user in DB:', dbUser.id);
        // Update existing user
        await db.update(users)
          .set({
            googleId: user.id,
            authProvider: 'google',
            emailVerified: true,
            emailVerifiedAt: new Date(),
            avatar: dbUser.avatar || avatarUrl,
            updatedAt: new Date(),
            lastSeen: new Date(),
            isOnline: true,
            oauthData: user.user_metadata,
          })
          .where(eq(users.id, dbUser.id));
      } else {
        console.log('Creating new user in DB for email:', user.email);
        // Create new user if doesn't exist
        const nameParts = fullName.split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ');

        await db.insert(users).values({
          name: fullName,
          email: user.email as string,
          password: 'OAUTH_USER_' + Math.random().toString(36).slice(-8), // Placeholder
          firstName: firstName,
          lastName: lastName,
          googleId: user.id,
          authProvider: 'google',
          emailVerified: true,
          emailVerifiedAt: new Date(),
          avatar: avatarUrl,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSeen: new Date(),
          isOnline: true,
          oauthData: user.user_metadata,
        });
        
        // Fetch the newly created user
        dbUser = await db.query.users.findFirst({
          where: eq(users.email, user.email as string),
        });
      }

      // IMPORTANT: Create a local JWT token to maintain session in the current system
      if (dbUser) {
        console.log('Creating local JWT token for user:', dbUser.id);
        const token = await createToken({
          userId: dbUser.id,
          email: dbUser.email,
          isAdmin: dbUser.isAdmin,
        });

        // Set the token in the response cookies directly to ensure it's sent to the browser
        response.cookies.set('token', token, {
          httpOnly: true,
          secure: true,
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 30, // 30 days
          path: '/',
        });
        
        console.log('Token cookie set in response successfully');
      }
    }
  }

  return response;
}
