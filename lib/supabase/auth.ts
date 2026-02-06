import { createBrowserClient, createServerClient as createSSRServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

// استخدام القيم من client.ts
const supabaseUrl = 'https://lzqyucohnjtubivlmdkw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6cXl1Y29obmp0dWJpdmxtZGt3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1NTQ5MTYsImV4cCI6MjA4NTEzMDkxNn0.IvCkw4rkAcDBRK4T-Ejst4TYS4WquCi-YV0gYv4YudY';

export const createClient = () => {
  return createBrowserClient(
    supabaseUrl,
    supabaseAnonKey
  );
};

export const createServerClient = () => {
  const cookieStore = cookies();
  return createSSRServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // Handle edge cases where cookies cannot be set
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // Handle edge cases where cookies cannot be removed
          }
        },
      },
    }
  );
};
