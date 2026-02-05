import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "./db";
import { users } from "./db/schema";
import { eq } from "drizzle-orm";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db),
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          // Custom mapping for our schema
          googleId: profile.sub,
          authProvider: 'google',
          emailVerified: true,
        };
      },
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        // Check if user exists by email
        const existingUser = await db.query.users.findFirst({
          where: eq(users.email, user.email as string),
        });

        if (existingUser) {
          // Update existing user with googleId if not set
          if (!existingUser.googleId) {
            await db.update(users)
              .set({ 
                googleId: user.id,
                authProvider: 'google',
                emailVerified: true,
                avatar: existingUser.avatar || user.image
              })
              .where(eq(users.id, existingUser.id));
          }
          return true;
        }
      }
      return true;
    },
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
  session: {
    strategy: "jwt",
  },
});
